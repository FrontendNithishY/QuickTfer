import React, { useState, useEffect } from "react";
import { QuickShareData } from "../types.js";
import {
  Zap,
  X,
  Copy,
  Check,
  QrCode,
  Download,
  Clock,
  Share2,
  ExternalLink,
  Smartphone
} from "lucide-react";

interface QuickShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: QuickShareData | null;
}

export const QuickShareModal: React.FC<QuickShareModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(data?.remainingSeconds || 3600);

  useEffect(() => {
    if (!data) return;
    setSecondsLeft(data.remainingSeconds);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);

  if (!isOpen || !data) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`;
  const isExpired = secondsLeft <= 0;

  const copyCode = () => {
    navigator.clipboard.writeText(data.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(data.pasteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const downloadQR = () => {
    const link = document.createElement("a");
    link.href = data.qrCodeDataUrl;
    link.download = `sharepaste-qr-${data.code}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8 overflow-hidden text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-4">
          <Zap className="w-3.5 h-3.5 fill-amber-500" />
          <span>60-Minute Quick Share</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-1">
          Share Anywhere
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6">
          Access from any device using the 6-digit code or scan the QR code.
        </p>

        {/* Countdown Banner */}
        <div className={`mb-6 p-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition ${
          isExpired
            ? "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
            : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80"
        }`}>
          <Clock className="w-4 h-4" />
          <span>
            {isExpired ? "Quick code expired" : `Expires in: ${timeFormatted}`}
          </span>
        </div>

        {/* The 6-Digit Code Box */}
        <div className="bg-gray-50 dark:bg-slate-800/80 rounded-2xl p-5 border-2 border-dashed border-gray-200 dark:border-slate-700 mb-6">
          <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
            Quick Pairing Code
          </span>
          <div className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-blue-700 dark:text-blue-400 mb-3">
            {data.code.slice(0, 3)} {data.code.slice(3, 6)}
          </div>
          <button
            onClick={copyCode}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-800 dark:text-gray-200 text-xs font-bold shadow-xs border border-gray-200 dark:border-slate-600 transition"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copied Code!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy 6-Digit Code</span>
              </>
            )}
          </button>
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="p-3 bg-white rounded-2xl shadow-md border border-gray-100 mb-2">
            <img
              src={data.qrCodeDataUrl}
              alt="Scan QR code to open paste"
              className="w-44 h-44 object-contain"
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Scan with mobile camera to open instantly</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={copyLink}
            className="py-2.5 px-4 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? "Link Copied!" : "Copy Full Link"}</span>
          </button>
          <button
            onClick={downloadQR}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Save QR Image</span>
          </button>
        </div>
      </div>
    </div>
  );
};
