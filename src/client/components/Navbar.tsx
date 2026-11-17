import React, { useState } from "react";
import { User } from "../types.js";
import {
  FileText,
  PlusCircle,
  KeyRound,
  Moon,
  Sun,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Zap
} from "lucide-react";

interface NavbarProps {
  user: User | null;
  onOpenAuth: () => void;
  onOpenQuickCode: () => void;
  onLogout: () => void;
  onNavigateHome: () => void;
  onNavigateDashboard: () => void;
  onNavigateProfile: (username: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onOpenQuickCode,
  onLogout,
  onNavigateHome,
  onNavigateDashboard,
  onNavigateProfile,
  darkMode,
  onToggleDarkMode
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigateHome();
          }}
          aria-label="SharePaste Home - Fast Paste and Transfer Anywhere"
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm group-hover:bg-blue-700 transition">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                Share<span className="text-blue-600">Paste</span>
              </span>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium -mt-1 hidden sm:block">
              fast paste & transfer anywhere
            </span>
          </div>
        </a>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* New Paste CTA */}
          <button
            type="button"
            onClick={onNavigateHome}
            aria-label="Create new paste note"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New Paste</span>
          </button>

          {/* 60-Minute Quick Code Access Button */}
          <button
            type="button"
            onClick={onOpenQuickCode}
            aria-label="Open paste with 6-digit quick code"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-xs"
            title="Open a paste anywhere with a 6-digit code"
          >
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-500" />
            <span className="font-mono text-xs uppercase tracking-wider font-bold">Quick Code</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User Account / Auth */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="User account menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm font-medium text-gray-800 dark:text-gray-200 transition"
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold uppercase">
                  {user.username.charAt(0)}
                </div>
                <span className="hidden md:inline font-semibold">{user.username}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-1.5 z-50 text-sm">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                    <p className="font-bold text-gray-900 dark:text-white truncate">@{user.username}</p>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigateDashboard();
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <LayoutDashboard className="w-4 h-4 text-blue-600" />
                    My Pastes Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onNavigateProfile(user.username);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <UserIcon className="w-4 h-4 text-emerald-600" />
                    Public Profile
                  </button>
                  <div className="border-t border-gray-100 dark:border-slate-700 my-1"></div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              aria-label="Sign in to SharePaste account"
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-xs transition"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
