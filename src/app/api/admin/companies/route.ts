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

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const companies = db
    .prepare(
      `SELECT c.*, COUNT(u.id) as user_count
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    )
    .all();

  return NextResponse.json({ companies });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  const db = getDb();

  const existing = db.prepare("SELECT id FROM companies WHERE name = ?").get(name.trim());
  if (existing) {
    return NextResponse.json({ error: "A company with this name already exists" }, { status: 409 });
  }

  const result = db
    .prepare("INSERT INTO companies (name) VALUES (?)")
    .run(name.trim());

  return NextResponse.json(
    { message: "Company created", id: result.lastInsertRowid },
    { status: 201 }
  );
}
