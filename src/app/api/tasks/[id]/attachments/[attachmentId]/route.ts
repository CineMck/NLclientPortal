import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import getDb from "@/lib/db";
import { readFile } from "fs/promises";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; attachmentId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const userId = (session.user as { id?: string }).id;

  // Verify the task belongs to the user
  const task = db
    .prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?")
    .get(params.id, userId) as { id: number } | undefined;

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const attachment = db
    .prepare("SELECT * FROM attachments WHERE id = ? AND task_id = ?")
    .get(params.attachmentId, params.id) as {
    id: number;
    filename: string;
    filepath: string;
    mimetype: string | null;
  } | undefined;

  if (!attachment) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(attachment.filepath);
    const headers = new Headers();
    headers.set(
      "Content-Type",
      attachment.mimetype || "application/octet-stream"
    );
    headers.set(
      "Content-Disposition",
      `inline; filename="${attachment.filename}"`
    );

    return new NextResponse(fileBuffer, { headers });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
