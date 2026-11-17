import React, { useState } from "react";
import {
  Globe,
  Lock,
  Clock,
  Tag,
  Eye,
  MessageSquare,
  Sparkles,
  X,
  Flame,
  CheckCircle2,
  ShieldAlert
} from "lucide-react";

interface PublishOptions {
  customSlug: string;
  password: string;
  expiration: string;
  burnAfterReading: boolean;
  visibility: "public" | "unlisted" | "private";
  tags: string[];
  showViewCount: boolean;
  allowComments: boolean;
}

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (options: PublishOptions) => Promise<void>;
  loading: boolean;
  isLoggedIn: boolean;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  loading,
  isLoggedIn
}) => {
  const [customSlug, setCustomSlug] = useState("");
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [expiration, setExpiration] = useState("never");
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [showViewCount, setShowViewCount] = useState(true);
  const [allowComments, setAllowComments] = useState(true);

  if (!isOpen) return null;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const clean = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (clean && !tags.includes(clean)) {
        setTags([...tags, clean]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPublish({
      customSlug: customSlug.trim(),
      password: enablePassword ? password.trim() : "",
      expiration: burnAfterReading ? "never" : expiration,
      burnAfterReading,
      visibility,
      tags,
      showViewCount,
      allowComments
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 my-8 text-left">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close publish settings modal"
          className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-1 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Publish Settings</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-6">
          Publish Your Paste
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Custom Slug Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Custom URL (Optional)
            </label>
            <div className="flex items-center rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 px-3 py-2 text-sm focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600">
              <span className="text-gray-400 font-mono text-xs select-none">quicktrfr/</span>
              <input
                type="text"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="my-custom-note"
                className="w-full bg-transparent outline-none font-mono text-sm text-gray-900 dark:text-white pl-1"
              />
            </div>
          </div>

          {/* Password Protection */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  Password Protection (AES-256-GCM)
                </span>
              </div>
              <input
                type="checkbox"
                checked={enablePassword}
                onChange={(e) => setEnablePassword(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500 cursor-pointer"
              />
            </div>
            {enablePassword && (
              <div className="mt-3">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secret decryption passphrase"
                  required={enablePassword}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:border-blue-600"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  Readers must enter this passphrase to decrypt and read your note.
                </p>
              </div>
            )}
          </div>

          {/* Expiration & Burn After Reading */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Expiration & Retention
            </label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="col-span-2 sm:col-span-1">
                <select
                  disabled={burnAfterReading}
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-200 outline-none focus:border-blue-600 disabled:opacity-50"
                >
                  <option value="never">Never (Permanent)</option>
                  <option value="10m">10 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="1d">1 Day</option>
                  <option value="1w">1 Week</option>
                  <option value="1mo">1 Month</option>
                </select>
              </div>

              {/* Burn After Reading Toggle */}
              <label className="col-span-2 sm:col-span-1 flex items-center gap-2 p-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                <input
                  type="checkbox"
                  checked={burnAfterReading}
                  onChange={(e) => setBurnAfterReading(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded-sm focus:ring-red-500 cursor-pointer"
                />
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                  <Flame className="w-3.5 h-3.5 fill-red-500" />
                  <span>Burn after reading</span>
                </div>
              </label>
            </div>
            {burnAfterReading && (
              <p className="text-[11px] text-red-500 font-medium">
                Note will be permanently destroyed right after the first person reads it!
              </p>
            )}
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Visibility
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "public", label: "Public", desc: "Searchable" },
                { id: "unlisted", label: "Unlisted", desc: "Link only" },
                { id: "private", label: "Private", desc: "Only you", disabled: !isLoggedIn },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => setVisibility(opt.id as any)}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                    visibility === opt.id
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold"
                      : "border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                  } ${opt.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className="text-xs font-bold">{opt.label}</span>
                  <span className="text-[10px] opacity-75">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Tags (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium"
                >
                  #{t}
                  <button type="button" onClick={() => handleRemoveTag(idx)} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Type tag & press Enter (e.g. notes, work, guide)"
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-600"
            />
          </div>

          {/* Toggles */}
          <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-2.5 text-xs text-gray-700 dark:text-gray-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showViewCount}
                onChange={(e) => setShowViewCount(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
              />
              <span>Display public view counter on this note</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
              />
              <span>Allow readers to leave comments</span>
            </label>
          </div>

          {/* Publish CTA */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Publish Note</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
