import React, { useState, useEffect } from "react";
import { Paste, QuickShareData } from "../types.js";
import { getAuthToken } from "../utils/storage.js";
import {
  LayoutDashboard,
  Search,
  Eye,
  Lock,
  Clock,
  Trash2,
  Edit3,
  ExternalLink,
  Zap,
  PlusCircle,
  AlertCircle
} from "lucide-react";

interface DashboardProps {
  onNavigateHome: () => void;
  onOpenPaste: (slug: string) => void;
  onEditPaste: (slug: string, title: string, content: string) => void;
  onOpenQuickShare: (data: QuickShareData) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateHome,
  onOpenPaste,
  onEditPaste,
  onOpenQuickShare,
}) => {
  const [pastes, setPastes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardPastes();
  }, []);

  const fetchDashboardPastes = async () => {
    setLoading(true);
    setError(null);
    const token = getAuthToken();
    if (!token) {
      setError("Please sign in to view your dashboard.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPastes(data.pastes || []);
      } else {
        throw new Error(data.error || "Failed to load dashboard.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Are you sure you want to permanently delete this note?")) return;
    const token = getAuthToken();

    try {
      const res = await fetch(`/api/pastes/${slug}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setPastes(pastes.filter((p) => p.slug !== slug));
      } else {
        alert("Failed to delete paste.");
      }
    } catch {
      alert("Error deleting paste.");
    }
  };

  const handleQuickShare = async (slug: string) => {
    try {
      const res = await fetch(`/api/pastes/${slug}/quick-share`, { method: "POST" });
      const data = await res.json();
      if (res.ok) onOpenQuickShare(data);
    } catch {
      alert("Failed to generate quick share.");
    }
  };

  const filtered = pastes.filter((p) => {
    const matchTitle = p.title.toLowerCase().includes(search.toLowerCase());
    const matchSlug = p.slug.toLowerCase().includes(search.toLowerCase());
    const matchTags = p.tags && p.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
    return matchTitle || matchSlug || matchTags;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex-1 flex flex-col w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
            <LayoutDashboard className="w-7 h-7 text-blue-600" />
            <span>My Pastes Dashboard</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage, edit, monitor views, and share your published notes.
          </p>
        </div>

        <button
          onClick={onNavigateHome}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes by title, slug, or tag..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            {search ? "No notes matching your search criteria." : "You haven't published any notes under this account yet."}
          </p>
          <button
            onClick={onNavigateHome}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm"
          >
            Create Your First Note
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Title & Slug</th>
                  <th className="px-6 py-4">Status & Security</th>
                  <th className="px-6 py-4">Views</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-medium">
                      <div
                        onClick={() => onOpenPaste(p.slug)}
                        className="font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-base mb-0.5"
                      >
                        {p.title || "Untitled"}
                      </div>
                      <div className="text-xs font-mono text-blue-600 dark:text-blue-400">
                        quicktrfr/{p.slug}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.isExpired ? (
                          <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 text-[11px] font-bold">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                            Active
                          </span>
                        )}

                        {p.is_encrypted ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Encrypted
                          </span>
                        ) : null}

                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 text-[11px] font-semibold uppercase">
                          {p.visibility}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-gray-400" />
                        <span>{p.view_count}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 60-Minute Quick Share */}
                        <button
                          onClick={() => handleQuickShare(p.slug)}
                          className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          title="Generate 60-min Quick Share code & QR"
                        >
                          <Zap className="w-4 h-4 fill-amber-500" />
                        </button>

                        {/* Open */}
                        <button
                          onClick={() => onOpenPaste(p.slug)}
                          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                          title="View"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(p.slug)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
