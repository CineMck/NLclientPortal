import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import getDb from "@/lib/db";
import {
  getClickUpTask,
  updateClickUpTask,
  deleteClickUpTask,
  uploadAttachmentToClickUp,
  URGENCY_TO_PRIORITY,
} from "@/lib/clickup";
import { checkAndNotifyStatusChanges } from "@/lib/notifications";
import { writeFile, mkdir, unlink, rm } from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const userId = (session.user as { id?: string }).id;

  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
    .get(params.id, userId) as {
    id: number;
    clickup_task_id: string | null;
    clickup_status: string | null;
  } | undefined;

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Refresh status from ClickUp
  if (task.clickup_task_id) {
    try {
      const clickupTask = await getClickUpTask(task.clickup_task_id);
      const newStatus = clickupTask.status?.status || task.clickup_status;

      if (newStatus !== task.clickup_status) {
        // Record status change in history
        db.prepare(
          "INSERT INTO status_history (task_id, old_status, new_status) VALUES (?, ?, ?)"
        ).run(task.id, task.clickup_status, newStatus);

        db.prepare(
          "UPDATE tasks SET clickup_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(newStatus, task.id);

        // Send email notification
        checkAndNotifyStatusChanges(task.id, task.clickup_status || "open", newStatus);
      }

      const attachments = db
        .prepare("SELECT id, filename, mimetype, filepath FROM attachments WHERE task_id = ?")
        .all(task.id);

      const statusHistory = db
        .prepare("SELECT * FROM status_history WHERE task_id = ? ORDER BY changed_at DESC")
        .all(task.id);

      return NextResponse.json({
        task: { ...task, clickup_status: newStatus, attachments, statusHistory },
      });
    } catch (error) {
      console.error("Failed to fetch ClickUp task status:", error);
    }
  }

  const attachments = db
    .prepare("SELECT id, filename, mimetype, filepath FROM attachments WHERE task_id = ?")
    .all(task.id);

  const statusHistory = db
    .prepare("SELECT * FROM status_history WHERE task_id = ? ORDER BY changed_at DESC")
    .all(task.id);

  return NextResponse.json({ task: { ...task, attachments, statusHistory } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const userId = (session.user as { id?: string }).id;

  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
    .get(params.id, userId) as {
    id: number;
    clickup_task_id: string | null;
  } | undefined;

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Delete from ClickUp (non-blocking)
  if (task.clickup_task_id) {
    await deleteClickUpTask(task.clickup_task_id);
  }

  // Delete attachment files from disk
  try {
    const uploadDir = path.join(process.cwd(), "uploads", String(task.id));
    await rm(uploadDir, { recursive: true, force: true });
  } catch (error) {
    console.error("Failed to delete upload directory:", error);
  }

  // Delete DB records in transaction (respecting FK constraints)
  const deleteAll = db.transaction(() => {
    db.prepare("DELETE FROM comments WHERE task_id = ?").run(task.id);
    db.prepare("DELETE FROM status_history WHERE task_id = ?").run(task.id);
    db.prepare("DELETE FROM attachments WHERE task_id = ?").run(task.id);
    db.prepare("DELETE FROM tasks WHERE id = ?").run(task.id);
  });
  deleteAll();

  return NextResponse.json({ message: "Task deleted" });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const userId = (session.user as { id?: string }).id;

  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
    .get(params.id, userId) as {
    id: number;
    clickup_task_id: string | null;
    clickup_status: string | null;
  } | undefined;

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const urgency = formData.get("urgency") as string;
    const notes = formData.get("notes") as string;
    const removeAttachmentIds = formData.get("removeAttachmentIds") as string;
    const newFiles = formData.getAll("newAttachments") as File[];

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Update task fields
    db.prepare(
      "UPDATE tasks SET title = ?, urgency = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(title, urgency || "medium", notes || null, task.id);

    // Remove attachments
    if (removeAttachmentIds) {
      const idsToRemove = removeAttachmentIds.split(",").map((id) => id.trim());
      for (const attachmentId of idsToRemove) {
        const attachment = db
          .prepare("SELECT * FROM attachments WHERE id = ? AND task_id = ?")
          .get(attachmentId, task.id) as { id: number; filepath: string } | undefined;
        if (attachment) {
          try {
            await unlink(attachment.filepath);
          } catch {
            // File may already be deleted
          }
          db.prepare("DELETE FROM attachments WHERE id = ?").run(attachment.id);
        }
      }
    }

    // Add new attachments
    if (newFiles.length > 0) {
      const uploadDir = path.join(process.cwd(), "uploads", String(task.id));
      await mkdir(uploadDir, { recursive: true });

      for (const file of newFiles) {
        if (file.size === 0) continue;
        try {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const filePath = path.join(uploadDir, file.name);
          await writeFile(filePath, buffer);

          db.prepare(
            "INSERT INTO attachments (task_id, filename, filepath, mimetype) VALUES (?, ?, ?, ?)"
          ).run(task.id, file.name, filePath, file.type);

          if (task.clickup_task_id) {
            try {
              await uploadAttachmentToClickUp(task.clickup_task_id, filePath, file.name);
            } catch (err) {
              console.error("Failed to upload attachment to ClickUp:", err);
            }
          }
        } catch (err) {
          console.error(`Failed to process attachment ${file.name}:`, err);
        }
      }
    }

    // Sync to ClickUp
    if (task.clickup_task_id) {
      try {
        await updateClickUpTask(task.clickup_task_id, {
          name: title,
          description: notes || "",
          priority: URGENCY_TO_PRIORITY[urgency] || 3,
        });
      } catch (error) {
        console.error("Failed to sync edit to ClickUp:", error);
      }
    }

    // Return updated task
    const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id) as Record<string, unknown>;
    const attachments = db
      .prepare("SELECT id, filename, mimetype, filepath FROM attachments WHERE task_id = ?")
      .all(task.id);
    const statusHistory = db
      .prepare("SELECT * FROM status_history WHERE task_id = ? ORDER BY changed_at DESC")
      .all(task.id);

    return NextResponse.json({ task: { ...updatedTask, attachments, statusHistory } });
  } catch (error) {
    console.error("Task update error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
