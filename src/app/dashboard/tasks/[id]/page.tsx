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
}

const STATUS_COLORS: Record<string, string> = {
  "to do": "bg-gray-100 text-gray-700",
  "in progress": "bg-blue-100 text-blue-700",
  "in review": "bg-yellow-100 text-yellow-700",
  complete: "bg-green-100 text-green-700",
  closed: "bg-green-100 text-green-700",
  done: "bg-green-100 text-green-700",
  open: "bg-gray-100 text-gray-700",
};

const URGENCY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-gray-500">Task not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-6"
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
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
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
          <div className="flex flex-wrap gap-6 text-sm text-gray-500 mb-6">
            <div>
              <span className="font-medium text-gray-700">Submitted:</span>{" "}
              {new Date(task.created_at).toLocaleDateString()}
            </div>
            {task.due_date && (
              <div>
                <span className="font-medium text-gray-700">Due:</span>{" "}
                {new Date(task.due_date).toLocaleDateString()}
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span>{" "}
              {new Date(task.updated_at).toLocaleString()}
            </div>
            {task.clickup_task_id && (
              <div>
                <span className="font-medium text-gray-700">ClickUp ID:</span>{" "}
                {task.clickup_task_id}
              </div>
            )}
          </div>

          {/* Description */}
          {task.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Description
              </h3>
              <p className="text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 text-sm">
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
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 mb-6">
            <FilePreview attachments={task.attachments} taskId={task.id} />
          </div>
        )}

        {/* Status History */}
        {task.statusHistory && task.statusHistory.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 mb-6">
            <StatusHistory history={task.statusHistory} />
          </div>
        )}

        {/* Comments */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
          <CommentSection taskId={task.id} />
        </div>
      </main>
    </div>
  );
}
