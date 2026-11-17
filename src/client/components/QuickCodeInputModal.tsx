import React, { useState } from "react";
import { Zap, X, ArrowRight, Clock, AlertCircle } from "lucide-react";

interface QuickCodeInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolveSuccess: (slug: string) => void;
}

export const QuickCodeInputModal: React.FC<QuickCodeInputModalProps> = ({
  isOpen,
  onClose,
  onResolveSuccess,
}) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFormatCode = (input: string) => {
    // Only allow numbers and max 6 digits
    const cleaned = input.replace(/\D/g, "").slice(0, 6);
    setCode(cleaned);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Please enter a valid 6-digit quick code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/quick-share/${code}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resolve quick code.");
      }

      onClose();
      onResolveSuccess(data.slug);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 p-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Zap className="w-6 h-6 fill-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Quick Code Access
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Valid for 60 minutes anywhere
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Enter the 6-digit code shared with you to instantly open and read the paste without searching or typing long URLs.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Enter 6-Digit Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              value={code}
              onChange={(e) => handleFormatCode(e.target.value)}
              placeholder="e.g. 482915"
              className="w-full text-center text-3xl font-mono tracking-widest font-extrabold px-4 py-3 bg-gray-50 dark:bg-slate-800/80 border-2 border-gray-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 rounded-xl outline-none transition text-gray-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/20"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Open Paste</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
