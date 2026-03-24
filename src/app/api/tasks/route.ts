import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import getDb from "@/lib/db";
import { createClickUpTask, uploadAttachmentToClickUp } from "@/lib/clickup";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const userId = (session.user as { id?: string }).id;

  const tasks = db
    .prepare(
      `SELECT t.*,
        GROUP_CONCAT(a.filename) as attachment_names
       FROM tasks t
       LEFT JOIN attachments a ON a.task_id = t.id
       WHERE t.user_id = ?
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    )
    .all(userId);

  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const dueDate = formData.get("dueDate") as string;
    const urgency = formData.get("urgency") as string;
    const notes = formData.get("notes") as string;
    const files = formData.getAll("attachments") as File[];

    if (!title) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const userId = (session.user as { id?: string }).id;

    // Create task in ClickUp
    let clickupTaskId: string | null = null;
    try {
      const clickupTask = await createClickUpTask({
        title,
        dueDate: dueDate || undefined,
        urgency: urgency || "medium",
        notes: notes || undefined,
      });
      clickupTaskId = clickupTask.id;
    } catch (error) {
      console.error("ClickUp task creation failed:", error);
      // Continue even if ClickUp fails - store locally
    }

    // Store task in local DB
    const result = db
      .prepare(
        `INSERT INTO tasks (user_id, title, due_date, urgency, notes, clickup_task_id, clickup_status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        userId,
        title,
        dueDate || null,
        urgency || "medium",
        notes || null,
        clickupTaskId,
        "to do"
      );

    const taskId = result.lastInsertRowid;

    // Handle file uploads
    if (files.length > 0) {
      const uploadDir = path.join(process.cwd(), "uploads", String(taskId));
      await mkdir(uploadDir, { recursive: true });

      for (const file of files) {
        if (file.size === 0) continue;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(uploadDir, file.name);
        await writeFile(filePath, buffer);

        db.prepare(
          "INSERT INTO attachments (task_id, filename, filepath, mimetype) VALUES (?, ?, ?, ?)"
        ).run(Number(taskId), file.name, filePath, file.type);

        // Upload to ClickUp if task was created there
        if (clickupTaskId) {
          try {
            await uploadAttachmentToClickUp(clickupTaskId, filePath, file.name);
          } catch (err) {
            console.error("Failed to upload attachment to ClickUp:", err);
          }
        }
      }
    }

    return NextResponse.json(
      {
        message: "Task created successfully",
        taskId: Number(taskId),
        clickupTaskId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Task creation error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
