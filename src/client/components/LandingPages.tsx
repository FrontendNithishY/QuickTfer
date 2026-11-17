import React from "react";
import { Flame, Lock, QrCode, Sigma, ArrowRight, ShieldCheck, Clock, Zap, CheckCircle2, ChevronRight } from "lucide-react";

interface LandingPageProps {
  onStartAction: (preset?: "burn" | "encrypt" | "quick" | "math") => void;
  onOpenQuickCode: () => void;
}

export const BurnAfterReadingPage: React.FC<LandingPageProps> = ({ onStartAction }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex-1">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 text-xs font-bold mb-4">
          <Flame className="w-4 h-4" />
          Single-View Self Destruction
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          Burn After Reading Notes & One-Time Secret Links
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          Share passwords, API credentials, and private messages with complete peace of mind. Notes permanently self-destruct from server memory and storage immediately after the first read.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onStartAction("burn")}
            className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-red-600/30 transition flex items-center gap-2"
          >
            Create Self-Destructing Note
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mb-4">
            <Flame className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">Zero Residue</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The instant a recipient loads your link, the record is immediately purged from the database. Refreshes show a 404 self-destruction notice.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">Optional Password Lock</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Combine burn-after-reading with AES-256-GCM encryption for true two-factor confidential transmission.
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">No Account Required</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Generate and dispatch single-use secret notes anonymously. No tracking cookies or email verification required.
          </p>
        </div>
      </div>
    </div>
  );
};

export const EncryptedPastePage: React.FC<LandingPageProps> = ({ onStartAction }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex-1">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 text-xs font-bold mb-4">
          <Lock className="w-4 h-4" />
          Zero-Knowledge Client-Side Cryptography
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          Zero-Knowledge Encrypted Pastebin
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          Military-grade AES-256-GCM encryption with PBKDF2 key derivation. Your text is encrypted before being stored, ensuring not even server operators can inspect your confidential documents.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onStartAction("encrypt")}
            className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
          >
            Create Encrypted Paste
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Security Architecture */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-12">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">How QuickTrfr Cryptography Works</h2>
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p><strong>PBKDF2 Key Derivation:</strong> Your passphrase is salted with 16 cryptographically random bytes and stretched over 100,000 iterations.</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p><strong>AES-256-GCM Authentication:</strong> Data integrity is enforced using a 128-bit authentication tag preventing unauthorized tampering.</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p><strong>Zero Plaintext Retention:</strong> Server databases hold only ciphertext chunks; without your password, decryption is mathematically impossible.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const QuickCodePage: React.FC<LandingPageProps> = ({ onStartAction, onOpenQuickCode }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex-1">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-xs font-bold mb-4">
          <Clock className="w-4 h-4" />
          60-Minute Cross-Device PIN Transfer
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          Transfer Text Between PC & Mobile with 6-Digit PIN
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          Send links, snippets, code, and documents between your computer and smartphone in seconds. No bluetooth pairing, no accounts, and no cables.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onStartAction("quick")}
            className="px-6 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-amber-600/30 transition flex items-center gap-2"
          >
            Create Note to Transfer
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenQuickCode}
            className="px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm sm:text-base transition"
          >
            Enter 6-Digit Code
          </button>
        </div>
      </div>

      {/* 3 Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 font-black flex items-center justify-center mx-auto mb-3">1</div>
          <h2 className="font-bold text-slate-900 dark:text-white mb-1">Paste Your Text</h2>
          <p className="text-xs text-slate-500">Draft your text, code, or link on any device.</p>
        </div>
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 font-black flex items-center justify-center mx-auto mb-3">2</div>
          <h2 className="font-bold text-slate-900 dark:text-white mb-1">Get 6-Digit PIN & QR</h2>
          <p className="text-xs text-slate-500">A 60-minute temporary PIN and scannable QR are generated.</p>
        </div>
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 font-black flex items-center justify-center mx-auto mb-3">3</div>
          <h2 className="font-bold text-slate-900 dark:text-white mb-1">Receive Instantly</h2>
          <p className="text-xs text-slate-500">Type the 6-digit PIN on mobile or scan the QR code to open.</p>
        </div>
      </div>
    </div>
  );
};

export const MathNotesPage: React.FC<LandingPageProps> = ({ onStartAction }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex-1">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 text-xs font-bold mb-4">
          <Sigma className="w-4 h-4" />
          KaTeX & LaTeX Equation Engine
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          Publish Math Proofs & KaTeX Notes Online
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          The pastebin built for STEM researchers, students, and mathematicians. Write rich text with seamless inline math formula formatting, symbols, and PDF export.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onStartAction("math")}
            className="px-6 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
          >
            Create Math Note
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Sample Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-purple-600 mb-2">Live Equation Rendering</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">QuickTrfr embeds KaTeX for lightning-fast rendering of complex mathematical notation:</p>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 font-mono text-xs text-slate-700 dark:text-slate-300 overflow-x-auto">
          {"f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x} \\,d\\xi"}
        </div>
      </div>
    </div>
  );
};
