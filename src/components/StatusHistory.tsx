"use client";

interface StatusChange {
  id: number;
  task_id: number;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  "pending": "bg-gray-800 text-gray-300",
  "to do": "bg-gray-800 text-gray-300",
  "in progress": "bg-blue-900/50 text-blue-300",
  "in review": "bg-yellow-900/50 text-yellow-300",
  "needs revisions": "bg-orange-900/50 text-orange-300",
  complete: "bg-green-900/50 text-green-300",
  closed: "bg-green-900/50 text-green-300",
  done: "bg-green-900/50 text-green-300",
  open: "bg-gray-800 text-gray-300",
};

export default function StatusHistory({
  history,
}: {
  history: StatusChange[];
}) {
  if (!history || history.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">
        Status History
      </h3>
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-700" />
        <div className="space-y-4">
          {history.map((change) => (
            <div key={change.id} className="relative flex items-start gap-3 pl-8">
              <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-brand-500 border-2 border-surface-800" />
              <div>
                <div className="flex items-center gap-2">
                  {change.old_status && (
                    <>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          STATUS_COLORS[change.old_status.toLowerCase()] || STATUS_COLORS["open"]
                        }`}
                      >
                        {change.old_status}
                      </span>
                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      STATUS_COLORS[change.new_status.toLowerCase()] || STATUS_COLORS["open"]
                    }`}
                  >
                    {change.new_status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(change.changed_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
