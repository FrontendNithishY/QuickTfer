import React, { useEffect } from "react";
import { FileQuestion, ArrowLeft, PlusCircle, KeyRound, Flame, Lock, Clock, Sigma } from "lucide-react";
import { updateSEO } from "../utils/seo.js";

interface NotFoundProps {
  onNavigateHome: () => void;
  onOpenQuickCode: () => void;
  onNavigateLanding: (route: string) => void;
}

export const NotFoundPage: React.FC<NotFoundProps> = ({
  onNavigateHome,
  onOpenQuickCode,
  onNavigateLanding
}) => {
  useEffect(() => {
    updateSEO({
      title: "404 - Note or Page Not Found | QuickTrfr",
      description: "The note or page you are looking for does not exist, has expired, or was permanently burned after reading.",
      canonicalPath: "/404"
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center flex-1 flex flex-col items-center justify-center">
      <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/10">
        <FileQuestion className="w-10 h-10" />
      </div>

      <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
        HTTP 404 · Not Found
      </span>

      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
        Note or Page Not Available
      </h1>

      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto mb-8">
        This document may have reached its expiration timer, been destroyed by a single-view burn-after-reading setting, or the URL address was mistyped.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
        <button
          onClick={onNavigateHome}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Note
        </button>
        <button
          onClick={onOpenQuickCode}
          className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition flex items-center gap-2"
        >
          <KeyRound className="w-4 h-4 text-amber-500" />
          Enter 6-Digit PIN
        </button>
      </div>

      {/* Quick Discovery Links */}
      <div className="w-full pt-8 border-t border-slate-200 dark:border-slate-800/80">
        <p className="text-xs font-semibold text-slate-500 mb-4">Or explore QuickTrfr tools:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <a
            href="/burn-after-reading"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding("/burn-after-reading");
            }}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex flex-col items-center gap-1.5"
          >
            <Flame className="w-4 h-4 text-red-500" />
            <span>Burn Note</span>
          </a>
          <a
            href="/encrypted-paste"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding("/encrypted-paste");
            }}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex flex-col items-center gap-1.5"
          >
            <Lock className="w-4 h-4 text-blue-500" />
            <span>AES Encrypt</span>
          </a>
          <a
            href="/quick-code"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding("/quick-code");
            }}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex flex-col items-center gap-1.5"
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>PIN Transfer</span>
          </a>
          <a
            href="/math-notes"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding("/math-notes");
            }}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex flex-col items-center gap-1.5"
          >
            <Sigma className="w-4 h-4 text-purple-500" />
            <span>KaTeX Math</span>
          </a>
        </div>
      </div>
    </div>
  );
};
