"use client";

interface TaskFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  urgencyFilter: string;
  onUrgencyFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
}

export default function TaskFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  urgencyFilter,
  onUrgencyFilterChange,
  sortBy,
  onSortByChange,
}: TaskFiltersProps) {
  return (
    <div className="bg-surface-800 rounded-xl border border-gray-700/50 p-4 mb-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-700 border border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-white placeholder-gray-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 py-2 bg-surface-700 border border-gray-600 rounded-lg text-sm text-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="to do">To Do</option>
          <option value="open">Open</option>
          <option value="in progress">In Progress</option>
          <option value="in review">In Review</option>
          <option value="revisions needed">Revisions Needed</option>
          <option value="complete">Complete</option>
          <option value="closed">Closed</option>
        </select>

        {/* Urgency Filter */}
        <select
          value={urgencyFilter}
          onChange={(e) => onUrgencyFilterChange(e.target.value)}
          className="px-3 py-2 bg-surface-700 border border-gray-600 rounded-lg text-sm text-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
        >
          <option value="all">All Urgency</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="px-3 py-2 bg-surface-700 border border-gray-600 rounded-lg text-sm text-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="urgency">By Urgency</option>
          <option value="due_date">By Due Date</option>
        </select>
      </div>
    </div>
  );
}
