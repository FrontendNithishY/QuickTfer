import React, { useState, useEffect } from "react";
import { User, QuickShareData } from "./types.js";
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
import { getAuthToken, removeAuthToken, saveEditToken } from "./utils/storage.js";

type RouteView = "editor" | "paste" | "dashboard" | "profile";

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
      } else if (path.startsWith("/u/")) {
        const username = path.slice(3);
        setProfileUsername(username);
        setView("profile");
      } else if (path === "/dashboard") {
        setView("dashboard");
      } else {
        setView("editor");
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
        onLogout={handleLogout}
        onNavigateHome={() => navigateTo("editor", "/")}
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
            initialTitle={forkDraft?.title || ""}
            initialContent={forkDraft?.content || ""}
            onPublishClick={handleOpenPublish}
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
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-gray-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-6 text-xs text-gray-500 dark:text-gray-400 transition-colors">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Quick<span className="text-blue-600">Trfr</span></span>
              <span className="font-normal text-gray-400">· Independent Text Publishing & Fast Transfer</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              © {new Date().getFullYear()} QuickTrfr. All rights reserved. Zero-logging temporary sharing & AES-256-GCM encryption.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 font-medium">
            <button onClick={() => navigateTo("editor", "/")} className="hover:text-blue-600 transition">Create Note</button>
            <button onClick={() => setIsQuickCodeInputOpen(true)} className="hover:text-blue-600 transition">Quick Code</button>
            <button onClick={() => setIsAboutOpen(true)} className="hover:text-blue-600 transition">About</button>
            <button onClick={() => setIsTermsOpen(true)} className="hover:text-blue-600 transition">Terms & Privacy</button>
            <a href="/api/health" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition">Status</a>
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
    </div>
  );
};
