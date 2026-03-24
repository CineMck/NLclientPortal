"use client";

import { useState } from "react";

interface Attachment {
  id: number;
  filename: string;
  mimetype: string | null;
  filepath: string;
}

function getFileType(mimetype: string | null, filename: string): string {
  if (mimetype?.startsWith("image/")) return "image";
  if (mimetype === "application/pdf") return "pdf";
  if (mimetype?.startsWith("video/")) return "video";
  if (mimetype?.startsWith("audio/")) return "audio";

  const ext = filename.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext || ""))
    return "image";
  if (ext === "pdf") return "pdf";
  if (["mp4", "webm", "mov", "avi"].includes(ext || "")) return "video";
  if (["mp3", "wav", "ogg"].includes(ext || "")) return "audio";

  return "file";
}

function FileIcon({ type }: { type: string }) {
  if (type === "image") {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (type === "pdf") {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  if (type === "video") {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  );
}

export default function FilePreview({
  attachments,
  taskId,
}: {
  attachments: Attachment[];
  taskId: number;
}) {
  const [previewId, setPreviewId] = useState<number | null>(null);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const previewAttachment = attachments.find((a) => a.id === previewId);
  const previewType = previewAttachment
    ? getFileType(previewAttachment.mimetype, previewAttachment.filename)
    : null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Attachments ({attachments.length})
      </h3>

      {/* File Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {attachments.map((attachment) => {
          const type = getFileType(attachment.mimetype, attachment.filename);
          const canPreview = ["image", "pdf", "video", "audio"].includes(type);
          const url = `/api/tasks/${taskId}/attachments/${attachment.id}`;

          return (
            <div
              key={attachment.id}
              className="border border-gray-200 rounded-lg overflow-hidden group"
            >
              {type === "image" ? (
                <div
                  className="aspect-square bg-gray-100 cursor-pointer relative"
                  onClick={() => setPreviewId(attachment.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={attachment.filename}
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                      />
                    </svg>
                  </div>
                </div>
              ) : (
                <div
                  className={`aspect-square bg-gray-50 flex flex-col items-center justify-center ${canPreview ? "cursor-pointer" : ""}`}
                  onClick={() => canPreview && setPreviewId(attachment.id)}
                >
                  <div className="text-gray-400 mb-2">
                    <FileIcon type={type} />
                  </div>
                  <span className="text-xs text-gray-500 uppercase font-medium">
                    {attachment.filename.split(".").pop()}
                  </span>
                </div>
              )}
              <div className="px-2 py-1.5 bg-white border-t border-gray-100">
                <p className="text-xs text-gray-600 truncate" title={attachment.filename}>
                  {attachment.filename}
                </p>
                <a
                  href={url}
                  download={attachment.filename}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Download
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewAttachment && previewType && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewId(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h4 className="font-medium text-gray-900 truncate">
                {previewAttachment.filename}
              </h4>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/tasks/${taskId}/attachments/${previewAttachment.id}`}
                  download={previewAttachment.filename}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  Download
                </a>
                <button
                  onClick={() => setPreviewId(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 flex justify-center">
              {previewType === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/tasks/${taskId}/attachments/${previewAttachment.id}`}
                  alt={previewAttachment.filename}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              )}
              {previewType === "pdf" && (
                <iframe
                  src={`/api/tasks/${taskId}/attachments/${previewAttachment.id}`}
                  className="w-full h-[70vh]"
                  title={previewAttachment.filename}
                />
              )}
              {previewType === "video" && (
                <video
                  controls
                  className="max-w-full max-h-[70vh]"
                  src={`/api/tasks/${taskId}/attachments/${previewAttachment.id}`}
                />
              )}
              {previewType === "audio" && (
                <audio
                  controls
                  src={`/api/tasks/${taskId}/attachments/${previewAttachment.id}`}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
