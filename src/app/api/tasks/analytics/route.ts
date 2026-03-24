import { NextResponse } from "next/server";
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
  const companyId = (session.user as { companyId?: string | null }).companyId;

  // Build the WHERE clause based on company membership
  const whereClause = companyId
    ? "t.user_id IN (SELECT id FROM users WHERE company_id = ?)"
    : "t.user_id = ?";
  const param = companyId || userId;

  const totalRow = db
    .prepare(`SELECT COUNT(*) as count FROM tasks t WHERE ${whereClause}`)
    .get(param) as { count: number };

  const statusRows = db
    .prepare(
      `SELECT LOWER(t.clickup_status) as status, COUNT(*) as count
       FROM tasks t WHERE ${whereClause}
       GROUP BY LOWER(t.clickup_status)`
    )
    .all(param) as Array<{ status: string; count: number }>;

  const byStatus: Record<string, number> = {};
  for (const row of statusRows) {
    byStatus[row.status || "open"] = row.count;
  }

  const thisMonthRow = db
    .prepare(
      `SELECT COUNT(*) as count FROM tasks t
       WHERE ${whereClause} AND t.created_at >= date('now', 'start of month')`
    )
    .get(param) as { count: number };

  const avgRow = db
    .prepare(
      `SELECT AVG(julianday(t.updated_at) - julianday(t.created_at)) as avg_days
       FROM tasks t
       WHERE ${whereClause} AND LOWER(t.clickup_status) IN ('complete', 'closed', 'done')`
    )
    .get(param) as { avg_days: number | null };

  const urgencyRows = db
    .prepare(
      `SELECT t.urgency, COUNT(*) as count FROM tasks t
       WHERE ${whereClause} GROUP BY t.urgency`
    )
    .all(param) as Array<{ urgency: string; count: number }>;

  const byUrgency: Record<string, number> = {};
  for (const row of urgencyRows) {
    byUrgency[row.urgency] = row.count;
  }

  const weeklyRows = db
    .prepare(
      `SELECT strftime('%W', t.created_at) as week,
              strftime('%Y', t.created_at) as year,
              COUNT(*) as count
       FROM tasks t
       WHERE ${whereClause} AND t.created_at >= date('now', '-30 days')
       GROUP BY year, week
       ORDER BY year, week`
    )
    .all(param) as Array<{ week: string; year: string; count: number }>;

  return NextResponse.json({
    total: totalRow.count,
    byStatus,
    byUrgency,
    thisMonth: thisMonthRow.count,
    avgTurnaroundDays: avgRow.avg_days ? Math.round(avgRow.avg_days * 10) / 10 : null,
    weeklyActivity: weeklyRows,
  });
}
