import React, { useState, useEffect } from "react";
import { User, QuickShareData, DuoSession } from "./types.js";
import { Navbar } from "./components/Navbar.js";

import { Editor } from "./components/Editor.js";
import { PublishModal } from "./components/PublishModal.js";
import { PublishSuccessModal } from "./components/PublishSuccessModal.js";
import { PasteView } from "./components/PasteView.js";
import { QuickCodeInputModal } from "./components/QuickCodeInputModal.js";
import { QuickShareModal } from "./components/QuickShareModal.js";
import { Dashboard } from "./components/Dashboard.js";
import { UserProfile } from "./components/UserProfile.js";
import { AuthModal } from "./components/AuthModal.js";
import { AboutModal, TermsModal } from "./components/LegalModals.js";
import { DuoPasteModal } from "./components/DuoPasteModal.js";
import { DuoPasteEditor } from "./components/DuoPasteEditor.js";
import {
  BurnAfterReadingPage,
  EncryptedPastePage,
  QuickCodePage,
  MathNotesPage,
} from "./components/LandingPages.js";
import { NotFoundPage } from "./components/NotFoundPage.js";
import { updateSEO } from "./utils/seo.js";
import { getAuthToken, removeAuthToken, saveEditToken } from "./utils/storage.js";

type RouteView =
  | "editor"
  | "duo"
  | "paste"
  | "dashboard"
  | "profile"
  | "burn-after-reading"
  | "encrypted-paste"
  | "quick-code"
  | "math-notes"
  | "404";


export const App: React.FC = () => {
  const [view, setView] = useState<RouteView>("editor");
  const [currentSlug, setCurrentSlug] = useState<string>("");
  const [profileUsername, setProfileUsername] = useState<string>("");
  const [forkDraft, setForkDraft] = useState<{ title: string; content: string } | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // Modals
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [draftPayload, setDraftPayload] = useState<{ title: string; content: string } | null>(null);

  const [successData, setSuccessData] = useState<{ slug: string; title: string; editToken?: string } | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const [isQuickCodeInputOpen, setIsQuickCodeInputOpen] = useState(false);
  const [quickShareData, setQuickShareData] = useState<QuickShareData | null>(null);
  const [isQuickShareOpen, setIsQuickShareOpen] = useState(false);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  // DuoPaste Live Collaboration
  const [isDuoModalOpen, setIsDuoModalOpen] = useState(false);
  const [duoModalTab, setDuoModalTab] = useState<"start" | "join">("start");
  const [activeDuoSession, setActiveDuoSession] = useState<DuoSession | null>(null);
  const [duoClientId, setDuoClientId] = useState<string>("");
  const [duoRole, setDuoRole] = useState<"host" | "guest">("host");
  const [editorInitialMode, setEditorInitialMode] = useState<"standard" | "word">("standard");


  // Sync theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Check user authentication
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
        else removeAuthToken();
      })
      .catch(() => removeAuthToken());
  }, []);

  // Simple client-side routing
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;

      if (path.startsWith("/p/")) {
        const slug = path.slice(3);
        setCurrentSlug(slug);
        setView("paste");
      } else if (path.startsWith("/quick/")) {
        const code = path.slice(7);
        // Direct resolution of 60-min quick code in URL
        fetch(`/api/quick-share/${code}`)
          .then(res => res.json())
          .then(data => {
            if (data.slug) {
              window.history.replaceState({}, "", `/p/${data.slug}`);
              setCurrentSlug(data.slug);
              setView("paste");
            } else {
              alert(data.error || "Invalid or expired quick code");
              setView("editor");
            }
          })
          .catch(() => setView("editor"));
      } else if (path.startsWith("/duo/")) {
        const pin = path.slice(5).trim();
        if (pin) {
          fetch("/api/duo/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin })
          })
            .then(res => res.json())
            .then(data => {
              if (data.session) {
                setActiveDuoSession(data.session);
                setDuoClientId(data.clientId);
                setDuoRole("guest");
                setView("duo");
              } else {
                alert(data.error || "DuoPaste session not found or expired.");
                setView("editor");
              }
            })
            .catch(() => setView("editor"));
        } else {
          setView("editor");
        }
      } else if (path.startsWith("/u/")) {
        const username = path.slice(3);
        setProfileUsername(username);
        setView("profile");

      } else if (path === "/dashboard") {
        setView("dashboard");
      } else if (path === "/burn-after-reading") {
        setView("burn-after-reading");
      } else if (path === "/encrypted-paste") {
        setView("encrypted-paste");
      } else if (path === "/quick-code") {
        setView("quick-code");
      } else if (path === "/math-notes") {
        setView("math-notes");
      } else if (path === "/word") {
        setEditorInitialMode("word");
        setView("editor");
        updateSEO({
          title: "Word Document Editor - SharePaste",
          description: "Live Microsoft Word document editor with full ribbon options, font styles, colors, tables, and .docx export.",
          canonicalPath: "/word"
        });
      } else if (path === "/" || path === "") {
        setView("editor");
        updateSEO({
          title: "SharePaste - Fast Paste, Transfer & 60-Minute Quick Sharing",
          description: "SharePaste is an independent, fast and secure text publishing and transfer platform. Create rich notes, encrypt with AES-256-GCM, and share instantly anywhere using 60-minute quick codes and QR codes.",
          canonicalPath: "/"
        });
      } else {
        setView("404");
      }
    };

    handleLocationChange();
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const navigateTo = (newView: RouteView, path: string) => {
    window.history.pushState({}, "", path);
    setView(newView);
    window.scrollTo(0, 0);

    if (newView === "paste" && path.startsWith("/p/")) {
      setCurrentSlug(path.slice(3));
    }

    if (newView === "editor") {
      updateSEO({
        title: "SharePaste - Fast Paste, Transfer & 60-Minute Quick Sharing",
        description: "SharePaste is an independent, fast and secure text publishing and transfer platform. Create rich notes, encrypt with AES-256-GCM, and share instantly anywhere using 60-minute quick codes and QR codes.",
        canonicalPath: "/"
      });
    }
  };


  const handleLandingAction = (preset?: "burn" | "encrypt" | "quick" | "math") => {
    if (preset === "math") {
      setForkDraft({
        title: "Calculus & KaTeX Proof Notes",
        content: "<h2>Mathematical Formulation</h2><p>Here is an inline proof: $e^{i\\pi} + 1 = 0$.</p><p>And a display formula:</p><p>$$f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x} \\,d\\xi$$</p>"
      });
    } else if (preset === "burn") {
      setForkDraft({
        title: "Confidential Self-Destructing Note",
        content: "<p>This note will permanently self-destruct after its first read. Enter your private password or token here.</p>"
      });
    } else if (preset === "encrypt") {
      setForkDraft({
        title: "Encrypted Secure Note",
        content: "<p>This note is protected with client-side AES-256-GCM encryption.</p>"
      });
    }
    navigateTo("editor", "/");
    if (preset === "quick") {
      setIsQuickCodeInputOpen(true);
    }
  };

  const handleOpenPublish = (title: string, content: string) => {
    setDraftPayload({ title, content });
    setIsPublishOpen(true);
  };

  const handlePublishSubmit = async (options: any) => {
    if (!draftPayload) return;
    setPublishLoading(true);

    const token = getAuthToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch("/api/pastes", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: draftPayload.title,
          content: draftPayload.content,
          ...options,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish paste.");
      }

      if (data.editToken) {
        saveEditToken(data.slug, data.editToken);
      }

      // Cache paste to avoid any serverless cold-start 404s
      try {
        sessionStorage.setItem(`sharepaste_cache_${data.slug}`, JSON.stringify({
          slug: data.slug,
          title: draftPayload.title,
          content: draftPayload.content,
          isEncrypted: !!options.password,
          visibility: options.visibility || "public",
          authorName: user?.username || "Anonymous",
          createdAt: Date.now(),
          updatedAt: Date.now()
        }));
      } catch {}

      setIsPublishOpen(false);

      setSuccessData({
        slug: data.slug,
        title: data.title,
        editToken: data.editToken,
      });
      setIsSuccessOpen(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPublishLoading(false);
    }
  };

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
    if (view === "dashboard") {
      navigateTo("editor", "/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors">
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenQuickCode={() => setIsQuickCodeInputOpen(true)}
        onOpenDuoPaste={(tab = "start") => {
          setDuoModalTab(tab);
          setIsDuoModalOpen(true);
        }}
        onOpenWordDoc={() => {
          setEditorInitialMode("word");
          navigateTo("editor", "/word");
        }}
        onLogout={handleLogout}
        onNavigateHome={() => {
          setEditorInitialMode("standard");
          navigateTo("editor", "/");
        }}
        onNavigateDashboard={() => navigateTo("dashboard", "/dashboard")}
        onNavigateProfile={(un) => {
          setProfileUsername(un);
          navigateTo("profile", `/u/${un}`);
        }}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
      />

      <main className="flex-1 flex flex-col">
        {view === "editor" && (
          <Editor
            key={`${forkDraft?.title}-${forkDraft?.content}-${editorInitialMode}`}
            initialTitle={forkDraft?.title || ""}
            initialContent={forkDraft?.content || ""}
            initialMode={editorInitialMode}
            onPublishClick={handleOpenPublish}
            onPublishSuccess={(slug) => {
              setCurrentSlug(slug);
              navigateTo("paste", `/p/${slug}`);
            }}
            onStartDuoPaste={() => {
              setDuoModalTab("start");
              setIsDuoModalOpen(true);
            }}
          />
        )}

        {view === "duo" && activeDuoSession && (
          <DuoPasteEditor
            initialSession={activeDuoSession}
            clientId={duoClientId}
            role={duoRole}
            onLeave={() => {
              setActiveDuoSession(null);
              navigateTo("editor", "/");
            }}
            onPublishSuccess={(slug) => {
              setCurrentSlug(slug);
              setActiveDuoSession(null);
              navigateTo("paste", `/p/${slug}`);
            }}
          />
        )}



        {view === "paste" && (
          <PasteView
            slug={currentSlug}
            onFork={(title, content) => {
              setForkDraft({ title: `${title} (Fork)`, content });
              navigateTo("editor", "/");
            }}
            onEdit={(slug, title, content) => {
              setForkDraft({ title, content });
              navigateTo("editor", "/");
            }}
            onOpenQuickShare={(data) => {
              setQuickShareData(data);
              setIsQuickShareOpen(true);
            }}
            onDeleteSuccess={() => navigateTo("editor", "/")}
            onNavigateProfile={(un) => {
              setProfileUsername(un);
              navigateTo("profile", `/u/${un}`);
            }}
          />
        )}

        {view === "dashboard" && (
          <Dashboard
            onNavigateHome={() => navigateTo("editor", "/")}
            onOpenPaste={(slug) => {
              setCurrentSlug(slug);
              navigateTo("paste", `/p/${slug}`);
            }}
            onEditPaste={(slug, title, content) => {
              setForkDraft({ title, content });
              navigateTo("editor", "/");
            }}
            onOpenQuickShare={(data) => {
              setQuickShareData(data);
              setIsQuickShareOpen(true);
            }}
          />
        )}

        {view === "profile" && (
          <UserProfile
            username={profileUsername}
            onOpenPaste={(slug) => {
              setCurrentSlug(slug);
              navigateTo("paste", `/p/${slug}`);
            }}
            onNavigateHome={() => navigateTo("editor", "/")}
          />
        )}

        {view === "burn-after-reading" && (
          <BurnAfterReadingPage
            onStartAction={handleLandingAction}
            onOpenQuickCode={() => setIsQuickCodeInputOpen(true)}
            onNavigateLanding={(route) => navigateTo(route.slice(1) as any, route)}
          />
        )}

        {view === "encrypted-paste" && (
          <EncryptedPastePage
            onStartAction={handleLandingAction}
            onOpenQuickCode={() => setIsQuickCodeInputOpen(true)}
            onNavigateLanding={(route) => navigateTo(route.slice(1) as any, route)}
          />
        )}

        {view === "quick-code" && (
          <QuickCodePage
            onStartAction={handleLandingAction}
            onOpenQuickCode={() => setIsQuickCodeInputOpen(true)}
            onNavigateLanding={(route) => navigateTo(route.slice(1) as any, route)}
          />
        )}

        {view === "math-notes" && (
          <MathNotesPage
            onStartAction={handleLandingAction}
            onOpenQuickCode={() => setIsQuickCodeInputOpen(true)}
            onNavigateLanding={(route) => navigateTo(route.slice(1) as any, route)}
          />
        )}

        {view === "404" && (
          <NotFoundPage
            onNavigateHome={() => navigateTo("editor", "/")}
            onOpenQuickCode={() => setIsQuickCodeInputOpen(true)}
            onNavigateLanding={(route) => navigateTo(route.slice(1) as any, route)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-gray-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-8 text-xs text-gray-500 dark:text-gray-400 transition-colors">
        <div className="max-w-6xl mx-auto px-4 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Share<span className="text-blue-600">Paste</span></span>
                <span className="font-normal text-gray-400">· Independent Text Publishing & Fast Transfer</span>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                © {new Date().getFullYear()} SharePaste. All rights reserved. Zero-logging temporary sharing & AES-256-GCM encryption.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 font-medium">
              <a href="/" onClick={(e) => { e.preventDefault(); navigateTo("editor", "/"); }} className="hover:text-blue-600 transition">Create Note</a>
              <button onClick={() => setIsQuickCodeInputOpen(true)} className="hover:text-blue-600 transition">Quick Code</button>
              <button onClick={() => setIsAboutOpen(true)} className="hover:text-blue-600 transition">About</button>
              <button onClick={() => setIsTermsOpen(true)} className="hover:text-blue-600 transition">Terms & Privacy</button>
              <a href="/api/health" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition">Status</a>
            </div>
          </div>

          {/* Programmatic Intent Landing Navigation for SEO */}
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800/60 flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2 text-[11px] text-gray-400 dark:text-gray-500">
            <span className="font-semibold text-gray-600 dark:text-gray-400">Features & Solutions:</span>
            <a href="/burn-after-reading" onClick={(e) => { e.preventDefault(); navigateTo("burn-after-reading", "/burn-after-reading"); }} className="hover:text-blue-600 transition">Burn After Reading</a>
            <a href="/encrypted-paste" onClick={(e) => { e.preventDefault(); navigateTo("encrypted-paste", "/encrypted-paste"); }} className="hover:text-blue-600 transition">Encrypted Pastebin</a>
            <a href="/quick-code" onClick={(e) => { e.preventDefault(); navigateTo("quick-code", "/quick-code"); }} className="hover:text-blue-600 transition">PIN Transfer (PC to Mobile)</a>
            <a href="/math-notes" onClick={(e) => { e.preventDefault(); navigateTo("math-notes", "/math-notes"); }} className="hover:text-blue-600 transition">LaTeX Math Notes</a>
            <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition">Sitemap</a>
            <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition">Robots.txt</a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PublishModal
        isOpen={isPublishOpen}
        onClose={() => setIsPublishOpen(false)}
        onPublish={handlePublishSubmit}
        loading={publishLoading}
        isLoggedIn={!!user}
      />

      <PublishSuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        slug={successData?.slug || ""}
        title={successData?.title || ""}
        editToken={successData?.editToken}
        onViewPaste={(slug) => {
          setIsSuccessOpen(false);
          setCurrentSlug(slug);
          navigateTo("paste", `/p/${slug}`);
        }}
        onCreateAnother={() => {
          setIsSuccessOpen(false);
          setForkDraft(null);
          navigateTo("editor", "/");
        }}
      />

      <QuickCodeInputModal
        isOpen={isQuickCodeInputOpen}
        onClose={() => setIsQuickCodeInputOpen(false)}
        onResolveSuccess={(slug) => {
          setCurrentSlug(slug);
          navigateTo("paste", `/p/${slug}`);
        }}
      />

      <QuickShareModal
        isOpen={isQuickShareOpen}
        onClose={() => setIsQuickShareOpen(false)}
        data={quickShareData}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(u) => setUser(u)}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      <DuoPasteModal
        isOpen={isDuoModalOpen}
        onClose={() => setIsDuoModalOpen(false)}
        initialTab={duoModalTab}
        currentDraft={forkDraft}
        onEnterSession={(session, clientId, role) => {
          setActiveDuoSession(session);
          setDuoClientId(clientId);
          setDuoRole(role);
          setView("duo");
          window.history.pushState({}, "", `/duo/${session.pin}`);
        }}
      />
    </div>
  );
};

