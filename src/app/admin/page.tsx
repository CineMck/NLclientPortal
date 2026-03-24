import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import getDb from "@/lib/db";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== "admin") {
    redirect("/dashboard");
  }

  const db = getDb();
  const companyCount = (db.prepare("SELECT COUNT(*) as count FROM companies").get() as { count: number }).count;
  const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
  const taskCount = (db.prepare("SELECT COUNT(*) as count FROM tasks").get() as { count: number }).count;

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 mt-1">Manage companies, users, and portal settings.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface-800 rounded-xl border border-gray-700/50 p-5">
            <p className="text-sm text-gray-400 font-medium">Companies</p>
            <p className="text-3xl font-bold text-white mt-1">{companyCount}</p>
          </div>
          <div className="bg-surface-800 rounded-xl border border-gray-700/50 p-5">
            <p className="text-sm text-gray-400 font-medium">Users</p>
            <p className="text-3xl font-bold text-white mt-1">{userCount}</p>
          </div>
          <div className="bg-surface-800 rounded-xl border border-gray-700/50 p-5">
            <p className="text-sm text-gray-400 font-medium">Total Tasks</p>
            <p className="text-3xl font-bold text-white mt-1">{taskCount}</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/admin/companies"
            className="bg-surface-800 rounded-xl border border-gray-700/50 p-6 hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-500/5 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-600/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-brand-400 transition-colors">
                  Manage Companies
                </h3>
                <p className="text-sm text-gray-400">Create, edit, and delete company groups</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/users"
            className="bg-surface-800 rounded-xl border border-gray-700/50 p-6 hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-500/5 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-600/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-brand-400 transition-colors">
                  Manage Users
                </h3>
                <p className="text-sm text-gray-400">Add users, assign to companies, set roles</p>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
