"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

interface Company {
  id: number;
  name: string;
  user_count: number;
  created_at: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    try {
      const res = await fetch("/api/admin/companies");
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingCompany(null);
    setCompanyName("");
    setError("");
    setShowModal(true);
  }

  function openEdit(company: Company) {
    setEditingCompany(company);
    setCompanyName(company.name);
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editingCompany
        ? `/api/admin/companies/${editingCompany.id}`
        : "/api/admin/companies";
      const method = editingCompany ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save company");
      }

      setShowModal(false);
      fetchCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this company? Users will be unassigned.")) return;

    try {
      await fetch(`/api/admin/companies/${id}`, { method: "DELETE" });
      fetchCompanies();
    } catch (err) {
      console.error("Failed to delete company:", err);
    }
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/admin"
          className="text-sm text-gray-400 hover:text-gray-200 inline-flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Admin
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Companies</h1>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Company
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12 bg-surface-800 rounded-xl border border-gray-700/50">
            <p className="text-gray-400">No companies yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="bg-surface-800 rounded-xl border border-gray-700/50 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Users</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Created</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-surface-700/50">
                    <td className="px-6 py-4 text-sm font-medium text-white">{company.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{company.user_count}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(company.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEdit(company)}
                        className="text-sm text-brand-400 hover:text-brand-300 font-medium mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(company.id)}
                        className="text-sm text-red-400 hover:text-red-300 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-surface-800 rounded-2xl border border-gray-700/50 w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                {editingCompany ? "Edit Company" : "New Company"}
              </h2>

              {error && (
                <div className="bg-red-900/30 border border-red-700/50 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-white placeholder-gray-500"
                  placeholder="Enter company name"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : editingCompany ? "Save Changes" : "Create Company"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
