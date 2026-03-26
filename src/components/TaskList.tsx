"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import TaskFilters from "./TaskFilters";
import { useSSE } from "@/hooks/useSSE";

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
  submitter_name?: string;
}

const STATUS_COLORS: Record<string, string> = {
  "pending": "bg-gray-800 text-gray-300",
  "to do": "bg-gray-800 text-gray-300",
  "in progress": "bg-blue-900/50 text-blue-300",
  "in review": "bg-yellow-900/50 text-yellow-300",
  "needs revisions": "bg-orange-900/50 text-orange-300",
  "complete": "bg-green-900/50 text-green-300",
  "closed": "bg-green-900/50 text-green-300",
  "done": "bg-green-900/50 text-green-300",
  "open": "bg-gray-800 text-gray-300",
};

const URGENCY_COLORS: Record<string, string> = {
  low: "bg-gray-800 text-gray-400",
  medium: "bg-blue-900/50 text-blue-300",
  high: "bg-orange-900/50 text-orange-300",
  urgent: "bg-red-900/50 text-red-300",
};

const URGENCY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export default function TaskList() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Real-time updates via SSE
  useSSE((event) => {
    if (event.type === "status_update" && event.taskId && event.newStatus) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === event.taskId
            ? { ...t, clickup_status: event.newStatus! }
            : t
        )
      );
    }
  });

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

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(
        (t) => t.clickup_status?.toLowerCase() === statusFilter
      );
    }

    // Urgency filter
    if (urgencyFilter !== "all") {
      result = result.filter((t) => t.urgency === urgencyFilter);
    }

    // Sort
    switch (sortBy) {
      case "oldest":
        result.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "urgency":
        result.sort(
          (a, b) =>
            (URGENCY_ORDER[a.urgency] ?? 4) - (URGENCY_ORDER[b.urgency] ?? 4)
        );
        break;
      case "due_date":
        result.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return (
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
        });
        break;
      default: // newest
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    return result;
  }, [tasks, search, statusFilter, urgencyFilter, sortBy]);

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
        <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 className="mt-3 text-sm font-medium text-white">No requests yet</h3>
        <p className="mt-1 text-sm text-gray-400">
          Get started by submitting your first project request.
        </p>
      </div>
    );
  }

  return (
    <div>
      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        urgencyFilter={urgencyFilter}
        onUrgencyFilterChange={setUrgencyFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      {filteredTasks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">
            No tasks match your filters.{" "}
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setUrgencyFilter("all");
              }}
              className="text-brand-400 hover:text-brand-300 font-medium"
            >
              Clear filters
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
              className="bg-surface-800 border border-gray-700/50 rounded-xl p-5 hover:shadow-lg hover:shadow-brand-500/5 hover:border-brand-500/30 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-base group-hover:text-brand-400 transition-colors">
                    {task.title}
                  </h3>
                  {task.notes && (
                    <p className="mt-1 text-sm text-gray-400 line-clamp-2">
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
                    {task.submitter_name && (
                      <span className="text-xs text-gray-500">
                        by {task.submitter_name}
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-600 group-hover:text-brand-400 transition-colors shrink-0 mt-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
