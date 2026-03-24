"use client";

import { useState } from "react";

interface ApprovalWorkflowProps {
  taskId: number;
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
}

export default function ApprovalWorkflow({
  taskId,
  currentStatus,
  onStatusChange,
}: ApprovalWorkflowProps) {
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isInReview = currentStatus?.toLowerCase() === "in review";

  if (!isInReview) return null;

  async function handleAction(action: "approve" | "request_revisions") {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, feedback }),
      });

      if (res.ok) {
        const data = await res.json();
        onStatusChange(data.newStatus);
        setShowRevisionForm(false);
        setFeedback("");
      }
    } catch (err) {
      console.error("Approval action failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-yellow-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-base font-semibold text-yellow-300">
          Ready for Your Review
        </h3>
      </div>
      <p className="text-sm text-yellow-300/70 mb-4">
        This task is ready for your review. Please approve or request revisions.
      </p>

      {!showRevisionForm ? (
        <div className="flex gap-3">
          <button
            onClick={() => handleAction("approve")}
            disabled={submitting}
            className="flex-1 bg-green-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Processing..." : "Approve"}
          </button>
          <button
            onClick={() => setShowRevisionForm(true)}
            disabled={submitting}
            className="flex-1 bg-surface-700 text-orange-300 border border-orange-500/30 py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-surface-600 disabled:opacity-50 transition-colors"
          >
            Request Revisions
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe what changes are needed..."
            rows={3}
            className="w-full px-4 py-2.5 bg-surface-700 border border-orange-500/30 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-white placeholder-gray-500 resize-y"
          />
          <div className="flex gap-3">
            <button
              onClick={() => handleAction("request_revisions")}
              disabled={submitting}
              className="flex-1 bg-orange-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Sending..." : "Submit Revision Request"}
            </button>
            <button
              onClick={() => {
                setShowRevisionForm(false);
                setFeedback("");
              }}
              className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
