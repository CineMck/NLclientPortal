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

  // Total tasks
  const totalRow = db
    .prepare("SELECT COUNT(*) as count FROM tasks WHERE user_id = ?")
    .get(userId) as { count: number };

  // Tasks by status
  const statusRows = db
    .prepare(
      `SELECT LOWER(clickup_status) as status, COUNT(*) as count
       FROM tasks WHERE user_id = ?
       GROUP BY LOWER(clickup_status)`
    )
    .all(userId) as Array<{ status: string; count: number }>;

  const byStatus: Record<string, number> = {};
  for (const row of statusRows) {
    byStatus[row.status || "open"] = row.count;
  }

  // Tasks this month
  const thisMonthRow = db
    .prepare(
      `SELECT COUNT(*) as count FROM tasks
       WHERE user_id = ? AND created_at >= date('now', 'start of month')`
    )
    .get(userId) as { count: number };

  // Average turnaround (days between created_at and updated_at for completed tasks)
  const avgRow = db
    .prepare(
      `SELECT AVG(julianday(updated_at) - julianday(created_at)) as avg_days
       FROM tasks
       WHERE user_id = ? AND LOWER(clickup_status) IN ('complete', 'closed', 'done')`
    )
    .get(userId) as { avg_days: number | null };

  // Tasks by urgency
  const urgencyRows = db
    .prepare(
      `SELECT urgency, COUNT(*) as count FROM tasks
       WHERE user_id = ? GROUP BY urgency`
    )
    .all(userId) as Array<{ urgency: string; count: number }>;

  const byUrgency: Record<string, number> = {};
  for (const row of urgencyRows) {
    byUrgency[row.urgency] = row.count;
  }

  // Recent activity (last 30 days, tasks created per week)
  const weeklyRows = db
    .prepare(
      `SELECT strftime('%W', created_at) as week,
              strftime('%Y', created_at) as year,
              COUNT(*) as count
       FROM tasks
       WHERE user_id = ? AND created_at >= date('now', '-30 days')
       GROUP BY year, week
       ORDER BY year, week`
    )
    .all(userId) as Array<{ week: string; year: string; count: number }>;

  return NextResponse.json({
    total: totalRow.count,
    byStatus,
    byUrgency,
    thisMonth: thisMonthRow.count,
    avgTurnaroundDays: avgRow.avg_days ? Math.round(avgRow.avg_days * 10) / 10 : null,
    weeklyActivity: weeklyRows,
  });
}
