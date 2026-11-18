import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Users,
  X,
  Copy,
  Check,
  Zap,
  ArrowRight,
  QrCode,
  Sparkles,
  Radio,
  ExternalLink
} from "lucide-react";
import { DuoSession } from "../types.js";

interface DuoPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "start" | "join";
  currentDraft?: { title: string; content: string } | null;
  onEnterSession: (session: DuoSession, clientId: string, role: "host" | "guest") => void;
}

export const DuoPasteModal: React.FC<DuoPasteModalProps> = ({
  isOpen,
  onClose,
  initialTab = "start",
  currentDraft,
  onEnterSession
}) => {
  const [activeTab, setActiveTab] = useState<"start" | "join">(initialTab);
  const [isCreating, setIsCreating] = useState(false);
  const [createdSession, setCreatedSession] = useState<DuoSession | null>(null);
  const [hostClientId, setHostClientId] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Join State
  const [joinPin, setJoinPin] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setJoinError(null);
      if (initialTab === "start" && !createdSession) {
        handleCreateSession();
      }
    } else {
      setCopiedPin(false);
      setCopiedLink(false);
      setJoinError(null);
    }
  }, [isOpen, initialTab]);

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/duo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: currentDraft?.title || "Untitled DuoPaste",
          content: currentDraft?.content || ""
        })
      });
      const data = await res.json();
      if (res.ok && data.session) {
        setCreatedSession(data.session);
        setHostClientId(data.clientId);

        const inviteUrl = `${window.location.origin}/duo/${data.pin}`;
        try {
          const qr = await QRCode.toDataURL(inviteUrl, {
            width: 180,
            margin: 1,
            color: { dark: "#09090b", light: "#ffffff" }
          });
          setQrDataUrl(qr);
        } catch (e) {
          console.warn("QR code error:", e);
        }
      }
    } catch (err) {
      console.error("Create DuoPaste error:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = joinPin.trim().replace(/\s+/g, "");
    if (!cleanPin) {
      setJoinError("Please enter a 6-digit collaboration PIN.");
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const res = await fetch("/api/duo/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: cleanPin })
      });
      const data = await res.json();
      if (res.ok && data.session) {
        onClose();
        onEnterSession(data.session, data.clientId, "guest");
      } else {
        setJoinError(data.error || "Invalid PIN. Session not found.");
      }
    } catch (err: any) {
      setJoinError("Network error. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const copyPin = () => {
    if (!createdSession) return;
    navigator.clipboard.writeText(createdSession.pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const copyLink = () => {
    if (!createdSession) return;
    const inviteUrl = `${window.location.origin}/duo/${createdSession.pin}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  const inviteUrl = createdSession ? `${window.location.origin}/duo/${createdSession.pin}` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-[#121214] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#27272a] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-[#27272a] flex items-center justify-between bg-gray-50/50 dark:bg-[#09090b]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>DuoPaste</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 uppercase tracking-wider">
                  Live
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Real-time two-person synchronized editor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition hover:bg-gray-100 dark:hover:bg-[#18181b]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-[#18181b] m-4 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400">
          <button
            type="button"
            onClick={() => {
              setActiveTab("start");
              if (!createdSession) handleCreateSession();
            }}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "start"
                ? "bg-white dark:bg-[#27272a] text-purple-600 dark:text-purple-300 shadow-xs"
                : "hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-purple-500" />
            <span>Start Session</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("join")}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === "join"
                ? "bg-white dark:bg-[#27272a] text-purple-600 dark:text-purple-300 shadow-xs"
                : "hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-purple-500" />
            <span>Join with PIN</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 pt-1 space-y-4">
          {activeTab === "start" ? (
            <div>
              {isCreating ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Generating unique collaboration PIN...
                  </p>
                </div>
              ) : createdSession ? (
                <div className="space-y-4">
                  {/* PIN Display Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-50 to-indigo-50/40 dark:from-purple-950/20 dark:to-indigo-950/10 border border-purple-200/80 dark:border-purple-800/40 text-center relative overflow-hidden">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-purple-700 dark:text-purple-400 block mb-1">
                      Collaboration PIN
                    </span>
                    <div className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-purple-950 dark:text-purple-200 my-2 select-all flex items-center justify-center gap-1 sm:gap-2">
                      {createdSession.pin.split("").map((digit, idx) => (
                        <span
                          key={idx}
                          className="w-9 h-11 sm:w-11 sm:h-13 flex items-center justify-center bg-white dark:bg-[#18181b] border border-purple-300/60 dark:border-purple-700/60 rounded-xl shadow-xs"
                        >
                          {digit}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={copyPin}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        {copiedPin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPin ? "PIN Copied!" : "Copy PIN"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={copyLink}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#27272a] hover:bg-gray-50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-purple-600" /> : <ExternalLink className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
                      </button>
                    </div>
                  </div>

                  {/* QR & Instructions */}
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a]">
                    {qrDataUrl && (
                      <div className="p-1 bg-white rounded-lg shadow-xs shrink-0">
                        <img src={qrDataUrl} alt="DuoPaste QR" className="w-16 h-16 rounded" />
                      </div>
                    )}
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Scan or share PIN with collaborator
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        User B can enter this PIN on any mobile or desktop browser to join your live editor instantly.
                      </p>
                    </div>
                  </div>

                  {/* Enter Editor Button */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEnterSession(createdSession, hostClientId, "host");
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Enter Live DuoPaste Editor</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            /* Join Tab */
            <form onSubmit={handleJoinSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Enter Collaboration PIN:
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={joinPin}
                  onChange={(e) => {
                    setJoinPin(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  placeholder="e.g. 482910"
                  autoFocus
                  className="w-full text-center font-mono text-2xl tracking-widest px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#18181b] border-2 border-purple-300 dark:border-purple-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 font-bold uppercase transition"
                />
              </div>

              {joinError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium">
                  {joinError}
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed text-center">
                Enter the 6-digit PIN shared by your friend or colleague to connect to their live editor.
              </p>

              <button
                type="submit"
                disabled={isJoining || !joinPin.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isJoining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting to session...</span>
                  </>
                ) : (
                  <>
                    <span>Join Live DuoPaste</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
