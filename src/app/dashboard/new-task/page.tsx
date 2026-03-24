import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import TaskForm from "@/components/TaskForm";
import Link from "next/link";

export default async function NewTaskPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-gray-200 inline-flex items-center gap-1 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white">
            Submit a New Request
          </h1>
          <p className="text-gray-400 mt-1">
            Tell us about your project or task and we&apos;ll get right on it.
          </p>
        </div>
        <div className="bg-surface-800 rounded-2xl shadow-lg shadow-black/20 border border-gray-700/50 p-6 sm:p-8">
          <TaskForm />
        </div>
      </main>
    </div>
  );
}
