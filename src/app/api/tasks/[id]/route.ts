import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import getDb from "@/lib/db";
import { getClickUpTask } from "@/lib/clickup";

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
        db.prepare(
          "UPDATE tasks SET clickup_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        ).run(newStatus, task.id);
      }

      return NextResponse.json({
        task: { ...task, clickup_status: newStatus },
      });
    } catch (error) {
      console.error("Failed to fetch ClickUp task status:", error);
    }
  }

  const attachments = db
    .prepare("SELECT id, filename, mimetype FROM attachments WHERE task_id = ?")
    .all(task.id);

  return NextResponse.json({ task: { ...task, attachments } });
}
