"use client";

import { useEffect, useState } from "react";

interface Task {
  id: number;
  title: string;
  due_date: string | null;
  urgency: string;
  notes: string | null;
  clickup_task_id: string | null;
  clickup_status: string;
  created_at: string;
  attachment_names: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  "to do": "bg-gray-100 text-gray-700",
  "in progress": "bg-blue-100 text-blue-700",
  "in review": "bg-yellow-100 text-yellow-700",
  "complete": "bg-green-100 text-green-700",
  "closed": "bg-green-100 text-green-700",
  "done": "bg-green-100 text-green-700",
  "open": "bg-gray-100 text-gray-700",
};

const URGENCY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<number | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }

  async function refreshStatus(taskId: number) {
    setRefreshing(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (data.task) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, clickup_status: data.task.clickup_status }
              : t
          )
        );
      }
    } catch (err) {
      console.error("Failed to refresh status:", err);
    } finally {
      setRefreshing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 className="mt-3 text-sm font-medium text-gray-900">No requests yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by submitting your first project request.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-base">
                {task.title}
              </h3>
              {task.notes && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  {task.notes}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    STATUS_COLORS[task.clickup_status?.toLowerCase()] ||
                    STATUS_COLORS["open"]
                  }`}
                >
                  {task.clickup_status || "Submitted"}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    URGENCY_COLORS[task.urgency] || URGENCY_COLORS["medium"]
                  }`}
                >
                  {task.urgency}
                </span>
                {task.due_date && (
                  <span className="text-xs text-gray-500">
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
                {task.attachment_names && (
                  <span className="text-xs text-gray-500">
                    {task.attachment_names.split(",").length} file(s) attached
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => refreshStatus(task.id)}
              disabled={refreshing === task.id}
              className="shrink-0 text-gray-400 hover:text-brand-600 p-1 rounded transition-colors"
              title="Refresh status from ClickUp"
            >
              <svg
                className={`w-5 h-5 ${refreshing === task.id ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
