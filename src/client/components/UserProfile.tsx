import React, { useState, useEffect } from "react";
import { User as UserIcon, Calendar, FileText, Eye, Lock, ArrowLeft } from "lucide-react";

interface UserProfileProps {
  username: string;
  onOpenPaste: (slug: string) => void;
  onNavigateHome: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  username,
  onOpenPaste,
  onNavigateHome,
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${username}`);
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
      } else {
        throw new Error(data.error || "Profile not found.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center flex-1">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto py-20 text-center flex-1">
        <p className="text-gray-500 mb-4">{error || "User not found."}</p>
        <button onClick={onNavigateHome} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm">
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex-1 flex flex-col w-full">
      <button
        onClick={onNavigateHome}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Editor</span>
      </button>

      {/* User Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-200/80 dark:border-slate-800 p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
        <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-3xl font-black uppercase shadow-lg shadow-blue-600/30">
          {profile.user.username.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            @{profile.user.username}
          </h2>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Member since {new Date(profile.user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })}
            </span>
            <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
              <FileText className="w-3.5 h-3.5" />
              {profile.user.pasteCount} published articles
            </span>
          </div>
          {profile.user.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">{profile.user.bio}</p>
          )}
        </div>
      </div>

      {/* Published Notes List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-200/80 dark:border-slate-800 p-6 sm:p-8">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Public Notes ({profile.pastes.length})
        </h3>

        {profile.pastes.length === 0 ? (
          <p className="text-sm text-gray-400 italic">This user has not published any public notes yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {profile.pastes.map((p: any) => (
              <div
                key={p.id}
                onClick={() => onOpenPaste(p.slug)}
                className="py-4 flex items-center justify-between hover:bg-gray-50/60 dark:hover:bg-slate-800/40 px-3 rounded-2xl cursor-pointer transition"
              >
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-base hover:text-blue-600 dark:hover:text-blue-400">
                    {p.title || "Untitled"}
                  </h4>
                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                    quicktrfr/{p.slug}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {p.view_count}
                  </span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
