import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import getDb from "@/lib/db";
import { updateClickUpTaskStatus, createClickUpComment } from "@/lib/clickup";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const userId = (session.user as { id?: string }).id;
  const userName = session.user.name || "Client";

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

  const { action, feedback } = await request.json();

  if (!["approve", "request_revisions"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const isApproval = action === "approve";
  const newStatus = isApproval ? "complete" : "needs revisions";
  const oldStatus = task.clickup_status;

  // Record status change
  db.prepare(
    "INSERT INTO status_history (task_id, old_status, new_status) VALUES (?, ?, ?)"
  ).run(task.id, oldStatus, newStatus);

  // Update local status
  db.prepare(
    "UPDATE tasks SET clickup_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(newStatus, task.id);

  // Add a comment recording the decision
  const commentContent = isApproval
    ? "Approved by client."
    : `Revisions requested by client: ${feedback || "No details provided."}`;

  db.prepare(
    `INSERT INTO comments (task_id, user_id, author_name, content, source)
     VALUES (?, ?, ?, ?, 'portal')`
  ).run(task.id, userId, userName, commentContent);

  // Sync to ClickUp
  if (task.clickup_task_id) {
    try {
      await updateClickUpTaskStatus(task.clickup_task_id, newStatus);
      await createClickUpComment(
        task.clickup_task_id,
        `[Portal - ${userName}]: ${commentContent}`
      );
    } catch (error) {
      console.error("Failed to sync approval to ClickUp:", error);
    }
  }

  return NextResponse.json({
    message: isApproval ? "Task approved" : "Revisions requested",
    newStatus,
  });
}
