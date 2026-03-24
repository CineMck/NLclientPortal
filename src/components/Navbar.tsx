"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [logoError, setLogoError] = useState(false);
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  return (
    <nav className="bg-surface-800 border-b border-gray-700/50 shadow-lg shadow-black/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="h-9 w-auto rounded-lg overflow-hidden bg-black flex items-center justify-center">
                {!logoError ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src="/logo.png"
                    alt="Neu Luma"
                    className="h-9 w-auto object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="px-2">
                    <span className="text-white font-bold text-sm">NL</span>
                  </div>
                )}
              </div>
              <span className="font-semibold text-white text-lg">
                Client Portal
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/new-task"
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                New Request
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {session?.user && (
              <>
                <span className="text-sm text-gray-400">
                  {session.user.name}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-sm text-gray-500 hover:text-gray-300 font-medium transition-colors"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
