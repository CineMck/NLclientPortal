import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import getDb from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const userId = (session.user as { id?: string }).id;

  const prefs = db
    .prepare("SELECT * FROM notification_preferences WHERE user_id = ?")
    .get(userId);

  if (!prefs) {
    return NextResponse.json({
      preferences: {
        email_on_status_change: true,
        email_on_comment: true,
      },
    });
  }

  return NextResponse.json({ preferences: prefs });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const userId = (session.user as { id?: string }).id;
  const { email_on_status_change, email_on_comment } = await request.json();

  db.prepare(
    `INSERT INTO notification_preferences (user_id, email_on_status_change, email_on_comment)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       email_on_status_change = excluded.email_on_status_change,
       email_on_comment = excluded.email_on_comment`
  ).run(
    userId,
    email_on_status_change ? 1 : 0,
    email_on_comment ? 1 : 0
  );

  return NextResponse.json({ message: "Preferences updated" });
}
