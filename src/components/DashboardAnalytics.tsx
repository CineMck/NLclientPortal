"use client";

import { useEffect, useState } from "react";

interface Analytics {
  total: number;
  byStatus: Record<string, number>;
  byUrgency: Record<string, number>;
  thisMonth: number;
  avgTurnaroundDays: number | null;
  weeklyActivity: Array<{ week: string; year: string; count: number }>;
}

const STATUS_LABELS: Record<string, string> = {
  "to do": "To Do",
  open: "Open",
  "in progress": "In Progress",
  "in review": "In Review",
  complete: "Complete",
  closed: "Closed",
  done: "Done",
};

const STATUS_COLORS: Record<string, string> = {
  "to do": "bg-gray-200",
  open: "bg-gray-200",
  "in progress": "bg-blue-400",
  "in review": "bg-yellow-400",
  complete: "bg-green-400",
  closed: "bg-green-400",
  done: "bg-green-400",
};

export default function DashboardAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks/analytics")
      .then((res) => res.json())
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-12"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const completedCount =
    (analytics.byStatus["complete"] || 0) +
    (analytics.byStatus["closed"] || 0) +
    (analytics.byStatus["done"] || 0);

  const activeCount =
    (analytics.byStatus["in progress"] || 0) +
    (analytics.byStatus["in review"] || 0);

  const totalForBar = Math.max(analytics.total, 1);

  return (
    <div className="mb-8 space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 font-medium">Total Requests</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {analytics.total}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 font-medium">Active</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 font-medium">Completed</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {completedCount}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 font-medium">Avg. Turnaround</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {analytics.avgTurnaroundDays
              ? `${analytics.avgTurnaroundDays}d`
              : "--"}
          </p>
        </div>
      </div>

      {/* Status Bar */}
      {analytics.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              Status Breakdown
            </p>
            <p className="text-xs text-gray-500">
              {analytics.thisMonth} submitted this month
            </p>
          </div>
          <div className="flex rounded-full overflow-hidden h-4 bg-gray-100">
            {Object.entries(analytics.byStatus).map(([status, count]) => (
              <div
                key={status}
                className={`${STATUS_COLORS[status] || "bg-gray-300"} transition-all`}
                style={{ width: `${(count / totalForBar) * 100}%` }}
                title={`${STATUS_LABELS[status] || status}: ${count}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {Object.entries(analytics.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status] || "bg-gray-300"}`}
                />
                <span className="text-xs text-gray-600 capitalize">
                  {STATUS_LABELS[status] || status}: {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
