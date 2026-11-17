import React, { useState } from "react";
import { User } from "../types.js";
import { setAuthToken } from "../utils/storage.js";
import { X, Lock, User as UserIcon, Mail, ArrowRight, AlertCircle, ShieldCheck } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload = mode === "login"
      ? { usernameOrEmail: username, password }
      : { username, email, password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      setAuthToken(data.token);
      onAuthSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 text-left">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-gray-100 dark:bg-slate-800 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              mode === "login"
                ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              mode === "register"
                ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Register Free
          </button>
        </div>

        <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-1">
          {mode === "login" ? "Welcome Back" : "Create SharePaste Account"}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
          {mode === "login"
            ? "Access your dashboard, manage notes, and track analytics."
            : "Save your articles, customize public profile, and manage notes."}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              {mode === "login" ? "Username or Email" : "Username"}
            </label>
            <div className="flex items-center px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm focus-within:border-blue-600">
              <UserIcon className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={mode === "login" ? "username or email" : "e.g. john_doe"}
                className="w-full bg-transparent outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Email Address (Optional)
              </label>
              <div className="flex items-center px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm focus-within:border-blue-600">
                <Mail className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-transparent outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="flex items-center px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm focus-within:border-blue-600">
              <Lock className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
