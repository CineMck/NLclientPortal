import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import getDb from "@/lib/db";
import bcrypt from "bcryptjs";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return null;
  }
  return session;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const user = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.company_id, u.created_at,
              c.name as company_name
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = ?`
    )
    .get(params.id);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, password, role, companyId } = await request.json();

  const db = getDb();

  if (email) {
    const existing = db
      .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
      .get(email, params.id);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }
  }

  // Build dynamic update
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (name) { updates.push("name = ?"); values.push(name); }
  if (email) { updates.push("email = ?"); values.push(email); }
  if (role) { updates.push("role = ?"); values.push(role); }
  if (companyId !== undefined) {
    updates.push("company_id = ?");
    values.push(companyId || null);
  }
  if (password) {
    updates.push("password = ?");
    values.push(bcrypt.hashSync(password, 10));
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(params.id);
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  return NextResponse.json({ message: "User updated" });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Prevent deleting yourself
  const currentUserId = (session.user as { id?: string }).id;
  if (currentUserId === params.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("DELETE FROM notification_preferences WHERE user_id = ?").run(params.id);
  db.prepare("DELETE FROM comments WHERE user_id = ?").run(params.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(params.id);

  return NextResponse.json({ message: "User deleted" });
}
