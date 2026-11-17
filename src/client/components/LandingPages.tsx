import React, { useState, useEffect } from "react";
import {
  Flame,
  Lock,
  Clock,
  Sigma,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Copy,
  Check,
  Zap,
  Globe,
  Share2,
  FileText
} from "lucide-react";
import { updateSEO, FAQItem, BreadcrumbItem } from "../utils/seo.js";

interface LandingPageProps {
  onStartAction: (preset?: "burn" | "encrypt" | "quick" | "math") => void;
  onOpenQuickCode: () => void;
  onNavigateLanding?: (route: string) => void;
}

// Reusable Breadcrumb UI Component
const Breadcrumbs: React.FC<{ items: BreadcrumbItem[]; onNavigate?: (url: string) => void }> = ({ items, onNavigate }) => {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-8 select-none">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.url + index}>
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            {isLast ? (
              <span className="font-semibold text-slate-800 dark:text-slate-200" aria-current="page">
                {item.name}
              </span>
            ) : (
              <a
                href={item.url}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate?.(item.url);
                }}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                {item.name}
              </a>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// Reusable FAQ Accordion UI Component
const FAQAccordion: React.FC<{ faqs: FAQItem[] }> = ({ faqs }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {faqs.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition shadow-xs"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="w-full py-4 px-5 text-left font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between gap-4"
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                {faq.question}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// 1. BURN AFTER READING LANDING PAGE
export const BurnAfterReadingPage: React.FC<LandingPageProps> = ({ onStartAction, onNavigateLanding }) => {
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", url: "/" },
    { name: "Solutions", url: "/burn-after-reading" },
    { name: "Burn After Reading Notes", url: "/burn-after-reading" }
  ];

  const faqs: FAQItem[] = [
    {
      question: "What is a burn-after-reading note?",
      answer: "A burn-after-reading note is a self-destructing text document with a single-use URL. The moment the recipient opens and views the link, the server permanently purges the content from database memory. Any refresh or subsequent visit results in a 404 message."
    },
    {
      question: "Can destroyed burn-after-reading notes be recovered?",
      answer: "No. Destruction is atomic and irreversible. The note text, encryption metadata, and token are permanently deleted from database rows immediately upon the first view."
    },
    {
      question: "Can I combine burn-after-reading with a password?",
      answer: "Yes! QuickTrfr allows you to enable both 'Burn After Reading' and password protection. The recipient must enter the password to view and burn the note."
    },
    {
      question: "Are burn-after-reading notes logged or tracked?",
      answer: "QuickTrfr operates with zero tracking logs. We do not track reader IP addresses, store browser fingerprints, or retain deleted records."
    },
    {
      question: "What happens if a burn-after-reading note is never opened?",
      answer: "Unopened notes follow your chosen expiration schedule (e.g. 10 minutes, 1 hour, or 1 day) and are automatically deleted upon expiration."
    }
  ];

  useEffect(() => {
    updateSEO({
      title: "Burn After Reading Notes — One-Time Secret Links | QuickTrfr",
      description: "Send self-destructing text messages, passwords, and API credentials with zero server residue. Permanent automatic deletion immediately upon first read.",
      canonicalPath: "/burn-after-reading",
      breadcrumbs,
      faqs
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 flex-1">
      <Breadcrumbs items={breadcrumbs} onNavigate={onNavigateLanding} />

      {/* Hero Header */}
      <header className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 text-xs font-bold mb-4">
          <Flame className="w-4 h-4" />
          Single-View Self Destruction
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          Burn After Reading Notes & One-Time Secret Links
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          The safest way to dispatch credentials, secrets, and private links. Once opened by your recipient, the message vanishes forever.
        </p>
        <button
          onClick={() => onStartAction("burn")}
          className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-red-600/30 transition inline-flex items-center gap-2"
        >
          Create Self-Destructing Note
          <ArrowRight className="w-4 h-4" />
        </button>
      </header>

      {/* Technical Comparison Table */}
      <section className="mb-14">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 text-center">
          Security Comparison: QuickTrfr vs. Traditional Communication
        </h2>
        <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white uppercase font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Security Feature</th>
                <th className="px-5 py-3.5 text-blue-600 dark:text-blue-400">QuickTrfr Burn Note</th>
                <th className="px-5 py-3.5">Standard Email</th>
                <th className="px-5 py-3.5">Chat Apps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="px-5 py-3.5 font-semibold">Atomic First-Read Deletion</td>
                <td className="px-5 py-3.5 text-emerald-600 font-bold">✓ Immediate Purge</td>
                <td className="px-5 py-3.5 text-red-500">✗ Stays in Sent & Inbox</td>
                <td className="px-5 py-3.5 text-amber-500">~ Manual Deletion</td>
              </tr>
              <tr>
                <td className="px-5 py-3.5 font-semibold">Zero Server Storage After Read</td>
                <td className="px-5 py-3.5 text-emerald-600 font-bold">✓ 100% Vanished</td>
                <td className="px-5 py-3.5 text-red-500">✗ Retained on Servers</td>
                <td className="px-5 py-3.5 text-amber-500">~ Cloud Backups</td>
              </tr>
              <tr>
                <td className="px-5 py-3.5 font-semibold">Anonymous (No Sign-Up)</td>
                <td className="px-5 py-3.5 text-emerald-600 font-bold">✓ 100% Anonymous</td>
                <td className="px-5 py-3.5 text-red-500">✗ Email Account Required</td>
                <td className="px-5 py-3.5 text-red-500">✗ Phone Number Required</td>
              </tr>
              <tr>
                <td className="px-5 py-3.5 font-semibold">AES-256-GCM Password Option</td>
                <td className="px-5 py-3.5 text-emerald-600 font-bold">✓ Client-Side Salted</td>
                <td className="px-5 py-3.5 text-red-500">✗ Plaintext Transmission</td>
                <td className="px-5 py-3.5 text-amber-500">~ Platform Encryption</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQs */}
      <section className="mb-14">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">
          Frequently Asked Questions
        </h2>
        <FAQAccordion faqs={faqs} />
      </section>

      {/* Internal Solution Linking */}
      <section className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Explore Related Privacy Solutions</p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
          <a
            href="/encrypted-paste"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding?.("/encrypted-paste");
            }}
            className="text-blue-600 hover:underline"
          >
            Zero-Knowledge Encrypted Pastebin →
          </a>
          <a
            href="/quick-code"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding?.("/quick-code");
            }}
            className="text-blue-600 hover:underline"
          >
            6-Digit PIN Cross-Device Transfer →
          </a>
          <a
            href="/math-notes"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding?.("/math-notes");
            }}
            className="text-blue-600 hover:underline"
          >
            LaTeX Math & KaTeX Proof Notes →
          </a>
        </div>
      </section>
    </div>
  );
};

// 2. ENCRYPTED PASTEBIN LANDING PAGE
export const EncryptedPastePage: React.FC<LandingPageProps> = ({ onStartAction, onNavigateLanding }) => {
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", url: "/" },
    { name: "Solutions", url: "/encrypted-paste" },
    { name: "Zero-Knowledge Encrypted Pastebin", url: "/encrypted-paste" }
  ];

  const faqs: FAQItem[] = [
    {
      question: "What does Zero-Knowledge encryption mean?",
      answer: "Zero-Knowledge means that only you and your intended recipients hold the cryptographic keys to decrypt the content. The server never sees your plaintext password and cannot view the decrypted data."
    },
    {
      question: "Which cryptographic algorithm does QuickTrfr use?",
      answer: "QuickTrfr uses authenticated AES-256-GCM (Galois/Counter Mode) with 100,000 rounds of PBKDF2 key derivation and a unique 16-byte cryptographically secure random salt per document."
    },
    {
      question: "Can QuickTrfr administrators decrypt my notes?",
      answer: "No. Because the cryptographic key derivation and cipher authentication are computed with your custom passphrase, nobody—including QuickTrfr engineers—can decrypt your note without your password."
    },
    {
      question: "What happens if I forget my password?",
      answer: "Because we employ genuine zero-knowledge cryptography and do not store plain passwords or backdoors, encrypted notes cannot be recovered if the passphrase is lost."
    },
    {
      question: "Is there a limit to how long encrypted notes can stay online?",
      answer: "You choose your note's lifetime: 10 minutes, 1 hour, 1 day, 1 week, 1 month, or indefinite (never expires)."
    }
  ];

  useEffect(() => {
    updateSEO({
      title: "Zero-Knowledge Encrypted Pastebin — Client-Side AES-256-GCM | QuickTrfr",
      description: "Free, zero-knowledge encrypted pastebin. Protect confidential code and text with client-side AES-256-GCM encryption and PBKDF2 key derivation.",
      canonicalPath: "/encrypted-paste",
      breadcrumbs,
      faqs
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 flex-1">
      <Breadcrumbs items={breadcrumbs} onNavigate={onNavigateLanding} />

      <header className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 text-xs font-bold mb-4">
          <Lock className="w-4 h-4" />
          Zero-Knowledge Client-Side Cryptography
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          Zero-Knowledge Encrypted Pastebin
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          Protect source code, API tokens, and confidential notes from surveillance. Authenticated AES-256-GCM encryption ensures your content is impenetrable without the key.
        </p>
        <button
          onClick={() => onStartAction("encrypt")}
          className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/30 transition inline-flex items-center gap-2"
        >
          Create Encrypted Paste
          <ArrowRight className="w-4 h-4" />
        </button>
      </header>

      {/* Cryptographic Architecture */}
      <section className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-14">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Cryptographic Specifications</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1.5">PBKDF2 Key Derivation</h3>
            <p className="leading-relaxed">Your passphrase is strengthened over 100,000 hashing rounds with SHA-256 and unique 16-byte random salts to defeat rainbow tables.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1.5">AES-256-GCM Cipher</h3>
            <p className="leading-relaxed">Military-grade symmetric encryption featuring Galois/Counter Mode authentication preventing tampering or bit-flipping attacks.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1.5">128-bit Auth Tag</h3>
            <p className="leading-relaxed">Every document payload includes a 128-bit cryptographic authentication tag verifying message integrity prior to decryption.</p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="mb-14">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">
          Frequently Asked Questions
        </h2>
        <FAQAccordion faqs={faqs} />
      </section>

      {/* Internal Navigation */}
      <section className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Explore Related Tools</p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
          <a
            href="/burn-after-reading"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding?.("/burn-after-reading");
            }}
            className="text-blue-600 hover:underline"
          >
            Self-Destructing Notes →
          </a>
          <a
            href="/quick-code"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding?.("/quick-code");
            }}
            className="text-blue-600 hover:underline"
          >
            6-Digit PIN Cross-Device Transfer →
          </a>
          <a
            href="/math-notes"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding?.("/math-notes");
            }}
            className="text-blue-600 hover:underline"
          >
            LaTeX Math & KaTeX Proof Notes →
          </a>
        </div>
      </section>
    </div>
  );
};

// 3. QUICK CODE / PIN TRANSFER LANDING PAGE
export const QuickCodePage: React.FC<LandingPageProps> = ({ onStartAction, onOpenQuickCode, onNavigateLanding }) => {
  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", url: "/" },
    { name: "Solutions", url: "/quick-code" },
    { name: "6-Digit PIN & QR Transfer", url: "/quick-code" }
  ];

  const faqs: FAQItem[] = [
    {
      question: "How does the 6-digit PIN transfer work?",
      answer: "When you publish or share a note with Quick Share, QuickTrfr generates a temporary 6-digit access code (e.g. 592 108) and a scannable QR code. On your other device, simply enter the 6 digits or scan the QR code to open the note immediately."
    },
    {
      question: "Why does the pairing code last for 60 minutes?",
      answer: "The 60-minute time-to-live (TTL) window provides ample time to transfer your text or links while guaranteeing that temporary sharing codes automatically expire and do not clutter your security footprint."
    },
    {
      question: "Do I need Bluetooth, cables, or an account?",
      answer: "None! QuickTrfr PIN transfer is 100% web-based. It functions across Mac, Windows, Linux, iOS, Android, and Chromebooks without app downloads or sign-ups."
    },
    {
      question: "Can I transfer images, tables, or formatted text?",
      answer: "Yes! QuickTrfr supports rich formatting, WYSIWYG headings, tables, embedded images, code snippets, and LaTeX equations."
    },
    {
      question: "Is Quick Code transfer free?",
      answer: "Yes, QuickTrfr 60-minute quick codes and QR transfers are 100% free and open for public utility."
    }
  ];

  useEffect(() => {
    updateSEO({
      title: "Cross-Device PIN Transfer — Share Text with 6-Digit Code & QR | QuickTrfr",
      description: "Transfer text, links, and code between PC and mobile phone instantly with a temporary 6-digit PIN and QR code. Zero setup, 60-minute auto-expiry.",
      canonicalPath: "/quick-code",
      breadcrumbs,
      faqs
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 flex-1">
      <Breadcrumbs items={breadcrumbs} onNavigate={onNavigateLanding} />

      <header className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-xs font-bold mb-4">
          <Clock className="w-4 h-4" />
          60-Minute Cross-Device PIN Transfer
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          Transfer Text Between PC & Mobile with 6-Digit PIN
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          The fastest way to move URLs, code, and documents between your desktop and smartphone. No cables, no bluetooth, and no login required.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onStartAction("quick")}
            className="px-6 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-amber-600/30 transition inline-flex items-center gap-2"
          >
            Create Note to Transfer
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenQuickCode}
            className="px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm sm:text-base transition"
          >
            Enter 6-Digit PIN
          </button>
        </div>
      </header>

      {/* 3 Step Visual */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-14">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 font-black text-lg flex items-center justify-center mx-auto mb-4">1</div>
          <h2 className="font-bold text-slate-900 dark:text-white text-base mb-1">Paste or Write</h2>
          <p className="text-xs text-slate-500 leading-relaxed">Draft your note, code, or URL on your PC or laptop.</p>
        </div>
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 font-black text-lg flex items-center justify-center mx-auto mb-4">2</div>
          <h2 className="font-bold text-slate-900 dark:text-white text-base mb-1">Get 6-Digit Code</h2>
          <p className="text-xs text-slate-500 leading-relaxed">Receive an instant 60-minute temporary PIN and scannable QR code.</p>
        </div>
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 font-black text-lg flex items-center justify-center mx-auto mb-4">3</div>
          <h2 className="font-bold text-slate-900 dark:text-white text-base mb-1">Read on Mobile</h2>
          <p className="text-xs text-slate-500 leading-relaxed">Type the 6 digits or scan the QR code on your phone to open instantly.</p>
        </div>
      </section>

      {/* FAQs */}
      <section className="mb-14">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">
          Frequently Asked Questions
        </h2>
        <FAQAccordion faqs={faqs} />
      </section>

      {/* Internal Navigation */}
      <section className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Explore Related Tools</p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
          <a
            href="/burn-after-reading"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding?.("/burn-after-reading");
            }}
            className="text-blue-600 hover:underline"
          >
            Self-Destructing Notes →
          </a>
          <a
            href="/encrypted-paste"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding?.("/encrypted-paste");
            }}
            className="text-blue-600 hover:underline"
          >
            Zero-Knowledge Encrypted Pastebin →
          </a>
          <a
            href="/math-notes"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding?.("/math-notes");
            }}
            className="text-blue-600 hover:underline"
          >
            LaTeX Math & KaTeX Proof Notes →
          </a>
        </div>
      </section>
    </div>
  );
};

// 4. MATH NOTES / KATEX LANDING PAGE
export const MathNotesPage: React.FC<LandingPageProps> = ({ onStartAction, onNavigateLanding }) => {
  const [copied, setCopied] = useState(false);

  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", url: "/" },
    { name: "Solutions", url: "/math-notes" },
    { name: "LaTeX Math Notes & KaTeX", url: "/math-notes" }
  ];

  const faqs: FAQItem[] = [
    {
      question: "How do I format math formulas in QuickTrfr?",
      answer: "QuickTrfr supports standard LaTeX math delimiters. Wrap inline equations with single dollar signs like $E = mc^2$ or display formulas with double dollar signs like $$\\int f(x) dx$$."
    },
    {
      question: "Can I export math notes to PDF?",
      answer: "Yes! QuickTrfr includes an export-to-PDF button optimized for printing with high-resolution vector equation rendering."
    },
    {
      question: "Which LaTeX commands are supported?",
      answer: "QuickTrfr runs KaTeX, supporting virtually all standard AMS-LaTeX commands, matrices, calculus integrals, summation symbols, fractions, and Greek alphabets."
    },
    {
      question: "Can I mix rich text, images, and math?",
      answer: "Yes. The editor integrates WYSIWYG typography, tables, and image attachments alongside live LaTeX formulas."
    },
    {
      question: "Can I password-protect academic papers or exam questions?",
      answer: "Yes. QuickTrfr supports AES-256-GCM encryption on any math note to prevent unauthorized viewing."
    }
  ];

  useEffect(() => {
    updateSEO({
      title: "LaTeX & KaTeX Math Formula Sharing — STEM Markdown Pastebin | QuickTrfr",
      description: "Publish and share complex mathematical formulas, calculus equations, matrices, and LaTeX proofs with live KaTeX rendering and instant PDF export.",
      canonicalPath: "/math-notes",
      breadcrumbs,
      faqs
    });
  }, []);

  const copyFormula = () => {
    navigator.clipboard.writeText("f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x} \\,d\\xi");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 flex-1">
      <Breadcrumbs items={breadcrumbs} onNavigate={onNavigateLanding} />

      <header className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 text-xs font-bold mb-4">
          <Sigma className="w-4 h-4" />
          KaTeX & LaTeX Equation Engine
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          Publish Math Proofs & KaTeX Notes Online
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          The purpose-built pastebin for STEM students, researchers, and educators. Seamlessly compose, format, and share mathematical notation.
        </p>
        <button
          onClick={() => onStartAction("math")}
          className="px-6 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-purple-600/30 transition inline-flex items-center gap-2"
        >
          Create Math Note
          <ArrowRight className="w-4 h-4" />
        </button>
      </header>

      {/* Live Sample Card */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-14">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-purple-600">Sample Fourier Transform Formula</h2>
          <button
            onClick={copyFormula}
            className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-xs font-bold flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy LaTeX"}
          </button>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-300 overflow-x-auto">
          {"f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x} \\,d\\xi"}
        </div>
      </section>

      {/* FAQs */}
      <section className="mb-14">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">
          Frequently Asked Questions
        </h2>
        <FAQAccordion faqs={faqs} />
      </section>

      {/* Internal Navigation */}
      <section className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Explore Related Tools</p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
          <a
            href="/burn-after-reading"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding?.("/burn-after-reading");
            }}
            className="text-blue-600 hover:underline"
          >
            Self-Destructing Notes →
          </a>
          <a
            href="/encrypted-paste"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding?.("/encrypted-paste");
            }}
            className="text-blue-600 hover:underline"
          >
            Zero-Knowledge Encrypted Pastebin →
          </a>
          <a
            href="/quick-code"
            onClick={(e) => {
              e.preventDefault();
              onNavigateLanding?.("/quick-code");
            }}
            className="text-blue-600 hover:underline"
          >
            6-Digit PIN Cross-Device Transfer →
          </a>
        </div>
      </section>
    </div>
  );
};
