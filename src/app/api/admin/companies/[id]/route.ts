import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import getDb from "@/lib/db";

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
  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(params.id);

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const users = db
    .prepare("SELECT id, name, email, role, created_at FROM users WHERE company_id = ?")
    .all(params.id);

  return NextResponse.json({ company, users });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM companies WHERE name = ? AND id != ?")
    .get(name.trim(), params.id);
  if (existing) {
    return NextResponse.json({ error: "A company with this name already exists" }, { status: 409 });
  }

  db.prepare("UPDATE companies SET name = ? WHERE id = ?").run(name.trim(), params.id);

  return NextResponse.json({ message: "Company updated" });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();

  // Unassign users from this company first
  db.prepare("UPDATE users SET company_id = NULL WHERE company_id = ?").run(params.id);
  db.prepare("DELETE FROM companies WHERE id = ?").run(params.id);

  return NextResponse.json({ message: "Company deleted" });
}
