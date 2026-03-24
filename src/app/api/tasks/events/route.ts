import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import getDb from "@/lib/db";
import { getClickUpTask } from "@/lib/clickup";
import { checkAndNotifyStatusChanges } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Send initial heartbeat
      sendEvent({ type: "connected" });

      const poll = async () => {
        try {
          const db = getDb();
          const tasks = db
            .prepare(
              "SELECT id, clickup_task_id, clickup_status FROM tasks WHERE user_id = ? AND clickup_task_id IS NOT NULL"
            )
            .all(userId) as Array<{
            id: number;
            clickup_task_id: string;
            clickup_status: string;
          }>;

          for (const task of tasks) {
            try {
              const clickupTask = await getClickUpTask(task.clickup_task_id);
              const newStatus = clickupTask.status?.status;

              if (newStatus && newStatus !== task.clickup_status) {
                // Record in status history
                db.prepare(
                  "INSERT INTO status_history (task_id, old_status, new_status) VALUES (?, ?, ?)"
                ).run(task.id, task.clickup_status, newStatus);

                db.prepare(
                  "UPDATE tasks SET clickup_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
                ).run(newStatus, task.id);

                // Send email notification
                checkAndNotifyStatusChanges(task.id, task.clickup_status, newStatus);

                sendEvent({
                  type: "status_update",
                  taskId: task.id,
                  oldStatus: task.clickup_status,
                  newStatus,
                });
              }
            } catch {
              // Skip individual task errors
            }
          }

          sendEvent({ type: "heartbeat", timestamp: Date.now() });
        } catch {
          // Skip poll errors
        }
      };

      // Poll every 30 seconds
      const interval = setInterval(poll, 30000);

      // Initial poll
      await poll();

      // Cleanup when client disconnects
      const checkConnection = setInterval(() => {
        try {
          sendEvent({ type: "heartbeat", timestamp: Date.now() });
        } catch {
          clearInterval(interval);
          clearInterval(checkConnection);
          controller.close();
        }
      }, 15000);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
