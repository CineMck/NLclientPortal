"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeleteTaskButtonProps {
  taskId: number;
}

export default function DeleteTaskButton({ taskId }: DeleteTaskButtonProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete task");
      }
    } catch {
      alert("Failed to delete task");
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg hover:bg-red-900/40 transition-colors"
        title="Delete request"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Delete
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-800 rounded-2xl border border-gray-700/50 p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Request?</h3>
            <p className="text-sm text-gray-400 mb-6">
              This will permanently delete this request, all its attachments, and comments. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex-1 bg-surface-700 text-gray-300 py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-surface-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
