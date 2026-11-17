import React, { useState, useEffect } from "react";
import { QuickShareData } from "../types.js";
import {
  CheckCircle,
  Copy,
  Check,
  Zap,
  ExternalLink,
  QrCode,
  Key,
  Clock,
  Sparkles,
  Smartphone
} from "lucide-react";

interface PublishSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  title: string;
  editToken?: string;
  onViewPaste: (slug: string) => void;
  onCreateAnother: () => void;
}

export const PublishSuccessModal: React.FC<PublishSuccessModalProps> = ({
  isOpen,
  onClose,
  slug,
  title,
  editToken,
  onViewPaste,
  onCreateAnother,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [quickShare, setQuickShare] = useState<QuickShareData | null>(null);
  const [loadingQS, setLoadingQS] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(3600);

  const fullUrl = `${window.location.origin}/p/${slug}`;

  // Automatically fetch 60-minute quick-share code on publish success
  useEffect(() => {
    if (!isOpen || !slug) return;
    setLoadingQS(true);
    fetch(`/api/pastes/${slug}/quick-share`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        setQuickShare(data);
        setSecondsLeft(data.remainingSeconds || 3600);
      })
      .catch((err) => console.error("Quick share error:", err))
      .finally(() => setLoadingQS(false));
  }, [isOpen, slug]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`;

  const copyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    if (!quickShare) return;
    navigator.clipboard.writeText(quickShare.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyToken = () => {
    if (!editToken) return;
    navigator.clipboard.writeText(editToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 my-8 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner mb-4">
          <CheckCircle className="w-9 h-9" />
        </div>

        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">
          Your Note is Published!
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 truncate max-w-sm mx-auto">
          "{title || "Untitled"}"
        </p>

        {/* Shareable Link Box */}
        <div className="bg-gray-50 dark:bg-slate-800/80 rounded-2xl p-3 border border-gray-200 dark:border-slate-700 mb-6 flex items-center justify-between gap-2">
          <span className="text-sm font-mono text-blue-700 dark:text-blue-400 truncate pl-2 font-semibold select-all">
            {fullUrl}
          </span>
          <button
            onClick={copyLink}
            className="shrink-0 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Copied" : "Copy"}</span>
          </button>
        </div>

        {/* 60-MINUTE QUICK CODE & QR CARD */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800/80 border-2 border-amber-200/80 dark:border-amber-800/60 mb-6 text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-extrabold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4 fill-amber-500 text-amber-600" />
              <span>60-Minute Quick Share Code</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-900 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              <span>{timeFormatted}</span>
            </div>
          </div>

          {loadingQS ? (
            <div className="py-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : quickShare ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* QR Code */}
              <div className="p-2 bg-white rounded-xl shadow-xs border border-amber-100 shrink-0">
                <img
                  src={quickShare.qrCodeDataUrl}
                  alt="Scan QR"
                  className="w-24 h-24 object-contain"
                />
              </div>

              {/* Code Info */}
              <div className="flex-1 text-center sm:text-left">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mb-1">
                  Share this 6-digit code or QR code with anyone:
                </p>
                <div className="text-3xl font-mono font-black tracking-widest text-gray-900 dark:text-white mb-2">
                  {quickShare.code.slice(0, 3)} {quickShare.code.slice(3, 6)}
                </div>
                <button
                  onClick={copyCode}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs"
                >
                  {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? "Code Copied!" : "Copy Code"}</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Secret Edit Token Notice for Guests */}
        {editToken && (
          <div className="mb-6 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700/60 text-left flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 truncate">
              <Key className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="truncate">Saved secret key in browser to edit this note later.</span>
            </div>
            <button
              onClick={copyToken}
              className="shrink-0 text-blue-600 dark:text-blue-400 font-bold hover:underline ml-2"
            >
              {copiedToken ? "Copied" : "Copy Key"}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onViewPaste(slug)}
            className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-1.5"
          >
            <span>View Note</span>
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={onCreateAnother}
            className="py-3 px-4 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 font-bold text-sm transition"
          >
            Create Another
          </button>
        </div>
      </div>
    </div>
  );
};
