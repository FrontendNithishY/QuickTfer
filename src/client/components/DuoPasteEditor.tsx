import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Radio,
  Copy,
  Check,
  Send,
  Save,
  LogOut,
  Sparkles,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Image as ImageIcon,
  Video as VideoIcon,
  Table as TableIcon,
  Sigma,
  Undo,
  Redo,
  Share2,
  ExternalLink,
  ShieldCheck,
  Zap
} from "lucide-react";
import { DuoSession } from "../types.js";

interface DuoPasteEditorProps {
  initialSession: DuoSession;
  clientId: string;
  role: "host" | "guest";
  onLeave: () => void;
  onPublishSuccess: (slug: string) => void;
}

export const DuoPasteEditor: React.FC<DuoPasteEditorProps> = ({
  initialSession,
  clientId,
  role,
  onLeave,
  onPublishSuccess
}) => {
  const [session, setSession] = useState<DuoSession>(initialSession);
  const [title, setTitle] = useState(initialSession.title || "Untitled DuoPaste");
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [collaboratorsCount, setCollaboratorsCount] = useState<number>(
    initialSession.guest_client_id ? 2 : 1
  );
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "offline">("synced");
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef(title);
  titleRef.current = title;

  const syncTimeoutRef = useRef<any>(null);
  const isApplyingRemoteRef = useRef(false);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && initialSession.content) {
      editorRef.current.innerHTML = initialSession.content;
      updateStats();
    }
  }, []);

  const updateStats = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const trimmed = text.trim();
    setWordCount(trimmed ? trimmed.split(/\s+/).length : 0);
    setCharCount(text.length);
  };

  // Real-Time Server-Sent Events (SSE) Stream
  useEffect(() => {
    const sseUrl = `/api/duo/stream/${session.pin}?clientId=${clientId}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      setSyncStatus("synced");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "presence") {
          if (data.clientsCount) {
            setCollaboratorsCount(data.clientsCount);
          }
        } else if (data.type === "collaborator_joined") {
          setCollaboratorsCount(2);
          setLastRemoteUpdate("Collaborator joined!");
          setTimeout(() => setLastRemoteUpdate(null), 3000);
        } else if (data.type === "sync") {
          // If update came from the OTHER collaborator
          if (data.senderId !== clientId) {
            setLastRemoteUpdate("Collaborator is typing...");
            setTimeout(() => setLastRemoteUpdate(null), 2000);

            if (data.title !== undefined && data.title !== titleRef.current) {
              setTitle(data.title);
            }

            if (data.content !== undefined && editorRef.current) {
              const currentLocalHtml = editorRef.current.innerHTML;
              if (currentLocalHtml !== data.content) {
                isApplyingRemoteRef.current = true;
                // Preserve selection / cursor where possible or apply content
                editorRef.current.innerHTML = data.content;
                updateStats();
                isApplyingRemoteRef.current = false;
              }
            }
          }
        } else if (data.type === "published") {
          if (data.slug) {
            onPublishSuccess(data.slug);
          }
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = () => {
      setSyncStatus("offline");
    };

    // Polling fallback every 2.5s for resilient sync across serverless cold starts
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/duo/${session.pin}`);
        if (res.ok) {
          const fresh = await res.json();
          if (fresh.session) {
            setSession(fresh.session);
            if (fresh.session.guest_client_id) {
              setCollaboratorsCount((prev) => Math.max(prev, 2));
            }
            if (fresh.session.published_slug) {
              onPublishSuccess(fresh.session.published_slug);
            }
          }
        }
      } catch {
        // ignore poll errors
      }
    }, 2500);

    return () => {
      eventSource.close();
      clearInterval(pollInterval);
    };
  }, [session.pin, clientId]);

  // Dispatch local mutations to server
  const queueSync = () => {
    if (isApplyingRemoteRef.current) return;
    setSyncStatus("saving");

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        const currentHtml = editorRef.current ? editorRef.current.innerHTML : "";
        const res = await fetch("/api/duo/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pin: session.pin,
            clientId,
            title,
            content: currentHtml
          })
        });
        if (res.ok) {
          setSyncStatus("synced");
        } else {
          setSyncStatus("offline");
        }
      } catch {
        setSyncStatus("offline");
      }
    }, 200);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    queueSync();
  };

  const handleInput = () => {
    updateStats();
    queueSync();
  };

  // Rich Text Formatting helper
  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  };

  const promptLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (url) exec("createLink", url);
  };

  const promptYoutube = () => {
    const url = prompt("Enter YouTube video link (e.g. https://www.youtube.com/watch?v=...):");
    if (!url) return;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match && match[1]) {
      const embedHtml = `<iframe src="https://www.youtube.com/embed/${match[1]}" frameborder="0" allowfullscreen style="width: 100%; max-width: 640px; height: 360px; margin: 16px auto; display: block; border-radius: 8px;"></iframe><p><br></p>`;
      exec("insertHTML", embedHtml);
    } else {
      alert("Invalid YouTube URL.");
    }
  };

  const insertTable = () => {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: rgba(147, 51, 234, 0.1);">
            <th style="border: 1px solid #3f3f46; padding: 8px 12px; text-align: left;">Header 1</th>
            <th style="border: 1px solid #3f3f46; padding: 8px 12px; text-align: left;">Header 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #3f3f46; padding: 8px 12px;">Item 1</td>
            <td style="border: 1px solid #3f3f46; padding: 8px 12px;">Item 2</td>
          </tr>
        </tbody>
      </table><p><br></p>
    `;
    exec("insertHTML", tableHtml);
  };

  // Publish shared paste into a permanent SharePaste record
  const handlePublishShared = async () => {
    if (isPublishing) return;
    setIsPublishing(true);

    try {
      const res = await fetch("/api/duo/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: session.pin,
          visibility: "public"
        })
      });
      const data = await res.json();
      if (res.ok && data.slug) {
        try {
          const currentHtml = editorRef.current ? editorRef.current.innerHTML : "";
          sessionStorage.setItem(`sharepaste_cache_${data.slug}`, JSON.stringify({
            slug: data.slug,
            title,
            content: currentHtml,
            isEncrypted: false,
            visibility: "public",
            authorName: "DuoPaste Collaborators",
            createdAt: Date.now(),
            updatedAt: Date.now()
          }));
        } catch {}
        onPublishSuccess(data.slug);
      } else {

        alert(data.error || "Failed to publish shared paste.");
      }
    } catch (err) {
      console.error("Publish duo error:", err);
      alert("Network error publishing shared paste.");
    } finally {
      setIsPublishing(false);
    }
  };

  const copyPin = () => {
    navigator.clipboard.writeText(session.pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/duo/${session.pin}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6">
      {/* Collaboration Status Topbar */}
      <div className="mb-4 p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#121214] border border-purple-200 dark:border-purple-900/60 shadow-lg shadow-purple-500/5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: DuoPaste Live Badge & PIN */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-extrabold text-xs tracking-wide">DuoPaste Live</span>
          </div>

          {/* PIN pill */}
          <button
            type="button"
            onClick={copyPin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-[#18181b] hover:bg-gray-200 dark:hover:bg-[#27272a] text-gray-800 dark:text-gray-200 font-mono text-xs font-bold transition border border-gray-200 dark:border-[#27272a] cursor-pointer"
            title="Click to copy 6-digit PIN"
          >
            <span>PIN:</span>
            <span className="tracking-wider text-purple-600 dark:text-purple-400 font-extrabold">{session.pin}</span>
            {copiedPin ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
          </button>

          {/* Collaborator Count & Presence */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-50 dark:bg-[#18181b] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#27272a]">
            <Users className="w-3.5 h-3.5 text-purple-500" />
            <span>
              {collaboratorsCount > 1 ? "2 Online (Host & Guest)" : "1 Online (Waiting for guest...)"}
            </span>
          </div>
        </div>

        {/* Right: Sync Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Status Indicator */}
          <div className="text-[11px] font-medium hidden sm:flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mr-1">
            {lastRemoteUpdate ? (
              <span className="text-purple-600 dark:text-purple-400 font-semibold animate-pulse">
                {lastRemoteUpdate}
              </span>
            ) : syncStatus === "saving" ? (
              <span className="text-amber-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Auto-saving...
              </span>
            ) : syncStatus === "synced" ? (
              <span className="text-emerald-500 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Synced live
              </span>
            ) : (
              <span className="text-gray-400">Connecting...</span>
            )}
          </div>

          {/* Copy Invite Link */}
          <button
            type="button"
            onClick={copyInviteLink}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gray-100 dark:bg-[#18181b] hover:bg-gray-200 dark:hover:bg-[#27272a] text-gray-700 dark:text-gray-200 text-xs font-bold transition flex items-center gap-1.5 border border-gray-200 dark:border-[#27272a] cursor-pointer"
            title="Copy invite link to clipboard"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ExternalLink className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? "Link Copied!" : "Invite Link"}</span>
          </button>

          {/* Publish Shared Paste Button */}
          <button
            type="button"
            onClick={handlePublishShared}
            disabled={isPublishing}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-60"
            title="Save and publish this shared paste"
          >
            {isPublishing ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Publish Paste</span>
          </button>

          {/* Leave Session */}
          <button
            type="button"
            onClick={onLeave}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
            title="Leave DuoPaste session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Main Card */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl shadow-sm border border-gray-200 dark:border-[#27272a] overflow-hidden flex flex-col">
        {/* Title Input */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-[#27272a] bg-transparent">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled DuoPaste (Shared in real-time)"
            className="w-full text-xl sm:text-2xl font-bold bg-transparent text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
        </div>

        {/* Formatting Toolbar */}
        <div className="p-2 border-b border-gray-200 dark:border-[#27272a] bg-gray-50/70 dark:bg-[#09090b] flex flex-wrap items-center gap-1 text-gray-700 dark:text-gray-300">
          {/* Headings */}
          <button
            type="button"
            onClick={() => exec("formatBlock", "<h1>")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b] font-bold text-xs"
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => exec("formatBlock", "<h2>")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b] font-bold text-xs"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => exec("formatBlock", "<h3>")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b] font-bold text-xs"
            title="Heading 3"
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => exec("formatBlock", "<p>")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b] font-bold text-xs"
            title="Paragraph"
          >
            P
          </button>

          <div className="w-px h-5 bg-gray-300 dark:bg-[#27272a] mx-1" />

          {/* Formats */}
          <button
            type="button"
            onClick={() => exec("bold")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("italic")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("underline")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("strikeThrough")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("formatBlock", "<pre>")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("formatBlock", "<blockquote>")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-300 dark:bg-[#27272a] mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => exec("insertUnorderedList")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("insertOrderedList")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-300 dark:bg-[#27272a] mx-1" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => exec("justifyLeft")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("justifyCenter")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("justifyRight")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-300 dark:bg-[#27272a] mx-1" />

          {/* Media / Tables */}
          <button
            type="button"
            onClick={promptLink}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Insert Link"
          >
            <Link className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={promptYoutube}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Embed YouTube Video"
          >
            <VideoIcon className="w-4 h-4 text-red-500" />
          </button>
          <button
            type="button"
            onClick={insertTable}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Insert Table"
          >
            <TableIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-300 dark:bg-[#27272a] mx-1" />

          {/* History */}
          <button
            type="button"
            onClick={() => exec("undo")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("redo")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#18181b]"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        {/* Live Synchronized ContentEditable Area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          spellCheck={false}
          className="min-h-[420px] p-5 sm:p-7 outline-none paste-content bg-transparent text-gray-900 dark:text-gray-100 text-base leading-relaxed"
          style={{ whiteSpace: "pre-wrap" }}
          placeholder="Start typing together in DuoPaste... Whatever either person types appears instantly on both screens!"
        />

        {/* Footer Stats Bar */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#09090b] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
            <span className="hidden sm:inline text-purple-600 dark:text-purple-400 font-medium">
              Real-time collaboration active
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Auto-saving to shared paste</span>
          </div>
        </div>
      </div>
    </div>
  );
};
