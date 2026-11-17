import React from "react";
import { X, Shield, Lock, Clock, Sparkles, CheckCircle2 } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              About Quick<span className="text-blue-600">Trfr</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Independent text publishing & transfer suite</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
          <p>
            <strong>QuickTrfr</strong> is a high-speed, modern text publishing and transfer platform built from the ground up for simplicity, privacy, and frictionless sharing across all devices.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white mb-1">
                <Clock className="w-4 h-4 text-amber-500" />
                60-Min Quick Code
              </div>
              <p className="text-[11px] text-gray-500">Pair any device in seconds using temporary 6-digit codes and QR tokens without accounts.</p>
            </div>
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white mb-1">
                <Lock className="w-4 h-4 text-blue-500" />
                AES-256-GCM
              </div>
              <p className="text-[11px] text-gray-500">Military-grade cryptographic encryption with PBKDF2 key derivation for private notes.</p>
            </div>
          </div>
          <p className="pt-2 text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} QuickTrfr. Proprietary independent architecture engineered for speed and privacy.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export const TermsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-800 p-6 sm:p-8 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              Terms of Service & Privacy
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Legal protections and copyright policy</p>
          </div>
        </div>

        <div className="overflow-y-auto space-y-4 text-xs text-gray-600 dark:text-gray-300 leading-relaxed pr-2 flex-1 my-2">
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">1. Ownership & Copyright</h4>
            <p>
              You retain 100% intellectual property rights and full copyright over all text, documents, code, and media that you create or publish using QuickTrfr. QuickTrfr does not claim any ownership over user-submitted content.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">2. Privacy & Data Handling</h4>
            <p>
              We believe in minimal data footprint. Notes marked with expiration timers or burn-after-reading are automatically and permanently purged from server memory and storage upon expiration or access. We do not sell or monetize personal user data.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">3. Acceptable Use Policy</h4>
            <p>
              Users agree not to use QuickTrfr for distributing malicious software, phishing schemes, illegal material, or unauthorized proprietary content infringing on third-party intellectual property.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-1">4. Disclaimer of Warranty</h4>
            <p>
              The platform is provided "as is" without warranties of any kind. Service is operated independently by QuickTrfr.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
