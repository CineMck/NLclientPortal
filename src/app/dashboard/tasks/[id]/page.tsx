"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import CommentSection from "@/components/CommentSection";
import FilePreview from "@/components/FilePreview";
import ApprovalWorkflow from "@/components/ApprovalWorkflow";
import StatusHistory from "@/components/StatusHistory";
import Link from "next/link";

interface Attachment {
  id: number;
  filename: string;
  mimetype: string | null;
  filepath: string;
}

interface StatusChange {
  id: number;
  task_id: number;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

interface Task {
  id: number;
  title: string;
  due_date: string | null;
  urgency: string;
  notes: string | null;
  clickup_task_id: string | null;
  clickup_status: string;
  created_at: string;
  updated_at: string;
  attachments: Attachment[];
  statusHistory: StatusChange[];
  submitter_name?: string;
}

const STATUS_COLORS: Record<string, string> = {
  "to do": "bg-gray-800 text-gray-300",
  "in progress": "bg-blue-900/50 text-blue-300",
  "in review": "bg-yellow-900/50 text-yellow-300",
  complete: "bg-green-900/50 text-green-300",
  closed: "bg-green-900/50 text-green-300",
  done: "bg-green-900/50 text-green-300",
  open: "bg-gray-800 text-gray-300",
};

const URGENCY_COLORS: Record<string, string> = {
  low: "bg-gray-800 text-gray-400",
  medium: "bg-blue-900/50 text-blue-300",
  high: "bg-orange-900/50 text-orange-300",
  urgent: "bg-red-900/50 text-red-300",
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (res.status === 404) {
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      setTask(data.task);
    } catch (err) {
      console.error("Failed to fetch task:", err);
    } finally {
      setLoading(false);
    }
  }, [taskId, router]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-800 rounded w-48"></div>
            <div className="h-40 bg-gray-800 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-surface-900">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-400">Task not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-gray-200 inline-flex items-center gap-1 mb-6"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="bg-surface-800 rounded-2xl border border-gray-700/50 p-6 sm:p-8 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-white">{task.title}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  STATUS_COLORS[task.clickup_status?.toLowerCase()] ||
                  STATUS_COLORS["open"]
                }`}
              >
                {task.clickup_status || "Submitted"}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${
                  URGENCY_COLORS[task.urgency] || URGENCY_COLORS["medium"]
                }`}
              >
                {task.urgency}
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-6 text-sm text-gray-400 mb-6">
            <div>
              <span className="font-medium text-gray-300">Submitted:</span>{" "}
              {new Date(task.created_at).toLocaleDateString()}
            </div>
            {task.due_date && (
              <div>
                <span className="font-medium text-gray-300">Due:</span>{" "}
                {new Date(task.due_date).toLocaleDateString()}
              </div>
            )}
            <div>
              <span className="font-medium text-gray-300">Last Updated:</span>{" "}
              {new Date(task.updated_at).toLocaleString()}
            </div>
            {task.clickup_task_id && (
              <div>
                <span className="font-medium text-gray-300">ClickUp ID:</span>{" "}
                {task.clickup_task_id}
              </div>
            )}
            {task.submitter_name && (
              <div>
                <span className="font-medium text-gray-300">Submitted by:</span>{" "}
                {task.submitter_name}
              </div>
            )}
          </div>

          {/* Description */}
          {task.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">
                Description
              </h3>
              <p className="text-gray-400 whitespace-pre-wrap bg-surface-700 rounded-lg p-4 text-sm">
                {task.notes}
              </p>
            </div>
          )}
        </div>

        {/* Approval Workflow */}
        <div className="mb-6">
          <ApprovalWorkflow
            taskId={task.id}
            currentStatus={task.clickup_status}
            onStatusChange={(newStatus) =>
              setTask((prev) => (prev ? { ...prev, clickup_status: newStatus } : prev))
            }
          />
        </div>

        {/* File Preview */}
        {task.attachments && task.attachments.length > 0 && (
          <div className="bg-surface-800 rounded-2xl border border-gray-700/50 p-6 sm:p-8 mb-6">
            <FilePreview attachments={task.attachments} taskId={task.id} />
          </div>
        )}

        {/* Status History */}
        {task.statusHistory && task.statusHistory.length > 0 && (
          <div className="bg-surface-800 rounded-2xl border border-gray-700/50 p-6 sm:p-8 mb-6">
            <StatusHistory history={task.statusHistory} />
          </div>
        )}

        {/* Comments */}
        <div className="bg-surface-800 rounded-2xl border border-gray-700/50 p-6 sm:p-8">
          <CommentSection taskId={task.id} />
        </div>
      </main>
    </div>
  );
}
