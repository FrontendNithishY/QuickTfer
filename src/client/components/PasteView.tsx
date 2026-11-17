import React, { useState, useEffect } from "react";
import { Paste, Comment, QuickShareData } from "../types.js";
import { getEditToken } from "../utils/storage.js";
import {
  Zap,
  Lock,
  Copy,
  Check,
  Download,
  Share2,
  Printer,
  GitFork,
  Edit3,
  Trash2,
  Eye,
  Clock,
  Calendar,
  User as UserIcon,
  MessageSquare,
  Send,
  FileText,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { InteractiveCodeViewer } from "./InteractiveCodeViewer.js";

interface PasteViewProps {
  slug: string;
  onFork: (title: string, content: string) => void;
  onEdit: (slug: string, title: string, content: string) => void;
  onOpenQuickShare: (data: QuickShareData) => void;
  onDeleteSuccess: () => void;
  onNavigateProfile: (username: string) => void;
}

export const PasteView: React.FC<PasteViewProps> = ({
  slug,
  onFork,
  onEdit,
  onOpenQuickShare,
  onDeleteSuccess,
  onNavigateProfile,
}) => {
  const [paste, setPaste] = useState<Paste | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadMenu, setDownloadMenu] = useState(false);

  // Fetch paste
  useEffect(() => {
    fetchPaste();
    fetchComments();
  }, [slug]);

  const fetchPaste = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pastes/${slug}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load paste.");
      }
      setPaste(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/pastes/${slug}/comments`);
      const data = await res.json();
      if (res.ok) setComments(data.comments || []);
    } catch {
      // Ignored
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setUnlocking(true);
    setUnlockError(null);

    try {
      const res = await fetch(`/api/pastes/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unlock failed.");

      setPaste((prev) => prev ? { ...prev, content: data.content, isEncrypted: false } : null);
    } catch (err: any) {
      setUnlockError(err.message);
    } finally {
      setUnlocking(false);
    }
  };

  const handleQuickShare = async () => {
    try {
      const res = await fetch(`/api/pastes/${slug}/quick-share`, { method: "POST" });
      const data = await res.json();
      if (res.ok) onOpenQuickShare(data);
    } catch {
      alert("Failed to create quick share.");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this note?")) return;
    const token = getEditToken(slug);

    try {
      const res = await fetch(`/api/pastes/${slug}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-edit-token": token || "",
        },
        body: JSON.stringify({ editToken: token }),
      });
      if (res.ok) {
        alert("Paste deleted successfully.");
        onDeleteSuccess();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete paste.");
      }
    } catch {
      alert("Delete failed.");
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);

    try {
      const res = await fetch(`/api/pastes/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: commentName.trim(),
          content: commentText.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments([...comments, data]);
        setCommentText("");
      } else {
        alert(data.error || "Failed to post comment.");
      }
    } catch {
      alert("Error posting comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Download exports
  const downloadTxt = () => {
    if (!paste || !paste.content) return;
    const text = paste.content.replace(/<br\s*[\/]?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${paste.slug}.txt`;
    a.click();
    setDownloadMenu(false);
  };

  const downloadHtml = () => {
    if (!paste || !paste.content) return;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${paste.title}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;}</style></head><body><h1>${paste.title}</h1>${paste.content}</body></html>`;
    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${paste.slug}.html`;
    a.click();
    setDownloadMenu(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !paste) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Note Not Available</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error || "This note was not found or has expired."}</p>
        <button
          onClick={() => window.location.href = "/"}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md"
        >
          Create a New Note
        </button>
      </div>
    );
  }

  const hasEditAccess = !!getEditToken(slug);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex-1 flex flex-col w-full">
      {/* Container Box */}
      <div className="paste-container bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-200/80 dark:border-slate-800 p-6 sm:p-10 mb-8 transition-colors">
        
        {/* Header Metadata */}
        <div className="border-b border-gray-100 dark:border-slate-800 pb-6 mb-6">
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-4">
            {paste.title || "Untitled"}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            {/* Author */}
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-4 h-4 text-blue-600" />
              {paste.authorName !== "Anonymous" ? (
                <button
                  onClick={() => onNavigateProfile(paste.authorName)}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  @{paste.authorName}
                </button>
              ) : (
                <span>Anonymous</span>
              )}
            </div>

            {/* Created At */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{new Date(paste.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
            </div>

            {/* View Count */}
            {paste.viewCount !== null && (
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span>{paste.viewCount} views</span>
              </div>
            )}

            {/* Burn Notice */}
            {paste.burnAfterReading && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold text-[10px]">
                Burn After Reading
              </span>
            )}
          </div>

          {/* Tags */}
          {paste.tags && paste.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {paste.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-semibold"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Toolbar */}
        <div className="action-toolbar flex flex-wrap items-center justify-between gap-2 py-3 px-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-800 mb-8 text-xs select-none">
          <div className="flex flex-wrap items-center gap-2">
            {/* 60-Minute Quick Share Trigger */}
            <button
              onClick={handleQuickShare}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Quick Share (60m)</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 font-bold flex items-center gap-1.5 transition"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
            </button>

            {/* Download Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDownloadMenu(!downloadMenu)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 font-bold flex items-center gap-1 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {downloadMenu && (
                <div className="absolute left-0 mt-2 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-1 z-50">
                  <button
                    onClick={() => { window.print(); setDownloadMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-500" />
                    Save as PDF / Print
                  </button>
                  <button
                    onClick={downloadTxt}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    Plain Text (.txt)
                  </button>
                  <button
                    onClick={downloadHtml}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-purple-500" />
                    Full Web Page (.html)
                  </button>
                </div>
              )}
            </div>

            {/* Raw Link */}
            <a
              href={`/raw/${paste.slug}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 font-bold flex items-center gap-1.5 transition"
            >
              Raw
            </a>

            {/* Fork */}
            <button
              onClick={() => onFork(paste.title, paste.content || "")}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 font-bold flex items-center gap-1.5 transition"
              title="Duplicate note into editor"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Fork</span>
            </button>
          </div>

          {/* Edit / Delete if author */}
          {hasEditAccess && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(paste.slug, paste.title, paste.content || "")}
                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold flex items-center gap-1 hover:bg-red-100 dark:hover:bg-red-900 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Area or Password Locked State */}
        {paste.isEncrypted ? (
          <div className="py-12 px-4 max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Password Protected Note</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              This note is encrypted using AES-256-GCM. Please enter the passphrase to decrypt and read it.
            </p>

            {unlockError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 text-xs font-semibold">
                {unlockError}
              </div>
            )}

            <form onSubmit={handleUnlock} className="flex flex-col gap-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-600 text-sm"
              />
              <button
                type="submit"
                disabled={unlocking || !password}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
              >
                {unlocking ? "Decrypting..." : "Unlock Note"}
              </button>
            </form>
          </div>
        ) : (() => {
          const isInteractiveCode = paste.content?.includes("SHAREPASTE_INTERACTIVE_CODE_V1");
          if (isInteractiveCode) {
            try {
              const jsonStr = (paste.content || "")
                .replace(/^[\s\S]*?<!-- SHAREPASTE_INTERACTIVE_CODE_V1 -->\s*/, "")
                .trim();
              const payload = JSON.parse(jsonStr);
              return (
                <InteractiveCodeViewer
                  initialCode={payload.code || ""}
                  language={payload.lang || "Code"}
                  title={paste.title}
                  initialOutput={payload.output}
                  onFork={() => onFork(paste.title, paste.content || "")}
                  onShare={handleQuickShare}
                />
              );
            } catch (err) {
              console.error("Code parse error:", err);
            }
          }
          return (
            <div
              dangerouslySetInnerHTML={{ __html: paste.content || "" }}
              className="paste-content min-h-[250px]"
            />
          );
        })()}
      </div>

      {/* Comments Section */}
      {paste.allowComments && !paste.isEncrypted && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-200/80 dark:border-slate-800 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Comments ({comments.length})
            </h3>
          </div>

          {/* Comment Form */}
          <form onSubmit={handlePostComment} className="mb-8 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/80">
            <div className="mb-3">
              <input
                type="text"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                placeholder="Your name (optional, defaults to Anonymous)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-blue-600"
              />
            </div>
            <div className="mb-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-blue-600 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingComment ? "Posting..." : "Post Comment"}</span>
            </button>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-gray-900 dark:text-white">{c.author_name}</span>
                    <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
