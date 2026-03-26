"use client";

import { useState, useEffect } from "react";

interface Attachment {
  id: number;
  filename: string;
  mimetype: string | null;
  filepath: string;
}

interface Task {
  id: number;
  title: string;
  urgency: string;
  notes: string | null;
  attachments: Attachment[];
}

interface EditTaskModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditTaskModal({
  task,
  isOpen,
  onClose,
  onSaved,
}: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [urgency, setUrgency] = useState(task.urgency);
  const [notes, setNotes] = useState(task.notes || "");
  const [removeIds, setRemoveIds] = useState<number[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTitle(task.title);
      setUrgency(task.urgency);
      setNotes(task.notes || "");
      setRemoveIds([]);
      setNewFiles([]);
      setError("");
    }
  }, [isOpen, task]);

  if (!isOpen) return null;

  const remainingAttachments = task.attachments.filter(
    (a) => !removeIds.includes(a.id)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("urgency", urgency);
      formData.append("notes", notes);
      if (removeIds.length > 0) {
        formData.append("removeAttachmentIds", removeIds.join(","));
      }
      for (const file of newFiles) {
        formData.append("newAttachments", file);
      }

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update task");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setNewFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-800 rounded-2xl border border-gray-700/50 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <h2 className="text-lg font-semibold text-white">Edit Request</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-surface-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label htmlFor="edit-urgency" className="block text-sm font-medium text-gray-300 mb-1">
              Urgency
            </label>
            <select
              id="edit-urgency"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-300 mb-1">
              Notes / Description
            </label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 bg-surface-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-white placeholder-gray-500 resize-y"
            />
          </div>

          {/* Existing attachments */}
          {task.attachments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Current Attachments
              </label>
              <div className="space-y-2">
                {task.attachments.map((att) => {
                  const isRemoved = removeIds.includes(att.id);
                  return (
                    <div
                      key={att.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                        isRemoved
                          ? "bg-red-900/20 border border-red-700/30"
                          : "bg-surface-700 border border-gray-600"
                      }`}
                    >
                      <span className={isRemoved ? "text-red-400 line-through" : "text-gray-300"}>
                        {att.filename}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRemoveIds((prev) =>
                            isRemoved
                              ? prev.filter((id) => id !== att.id)
                              : [...prev, att.id]
                          )
                        }
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          isRemoved
                            ? "text-gray-300 hover:text-white"
                            : "text-red-400 hover:text-red-300"
                        }`}
                      >
                        {isRemoved ? "Undo" : "Remove"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New file uploads */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add Attachments
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-600 file:text-white hover:file:bg-brand-700 file:cursor-pointer"
            />
            {newFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {newFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface-700 rounded-lg text-sm">
                    <span className="text-gray-300">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-300 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-brand-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
