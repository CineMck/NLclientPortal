import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import getDb from "@/lib/db";
import {
  getClickUpTaskComments,
  createClickUpComment,
} from "@/lib/clickup";

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
  } | undefined;

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Get local comments
  const localComments = db
    .prepare("SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC")
    .all(task.id) as Array<{
    id: number;
    clickup_comment_id: string | null;
    source: string;
    content: string;
    author_name: string;
    created_at: string;
  }>;

  // If task has a ClickUp ID, sync comments from ClickUp
  if (task.clickup_task_id) {
    try {
      const clickupData = await getClickUpTaskComments(task.clickup_task_id);
      const clickupComments = clickupData.comments || [];

      const existingClickupIds = new Set(
        localComments
          .filter((c) => c.clickup_comment_id)
          .map((c) => c.clickup_comment_id)
      );

      for (const cc of clickupComments) {
        if (!existingClickupIds.has(cc.id)) {
          const commentText =
            cc.comment_text ||
            (cc.comment || [])
              .map((part: { text?: string }) => part.text || "")
              .join("");

          db.prepare(
            `INSERT INTO comments (task_id, author_name, content, clickup_comment_id, source, created_at)
             VALUES (?, ?, ?, ?, 'clickup', ?)`
          ).run(
            task.id,
            cc.user?.username || "ClickUp User",
            commentText,
            cc.id,
            new Date(parseInt(cc.date)).toISOString()
          );
        }
      }
    } catch (error) {
      console.error("Failed to sync ClickUp comments:", error);
    }
  }

  // Re-fetch all comments after potential sync
  const allComments = db
    .prepare("SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC")
    .all(task.id);

  return NextResponse.json({ comments: allComments });
}

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
  } | undefined;

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { content } = await request.json();
  if (!content?.trim()) {
    return NextResponse.json(
      { error: "Comment content is required" },
      { status: 400 }
    );
  }

  let clickupCommentId: string | null = null;

  // Post to ClickUp if linked
  if (task.clickup_task_id) {
    try {
      const result = await createClickUpComment(
        task.clickup_task_id,
        `[Portal - ${userName}]: ${content}`
      );
      clickupCommentId = result.id || null;
    } catch (error) {
      console.error("Failed to create ClickUp comment:", error);
    }
  }

  const result = db
    .prepare(
      `INSERT INTO comments (task_id, user_id, author_name, content, clickup_comment_id, source)
       VALUES (?, ?, ?, ?, ?, 'portal')`
    )
    .run(task.id, userId, userName, content, clickupCommentId);

  const comment = db
    .prepare("SELECT * FROM comments WHERE id = ?")
    .get(result.lastInsertRowid);

  return NextResponse.json({ comment }, { status: 201 });
}
