import React, { useState, useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Indent,
  Outdent,
  Type,
  Palette,
  Highlighter,
  Table as TableIcon,
  Image as ImageIcon,
  Link,
  FileText,
  Sparkles,
  Printer,
  Download,
  Upload,
  Search,
  Copy,
  Scissors,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Columns,
  Check,
  X,
  ChevronDown,
  Eye,
  FileDown,
  Calendar,
  BarChart3,
  Paintbrush,
  Layers,
  Layout,
  Minus,
  Sigma,
  Users,
  Radio,
  ExternalLink,
  QrCode,
  Quote,
  Rows,
  PanelLeft,
  BookOpen,
  Sliders
} from "lucide-react";
import katex from "katex";
import * as mammoth from "mammoth";
import QRCode from "qrcode";
import { DuoSession } from "../types.js";
import { splitIntoPages, joinPagesToHtml, parseDocxBuffer } from "../utils/wordParser.js";

export interface WordDocEditorProps {
  initialTitle?: string;
  initialContent?: string;
  onPublishClick: (title: string, content: string) => void;
  onSwitchToStandard?: () => void;
  onStartDuoPaste?: () => void;
  // Live Collaboration Props
  collabSession?: DuoSession | null;
  clientId?: string;
  role?: "host" | "guest";
  onLeaveCollab?: () => void;
  onPublishSuccess?: (slug: string) => void;
}

// Classic Microsoft Office Theme Colors (10 color families x 6 brightness levels)
const THEME_COLORS = [
  // Row 1: Base colors
  ["#ffffff", "#000000", "#eeece1", "#1f497d", "#4f81bd", "#c0504d", "#9bbb59", "#8064a2", "#4bacc6", "#f79646"],
  // Row 2: Tint 80%
  ["#f2f2f2", "#7f7f7f", "#ddd9c3", "#c6d9f0", "#dce6f1", "#f2dcdb", "#ebf1dd", "#e5e0ec", "#dbeef3", "#fdeada"],
  // Row 3: Tint 60%
  ["#d8d8d8", "#595959", "#c4bd97", "#8db3e2", "#b8cce4", "#e5b9b7", "#d7e3bc", "#ccc1da", "#b7dde8", "#fbd5b5"],
  // Row 4: Tint 40%
  ["#bfbfbf", "#3f3f3f", "#948a54", "#548dd4", "#95b3d7", "#d99694", "#c3d69b", "#b2a2c7", "#92cddc", "#fac08f"],
  // Row 5: Shade 25%
  ["#a5a5a5", "#262626", "#494429", "#17365d", "#366092", "#953734", "#76933c", "#60497a", "#31859b", "#e36c09"],
  // Row 6: Shade 50%
  ["#7f7f7f", "#0c0c0c", "#1d1b10", "#0f243e", "#244062", "#632423", "#4f6128", "#403151", "#205867", "#974806"]
];

const STANDARD_COLORS = [
  "#c00000", "#ff0000", "#ffc000", "#ffff00", "#92d050", "#00b050", "#00b0f0", "#0070c0", "#002060", "#7030a0"
];

// Classic Microsoft Word 15-Color Highlighter Grid
const HIGHLIGHT_COLORS = [
  { name: "Yellow", color: "#ffff00" },
  { name: "Bright Green", color: "#00ff00" },
  { name: "Turquoise", color: "#00ffff" },
  { name: "Pink", color: "#ff00ff" },
  { name: "Blue", color: "#0000ff" },
  { name: "Red", color: "#ff0000" },
  { name: "Dark Blue", color: "#000080" },
  { name: "Teal", color: "#008080" },
  { name: "Green", color: "#008000" },
  { name: "Violet", color: "#800080" },
  { name: "Dark Red", color: "#800000" },
  { name: "Dark Yellow", color: "#808000" },
  { name: "50% Gray", color: "#808080" },
  { name: "25% Gray", color: "#c0c0c0" },
  { name: "Black", color: "#000000" }
];

const FONT_FAMILIES = [
  { label: "Calibri (Body)", value: "Calibri, 'Segoe UI', Candara, sans-serif" },
  { label: "Calibri Light (Headings)", value: "'Calibri Light', sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Segoe UI", value: "'Segoe UI', Roboto, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Garamond", value: "Garamond, serif" },
  { label: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
  { label: "Impact", value: "Impact, Charcoal, sans-serif" }
];

const FONT_SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48", "72"];

export const WordDocEditor: React.FC<WordDocEditorProps> = ({
  initialTitle = "Document1",
  initialContent = "",
  onPublishClick,
  onSwitchToStandard,
  onStartDuoPaste,
  collabSession: propCollabSession = null,
  clientId: propClientId = "",
  role: propRole = "host",
  onLeaveCollab,
  onPublishSuccess
}) => {
  const [title, setTitle] = useState(initialTitle || "Document1");
  const [activeTab, setActiveTab] = useState<"file" | "home" | "insert" | "layout" | "review" | "view">("home");
  
  // Document Formatting States
  const [fontFamily, setFontFamily] = useState("Calibri, 'Segoe UI', Candara, sans-serif");
  const [fontSize, setFontSize] = useState("11");
  const [fontColor, setFontColor] = useState("#000000");
  const [highlightColor, setHighlightColor] = useState("#ffff00");
  const [lineSpacing, setLineSpacing] = useState("1.15");
  
  // Dropdown Panels
  const [showFontColorPicker, setShowFontColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showUnderlineMenu, setShowUnderlineMenu] = useState(false);
  const [showLineSpacingMenu, setShowLineSpacingMenu] = useState(false);
  const [showTableGridPicker, setShowTableGridPicker] = useState(false);
  const [tableGridHover, setTableGridHover] = useState({ rows: 1, cols: 1 });
  const [showCaseMenu, setShowCaseMenu] = useState(false);
  const [showStylesMenu, setShowStylesMenu] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showTableToolsMenu, setShowTableToolsMenu] = useState(false);
  const [showBorderMenu, setShowBorderMenu] = useState(false);
  const [showTextEffectsMenu, setShowTextEffectsMenu] = useState(false);
  const [showNavPane, setShowNavPane] = useState(false);
  const [showProofingModal, setShowProofingModal] = useState(false);
  const [pageBorderStyle, setPageBorderStyle] = useState<"none" | "box" | "double" | "shadow">("none");
  const [runningHeaderText, setRunningHeaderText] = useState<string>("");
  const [runningFooterText, setRunningFooterText] = useState<string>("");
  const [pageNumberFormat, setPageNumberFormat] = useState<"standard" | "compact" | "hash">("standard");
  const [hyphenation, setHyphenation] = useState(false);
  const [headingsList, setHeadingsList] = useState<{ id: string; text: string; level: number; pageIdx: number }[]>([]);
  
  // Find & Replace
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [findCount, setFindCount] = useState<number | null>(null);

  // Layout & View Options
  const [viewMode, setViewMode] = useState<"print" | "web" | "focus">("print");
  const [paperSize, setPaperSize] = useState<"a4" | "letter" | "legal">("a4");
  const [margins, setMargins] = useState<"normal" | "narrow" | "moderate" | "wide">("normal");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [columns, setColumns] = useState<"1" | "2" | "3">("1");
  const [watermark, setWatermark] = useState<string>("");
  const [pageBgColor, setPageBgColor] = useState<"white" | "dark" | "cream" | "sepia">("white");
  const [showRuler, setShowRuler] = useState(true);
  const [zoom, setZoom] = useState(100);

  // Format Painter
  const [formatPainterStyle, setFormatPainterStyle] = useState<{
    fontFamily?: string;
    fontSize?: string;
    color?: string;
    backgroundColor?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
  } | null>(null);

  // Word Collab Live State
  const [collabSession, setCollabSession] = useState<DuoSession | null>(propCollabSession || null);
  const [clientId, setClientId] = useState<string>(
    propClientId || Math.random().toString(36).slice(2, 10)
  );
  const [role, setRole] = useState<"host" | "guest">(propRole || "host");
  const [collaboratorsCount, setCollaboratorsCount] = useState<number>(
    propCollabSession?.guest_client_id ? 2 : 1
  );
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "offline">("synced");
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState<string | null>(null);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [collabTab, setCollabTab] = useState<"start" | "join">("start");
  const [collabJoinPin, setCollabJoinPin] = useState("");
  const [isJoiningCollab, setIsJoiningCollab] = useState(false);
  const [joinCollabError, setJoinCollabError] = useState<string | null>(null);
  const [collabQrUrl, setCollabQrUrl] = useState<string>("");
  const [copiedCollabPin, setCopiedCollabPin] = useState(false);
  const [copiedCollabLink, setCopiedCollabLink] = useState(false);

  // Statistics
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [charNoSpaces, setCharNoSpaces] = useState(0);
  const [paraCount, setParaCount] = useState(1);
  const [pages, setPages] = useState<string[]>(() => splitIntoPages(initialContent || ""));
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [pageCount, setPageCount] = useState<number>(() => Math.max(1, splitIntoPages(initialContent || "").length));
  const [savedTime, setSavedTime] = useState<string>("Saved just now");

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef(title);
  titleRef.current = title;
  const syncTimeoutRef = useRef<any>(null);
  const isApplyingRemoteRef = useRef(false);

  // Assemble full document HTML across all individual page cards
  const getFullDocumentHtml = () => {
    const assembled = pages.map((pageHtml, i) => {
      const el = pageRefs.current[i];
      return el ? el.innerHTML : pageHtml;
    });
    return joinPagesToHtml(assembled);
  };

  // Initialize content
  useEffect(() => {
    if (initialContent) {
      const parsed = splitIntoPages(initialContent);
      setPages(parsed);
      setPageCount(parsed.length);
      setTimeout(() => {
        parsed.forEach((p, idx) => {
          if (pageRefs.current[idx]) {
            pageRefs.current[idx]!.innerHTML = p;
          }
        });
        updateStats();
      }, 0);
    }
  }, [initialContent]);

  useEffect(() => {
    if (initialTitle) setTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (propCollabSession) {
      setCollabSession(propCollabSession);
      if (propClientId) setClientId(propClientId);
      if (propRole) setRole(propRole);
      setCollaboratorsCount(propCollabSession.guest_client_id ? 2 : 1);
    }
  }, [propCollabSession, propClientId, propRole]);

  const updateStats = () => {
    let words = 0;
    let chars = 0;
    let noSpaces = 0;
    let paras = 0;

    const foundHeadings: { id: string; text: string; level: number; pageIdx: number }[] = [];
    pages.forEach((_, i) => {
      const el = pageRefs.current[i];
      const text = el ? (el.innerText || "") : "";
      const trimmed = text.trim();
      if (trimmed) {
        words += trimmed.split(/\s+/).filter(Boolean).length;
        paras += text.split(/\n+/).filter(p => p.trim().length > 0).length || 1;
      }
      chars += text.length;
      noSpaces += text.replace(/\s+/g, "").length;

      if (el) {
        const hs = el.querySelectorAll("h1, h2, h3");
        hs.forEach((h, hIdx) => {
          const txt = h.textContent?.trim() || "";
          if (txt) {
            const hId = `doc-heading-${i}-${hIdx}`;
            h.id = hId;
            foundHeadings.push({
              id: hId,
              text: txt,
              level: h.tagName === "H1" ? 1 : h.tagName === "H2" ? 2 : 3,
              pageIdx: i
            });
          }
        });
      }
    });

    setHeadingsList(foundHeadings);
    setWordCount(words);
    setCharCount(chars);
    setCharNoSpaces(noSpaces);
    setParaCount(Math.max(1, paras));
    setPageCount(pages.length);
    setSavedTime("Saved to browser");
  };

  // Queue Live Sync across User A and User B
  const queueCollabSync = () => {
    if (!collabSession || isApplyingRemoteRef.current) return;
    setSyncStatus("saving");

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        const currentHtml = getFullDocumentHtml();
        const res = await fetch("/api/duo/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pin: collabSession.pin,
            clientId,
            title: titleRef.current,
            content: currentHtml,
            version: (collabSession.version || 1) + 1
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.session) setCollabSession(data.session);
          setSyncStatus("synced");
        }
      } catch {
        setSyncStatus("offline");
      }
    }, 180);
  };

  // Real-Time Server-Sent Events (SSE) Stream for Word Collab
  useEffect(() => {
    if (!collabSession) return;

    const sseUrl = `/api/duo/stream/${collabSession.pin}?clientId=${clientId}`;
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
          // If update came from the other collaborator
          if (data.senderId !== clientId) {
            setLastRemoteUpdate(role === "host" ? "User B is typing..." : "User A is typing...");
            setTimeout(() => setLastRemoteUpdate(null), 2000);

            if (data.title !== undefined && data.title !== titleRef.current) {
              setTitle(data.title);
            }

            if (data.content !== undefined) {
              const currentLocalHtml = getFullDocumentHtml();
              if (currentLocalHtml !== data.content) {
                isApplyingRemoteRef.current = true;
                const incomingPages = splitIntoPages(data.content);
                setPages(incomingPages);
                setPageCount(incomingPages.length);
                setTimeout(() => {
                  incomingPages.forEach((p, idx) => {
                    if (pageRefs.current[idx]) {
                      pageRefs.current[idx]!.innerHTML = p;
                    }
                  });
                  updateStats();
                  isApplyingRemoteRef.current = false;
                }, 0);
              }
            }
          }
        } else if (data.type === "published") {
          if (data.slug) {
            try {
              sessionStorage.setItem(`sharepaste_cache_${data.slug}`, JSON.stringify({
                slug: data.slug,
                title,
                content: getFullDocumentHtml(),
                isEncrypted: false,
                visibility: "public",
                authorName: "Word Collab Collaborators",
                createdAt: Date.now(),
                updatedAt: Date.now()
              }));
            } catch {}
            if (onPublishSuccess) {
              onPublishSuccess(data.slug);
            } else {
              window.location.href = `/p/${data.slug}`;
            }
          }
        }
      } catch (err) {
        console.error("Word Collab SSE parse error:", err);
      }
    };

    eventSource.onerror = () => {
      setSyncStatus("offline");
    };

    // Polling fallback every 2.5s for resilient sync across serverless containers
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/duo/${collabSession.pin}`);
        if (res.ok) {
          const fresh = await res.json();
          if (fresh.session) {
            setCollabSession(fresh.session);
            if (fresh.session.guest_client_id) {
              setCollaboratorsCount((prev) => Math.max(prev, 2));
            }
            if (fresh.session.published_slug) {
              if (onPublishSuccess) onPublishSuccess(fresh.session.published_slug);
              else window.location.href = `/p/${fresh.session.published_slug}`;
            }
          }
        }
      } catch {}
    }, 2500);

    return () => {
      eventSource.close();
      clearInterval(pollInterval);
    };
  }, [collabSession?.pin, clientId, role, onPublishSuccess]);

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    const activePage = pageRefs.current[activePageIndex] || pageRefs.current[0];
    if (activePage) {
      activePage.focus();
    }
    updateStats();
    queueCollabSync();
  };

  const handleAddPage = (insertIndex: number) => {
    const currentPages = pages.map((pageHtml, i) => {
      const el = pageRefs.current[i];
      return el ? el.innerHTML : pageHtml;
    });
    currentPages.splice(insertIndex, 0, "<p><br></p>");
    setPages(currentPages);
    setPageCount(currentPages.length);
    setActivePageIndex(insertIndex);
    setTimeout(() => {
      currentPages.forEach((p, idx) => {
        if (pageRefs.current[idx]) {
          pageRefs.current[idx]!.innerHTML = p;
        }
      });
      if (pageRefs.current[insertIndex]) {
        pageRefs.current[insertIndex]!.focus();
      }
      updateStats();
      queueCollabSync();
    }, 0);
  };

  const handleDeletePage = (targetIndex: number) => {
    if (pages.length <= 1) return;
    if (confirm(`Delete Page ${targetIndex + 1}?`)) {
      const currentPages = pages.map((pageHtml, i) => {
        const el = pageRefs.current[i];
        return el ? el.innerHTML : pageHtml;
      });
      currentPages.splice(targetIndex, 1);
      setPages(currentPages);
      setPageCount(currentPages.length);
      const nextActive = Math.max(0, targetIndex - 1);
      setActivePageIndex(nextActive);
      setTimeout(() => {
        currentPages.forEach((p, idx) => {
          if (pageRefs.current[idx]) {
            pageRefs.current[idx]!.innerHTML = p;
          }
        });
        if (pageRefs.current[nextActive]) {
          pageRefs.current[nextActive]!.focus();
        }
        updateStats();
        queueCollabSync();
      }, 0);
    }
  };

  const handlePageInput = (index: number) => {
    updateStats();
    queueCollabSync();
  };

  const handlePageKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleAddPage(index + 1);
    }
  };

  // Font family change
  const handleFontFamilyChange = (font: string) => {
    setFontFamily(font);
    exec("fontName", font);
  };

  // Font size change (pt)
  const handleFontSizeChange = (sizePt: string) => {
    setFontSize(sizePt);
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement("span");
    span.style.fontSize = `${sizePt}pt`;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    updateStats();
    queueCollabSync();
  };

  // Grow Font (+2pt)
  const handleGrowFont = () => {
    const current = parseInt(fontSize) || 11;
    const next = String(current + 2);
    handleFontSizeChange(next);
  };

  // Shrink Font (-2pt)
  const handleShrinkFont = () => {
    const current = parseInt(fontSize) || 11;
    const next = String(Math.max(8, current - 2));
    handleFontSizeChange(next);
  };

  // Change Case
  const handleChangeCase = (caseType: "sentence" | "lower" | "upper" | "title" | "toggle") => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const text = selection.toString();
    if (!text) return;

    let transformed = text;
    if (caseType === "lower") transformed = text.toLowerCase();
    else if (caseType === "upper") transformed = text.toUpperCase();
    else if (caseType === "sentence") {
      transformed = text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
    } else if (caseType === "title") {
      transformed = text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    } else if (caseType === "toggle") {
      transformed = text.split("").map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join("");
    }

    exec("insertText", transformed);
    setShowCaseMenu(false);
  };

  // Clear Formatting
  const handleClearFormatting = () => {
    exec("removeFormat");
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const fragment = range.extractContents();
    const cleanDiv = document.createElement("div");
    cleanDiv.appendChild(fragment);

    const cleanText = cleanDiv.innerText;
    const textNode = document.createTextNode(cleanText);
    range.insertNode(textNode);
    updateStats();
    queueCollabSync();
  };

  // Apply Font Color
  const handleApplyFontColor = (color: string) => {
    setFontColor(color);
    exec("foreColor", color);
    setShowFontColorPicker(false);
  };

  // Apply Text Highlight Color
  const handleApplyHighlight = (color: string) => {
    setHighlightColor(color);
    if (color === "transparent") {
      exec("removeFormat");
    } else {
      exec("hiliteColor", color);
    }
    setShowHighlightPicker(false);
  };

  // Underline with Style
  const handleUnderlineStyle = (style: "solid" | "double" | "dotted" | "dashed" | "wavy") => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement("span");
    span.style.textDecoration = `underline ${style}`;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    setShowUnderlineMenu(false);
    updateStats();
    queueCollabSync();
  };

  // Format Painter
  const handleFormatPainterClick = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      alert("Highlight some formatted text first, then click Format Painter to copy its style!");
      return;
    }
    const anchor = selection.anchorNode?.parentElement;
    if (anchor) {
      const computed = window.getComputedStyle(anchor);
      setFormatPainterStyle({
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontWeight: computed.fontWeight,
        fontStyle: computed.fontStyle,
        textDecoration: computed.textDecoration
      });
    }
  };

  const handleApplyFormatPainter = () => {
    if (!formatPainterStyle) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement("span");
    if (formatPainterStyle.fontFamily) span.style.fontFamily = formatPainterStyle.fontFamily;
    if (formatPainterStyle.fontSize) span.style.fontSize = formatPainterStyle.fontSize;
    if (formatPainterStyle.color) span.style.color = formatPainterStyle.color;
    if (formatPainterStyle.backgroundColor && formatPainterStyle.backgroundColor !== "rgba(0, 0, 0, 0)") {
      span.style.backgroundColor = formatPainterStyle.backgroundColor;
    }
    if (formatPainterStyle.fontWeight) span.style.fontWeight = formatPainterStyle.fontWeight;
    if (formatPainterStyle.fontStyle) span.style.fontStyle = formatPainterStyle.fontStyle;
    if (formatPainterStyle.textDecoration) span.style.textDecoration = formatPainterStyle.textDecoration;

    span.appendChild(range.extractContents());
    range.insertNode(span);
    setFormatPainterStyle(null);
    updateStats();
    queueCollabSync();
  };

  // Line Spacing
  const handleLineSpacing = (spacing: string) => {
    setLineSpacing(spacing);
    const selection = window.getSelection();
    if (!selection) return;
    const activePage = pageRefs.current[activePageIndex] || pageRefs.current[0];
    let node = selection.anchorNode;
    while (node && node !== activePage && node !== document.body) {
      if (node instanceof HTMLElement && (node.tagName === "P" || node.tagName === "DIV" || node.tagName === "LI")) {
        node.style.lineHeight = spacing;
        break;
      }
      node = node.parentNode;
    }
    setShowLineSpacingMenu(false);
    queueCollabSync();
  };

  // Paragraph Shading
  const handleParagraphShading = (color: string) => {
    const selection = window.getSelection();
    if (!selection) return;
    const activePage = pageRefs.current[activePageIndex] || pageRefs.current[0];
    let node = selection.anchorNode;
    while (node && node !== activePage && node !== document.body) {
      if (node instanceof HTMLElement && (node.tagName === "P" || node.tagName === "DIV" || node.tagName === "BLOCKQUOTE")) {
        node.style.backgroundColor = color;
        node.style.padding = "8px 12px";
        node.style.borderRadius = "6px";
        break;
      }
      node = node.parentNode;
    }
    queueCollabSync();
  };

  // Quick Styles Application
  const applyQuickStyle = (style: { name: string; tag: string; classes?: string; css?: string }) => {
    exec("formatBlock", `<${style.tag}>`);
    if (style.css) {
      const selection = window.getSelection();
      const activePage = pageRefs.current[activePageIndex] || pageRefs.current[0];
      let node = selection?.anchorNode;
      while (node && node !== activePage && node !== document.body) {
        if (node instanceof HTMLElement && node.tagName.toLowerCase() === style.tag) {
          node.setAttribute("style", style.css);
          break;
        }
        node = node.parentNode;
      }
    }
    setShowStylesMenu(false);
    queueCollabSync();
  };

  // Insert Table via Grid Selection
  const handleInsertGridTable = (rows: number, cols: number) => {
    let tableHtml = `<table style="width:100%; border-collapse:collapse; margin:16px 0; border:1px solid #94a3b8;"><thead><tr>`;
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<th style="border:1px solid #94a3b8; background-color:#f1f5f9; padding:8px 12px; font-weight:bold; text-align:left;">Header ${c}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;
    for (let r = 1; r <= rows; r++) {
      tableHtml += `<tr>`;
      for (let c = 1; c <= cols; c++) {
        tableHtml += `<td style="border:1px solid #cbd5e1; padding:8px 12px;">Cell</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br></p>`;

    exec("insertHTML", tableHtml);
    setShowTableGridPicker(false);
  };

  // Helper to find the table cell or table element under the cursor
  const getSelectedTableCell = (): HTMLTableCellElement | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.anchorNode;
    while (node && node !== document.body) {
      if (node instanceof HTMLTableCellElement) return node;
      node = node.parentNode;
    }
    return null;
  };

  const handleAddTableRow = (position: "above" | "below") => {
    const cell = getSelectedTableCell();
    if (!cell) {
      alert("Please click inside a table cell first to insert a row.");
      return;
    }
    const row = cell.closest("tr");
    const table = cell.closest("table");
    if (!row || !table) return;

    const colCount = row.cells.length;
    const newRow = document.createElement("tr");
    for (let i = 0; i < colCount; i++) {
      const newCell = document.createElement("td");
      newCell.style.border = "1px solid #cbd5e1";
      newCell.style.padding = "8px 12px";
      newCell.innerHTML = "New cell";
      newRow.appendChild(newCell);
    }

    if (position === "above") {
      row.parentNode?.insertBefore(newRow, row);
    } else {
      row.parentNode?.insertBefore(newRow, row.nextSibling);
    }
    setShowTableToolsMenu(false);
    updateStats();
    queueCollabSync();
  };

  const handleAddTableColumn = (position: "left" | "right") => {
    const cell = getSelectedTableCell();
    if (!cell) {
      alert("Please click inside a table cell first to insert a column.");
      return;
    }
    const table = cell.closest("table");
    if (!table) return;

    const cellIndex = cell.cellIndex;
    const rows = table.rows;

    for (let r = 0; r < rows.length; r++) {
      const targetRow = rows[r];
      const isHeader = targetRow.parentNode?.nodeName === "THEAD" || targetRow.cells[0]?.tagName === "TH";
      const newCell = document.createElement(isHeader ? "th" : "td");
      newCell.style.border = "1px solid #94a3b8";
      newCell.style.padding = "8px 12px";
      if (isHeader) {
        newCell.style.backgroundColor = "#f1f5f9";
        newCell.style.fontWeight = "bold";
        newCell.innerHTML = "New Header";
      } else {
        newCell.innerHTML = "New cell";
      }

      const insertIndex = position === "left" ? cellIndex : cellIndex + 1;
      if (insertIndex >= targetRow.cells.length) {
        targetRow.appendChild(newCell);
      } else {
        targetRow.insertBefore(newCell, targetRow.cells[insertIndex]);
      }
    }
    setShowTableToolsMenu(false);
    updateStats();
    queueCollabSync();
  };

  const handleDeleteTableRow = () => {
    const cell = getSelectedTableCell();
    if (!cell) {
      alert("Please click inside a table row to delete it.");
      return;
    }
    const row = cell.closest("tr");
    const table = cell.closest("table");
    if (!row || !table) return;

    if (table.rows.length <= 1) {
      table.remove();
    } else {
      row.remove();
    }
    setShowTableToolsMenu(false);
    updateStats();
    queueCollabSync();
  };

  const handleDeleteTableColumn = () => {
    const cell = getSelectedTableCell();
    if (!cell) {
      alert("Please click inside a table column to delete it.");
      return;
    }
    const table = cell.closest("table");
    if (!table) return;

    const cellIndex = cell.cellIndex;
    if (table.rows[0]?.cells.length <= 1) {
      table.remove();
    } else {
      for (let r = 0; r < table.rows.length; r++) {
        table.rows[r].deleteCell(cellIndex);
      }
    }
    setShowTableToolsMenu(false);
    updateStats();
    queueCollabSync();
  };

  const handleDeleteEntireTable = () => {
    const cell = getSelectedTableCell();
    if (!cell) {
      alert("Please click inside a table to delete it.");
      return;
    }
    const table = cell.closest("table");
    if (table) {
      table.remove();
      setShowTableToolsMenu(false);
      updateStats();
      queueCollabSync();
    }
  };

  const handleApplyTableStyle = (styleName: "classic" | "striped" | "navy" | "minimal" | "modern") => {
    const cell = getSelectedTableCell();
    if (!cell) {
      alert("Please click inside a table first to apply a style.");
      return;
    }
    const table = cell.closest("table");
    if (!table) return;

    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.margin = "16px 0";

    const rows = table.rows;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const isHeader = r === 0 || row.parentNode?.nodeName === "THEAD";

      for (let c = 0; c < row.cells.length; c++) {
        const td = row.cells[c];
        td.style.padding = "8px 12px";

        if (styleName === "navy") {
          if (isHeader) {
            td.style.backgroundColor = "#1f497d";
            td.style.color = "#ffffff";
            td.style.border = "1px solid #17365d";
            td.style.fontWeight = "bold";
          } else {
            td.style.backgroundColor = r % 2 === 0 ? "#f2f6fb" : "#ffffff";
            td.style.color = "#000000";
            td.style.border = "1px solid #cbd5e1";
          }
        } else if (styleName === "striped") {
          if (isHeader) {
            td.style.backgroundColor = "#334155";
            td.style.color = "#ffffff";
            td.style.border = "1px solid #1e293b";
            td.style.fontWeight = "bold";
          } else {
            td.style.backgroundColor = r % 2 === 0 ? "#f8fafc" : "#ffffff";
            td.style.color = "#000000";
            td.style.border = "1px solid #e2e8f0";
          }
        } else if (styleName === "minimal") {
          td.style.border = "none";
          td.style.borderBottom = isHeader ? "2px solid #0f172a" : "1px solid #e2e8f0";
          td.style.backgroundColor = "transparent";
          td.style.color = "#000000";
          if (isHeader) td.style.fontWeight = "bold";
        } else if (styleName === "modern") {
          if (isHeader) {
            td.style.backgroundColor = "#0284c7";
            td.style.color = "#ffffff";
            td.style.border = "1px solid #0369a1";
            td.style.fontWeight = "bold";
          } else {
            td.style.backgroundColor = r % 2 === 0 ? "#f0f9ff" : "#ffffff";
            td.style.color = "#0f172a";
            td.style.border = "1px solid #bae6fd";
          }
        } else {
          // Classic Grid
          td.style.backgroundColor = isHeader ? "#f1f5f9" : "#ffffff";
          td.style.color = "#000000";
          td.style.border = "1px solid #94a3b8";
          if (isHeader) td.style.fontWeight = "bold";
        }
      }
    }
    setShowTableToolsMenu(false);
    updateStats();
    queueCollabSync();
  };

  // Special Indentation
  const handleFirstLineIndent = () => {
    const sel = window.getSelection();
    if (!sel) return;
    let node = sel.anchorNode;
    while (node && node !== document.body) {
      if (node instanceof HTMLElement && (node.tagName === "P" || node.tagName === "DIV")) {
        node.style.textIndent = node.style.textIndent === "0.5in" ? "0" : "0.5in";
        break;
      }
      node = node.parentNode;
    }
    updateStats();
    queueCollabSync();
  };

  const handleHangingIndent = () => {
    const sel = window.getSelection();
    if (!sel) return;
    let node = sel.anchorNode;
    while (node && node !== document.body) {
      if (node instanceof HTMLElement && (node.tagName === "P" || node.tagName === "DIV")) {
        if (node.style.paddingLeft === "0.5in") {
          node.style.paddingLeft = "0";
          node.style.textIndent = "0";
        } else {
          node.style.paddingLeft = "0.5in";
          node.style.textIndent = "-0.5in";
        }
        break;
      }
      node = node.parentNode;
    }
    updateStats();
    queueCollabSync();
  };

  // Space Before & After Paragraph
  const handleParagraphSpacing = (type: "before" | "after", action: "add" | "remove") => {
    const sel = window.getSelection();
    if (!sel) return;
    let node = sel.anchorNode;
    while (node && node !== document.body) {
      if (node instanceof HTMLElement && (node.tagName === "P" || node.tagName === "DIV")) {
        if (type === "before") {
          node.style.marginTop = action === "add" ? "12pt" : "0";
        } else {
          node.style.marginBottom = action === "add" ? "12pt" : "0";
        }
        break;
      }
      node = node.parentNode;
    }
    updateStats();
    queueCollabSync();
  };

  // Paragraph Borders
  const handleParagraphBorder = (borderType: "bottom" | "top" | "box" | "left" | "none") => {
    const sel = window.getSelection();
    if (!sel) return;
    let node = sel.anchorNode;
    while (node && node !== document.body) {
      if (node instanceof HTMLElement && (node.tagName === "P" || node.tagName === "DIV" || node.tagName === "BLOCKQUOTE")) {
        if (borderType === "none") {
          node.style.border = "none";
          node.style.padding = "0";
        } else if (borderType === "bottom") {
          node.style.border = "none";
          node.style.borderBottom = "2px solid #2b579a";
          node.style.paddingBottom = "4px";
        } else if (borderType === "top") {
          node.style.border = "none";
          node.style.borderTop = "2px solid #2b579a";
          node.style.paddingTop = "4px";
        } else if (borderType === "box") {
          node.style.border = "1px solid #94a3b8";
          node.style.borderRadius = "4px";
          node.style.padding = "8px 12px";
        } else if (borderType === "left") {
          node.style.border = "none";
          node.style.borderLeft = "4px solid #2563eb";
          node.style.paddingLeft = "12px";
        }
        break;
      }
      node = node.parentNode;
    }
    setShowBorderMenu(false);
    updateStats();
    queueCollabSync();
  };

  // Text Typography Effects
  const handleTextEffect = (effect: "shadow" | "gradient" | "smallcaps") => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      alert("Please select some text first to apply text effects.");
      return;
    }
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    if (effect === "shadow") {
      span.style.textShadow = "0 2px 4px rgba(0,0,0,0.35)";
      span.style.fontWeight = "700";
    } else if (effect === "gradient") {
      span.style.background = "linear-gradient(135deg, #1e3a8a, #0284c7)";
      span.style.webkitBackgroundClip = "text";
      span.style.webkitTextFillColor = "transparent";
      span.style.fontWeight = "bold";
    } else if (effect === "smallcaps") {
      span.style.fontVariant = "small-caps";
      span.style.letterSpacing = "0.5px";
    }
    span.appendChild(range.extractContents());
    range.insertNode(span);
    setShowTextEffectsMenu(false);
    updateStats();
    queueCollabSync();
  };

  // Insert Pull Quote
  const handleInsertPullQuote = () => {
    const html = `
      <blockquote style="margin: 20pt 0; padding: 12pt 24pt; border-top: 2px solid #1f497d; border-bottom: 2px solid #1f497d; font-family: 'Calibri Light', serif; font-size: 14pt; font-style: italic; color: #1f497d; text-align: center;">
        “Insert your key pull quote or executive takeaway message here.”
      </blockquote><p><br></p>
    `;
    exec("insertHTML", html);
  };

  // Insert Horizontal Rule / Divider
  const handleInsertHorizontalRule = () => {
    exec("insertHTML", `<hr style="border:none; border-top:1px solid #cbd5e1; margin:18pt 0;" /><p><br></p>`);
  };

  // Insert Interactive Checklist
  const handleInsertChecklist = () => {
    exec("insertHTML", `<p style="display:flex; align-items:center; gap:8px; margin: 4pt 0;"><input type="checkbox" style="width:16px; height:16px; cursor:pointer;" /> <span>Action item / task description...</span></p><p><br></p>`);
  };

  // Insert Footnote Reference
  const handleInsertFootnote = () => {
    const fnNum = Math.floor(Math.random() * 90 + 10);
    exec("insertHTML", `<sup>[${fnNum}]</sup>`);
    const activePage = pageRefs.current[activePageIndex] || pageRefs.current[0];
    if (activePage) {
      activePage.innerHTML += `<div style="font-size:9pt; color:#64748b; border-top:1px solid #e2e8f0; margin-top:20pt; padding-top:4pt;">[${fnNum}] Footnote note source citation...</div>`;
      updateStats();
      queueCollabSync();
    }
  };

  // Scroll to Heading from Navigation Pane
  const scrollToHeading = (id: string, pageIdx: number) => {
    setActivePageIndex(pageIdx);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-blue-500", "rounded", "p-0.5");
        setTimeout(() => el.classList.remove("ring-2", "ring-blue-500", "rounded", "p-0.5"), 1500);
      }
    }, 50);
  };

  // Flesch-Kincaid Proofing Calculation
  const calculateReadability = () => {
    let totalWords = 0;
    let totalSentences = 0;
    let totalSyllables = 0;

    pages.forEach((_, i) => {
      const el = pageRefs.current[i];
      const text = el ? (el.innerText || "") : "";
      if (!text.trim()) return;

      const words = text.match(/\b[A-Za-z]+\b/g) || [];
      totalWords += words.length;

      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      totalSentences += Math.max(1, sentences.length);

      words.forEach(word => {
        const lower = word.toLowerCase();
        const matches = lower.match(/[aeiouy]{1,2}/g);
        let count = matches ? matches.length : 1;
        if (lower.endsWith("e") && !lower.endsWith("le") && count > 1) count--;
        totalSyllables += Math.max(1, count);
      });
    });

    if (totalWords === 0) return { score: 100, level: "N/A", readingMinutes: 0, speakingMinutes: 0, sentences: 0, wordsPerSentence: "0" };

    const wordsPerSentence = totalWords / Math.max(1, totalSentences);
    const syllablesPerWord = totalSyllables / Math.max(1, totalWords);
    const fleschScore = Math.max(0, Math.min(100, Math.round(206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord))));

    let level = "College Graduate (Difficult)";
    if (fleschScore >= 90) level = "5th Grade (Very Easy)";
    else if (fleschScore >= 80) level = "6th Grade (Easy)";
    else if (fleschScore >= 70) level = "7th Grade (Fairly Easy)";
    else if (fleschScore >= 60) level = "8th - 9th Grade (Standard)";
    else if (fleschScore >= 50) level = "10th - 12th Grade (Fairly Difficult)";
    else if (fleschScore >= 30) level = "College Level (Difficult)";

    return {
      score: fleschScore,
      level,
      words: totalWords,
      sentences: totalSentences,
      syllables: totalSyllables,
      wordsPerSentence: wordsPerSentence.toFixed(1),
      readingMinutes: Math.max(1, Math.ceil(totalWords / 200)),
      speakingMinutes: Math.max(1, Math.ceil(totalWords / 130))
    };
  };

  // Insert Link
  const handleInsertLink = () => {
    const url = prompt("Enter hyperlink URL (e.g. https://example.com):");
    if (!url) return;
    const text = prompt("Enter text to display (or leave blank to use URL):") || url;
    exec("insertHTML", `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#2563eb; text-decoration:underline; font-weight:500;">${text}</a>`);
  };

  // Insert Image
  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        exec("insertHTML", `<div style="text-align:center; margin:16px 0;"><img src="${data.url}" alt="Word document image" style="max-width:100%; height:auto; border-radius:4px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); display:inline-block;" /></div><p><br></p>`);
      } else {
        alert(data.error || "Image upload failed");
      }
    } catch {
      alert("Failed to upload image");
    }
  };

  // Insert Math Equation (KaTeX)
  const handleInsertEquation = () => {
    const formula = prompt("Enter LaTeX Math Formula (e.g. E = mc^2 or \\int_{0}^{1} x^2 dx):");
    if (!formula) return;
    try {
      const rendered = katex.renderToString(formula, { throwOnError: false, displayMode: true });
      exec("insertHTML", `<div style="margin:16px 0; text-align:center; user-select:all;">${rendered}</div><p><br></p>`);
    } catch {
      alert("Invalid math formula");
    }
  };

  // Insert Special Symbol
  const handleInsertSymbol = (sym: string) => {
    exec("insertText", sym);
  };

  // Insert Callout Box
  const handleInsertCallout = () => {
    const html = `
      <div style="border-left: 4px solid #0284c7; background-color: #f0f9ff; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
        <p style="margin:0; font-weight:600; color:#0369a1;">Note:</p>
        <p style="margin:4px 0 0 0; color:#334155;">Type callout or highlight note here...</p>
      </div><p><br></p>
    `;
    exec("insertHTML", html);
  };

  // Insert Page Break
  const handleInsertPageBreak = () => {
    handleAddPage(activePageIndex + 1);
  };

  // Insert Date & Time
  const handleInsertDateTime = () => {
    const now = new Date();
    const formatted = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    exec("insertText", formatted);
  };

  // Find & Replace Execution across all document pages
  const handleFind = () => {
    if (!findText) {
      setFindCount(null);
      return;
    }
    const flags = matchCase ? "g" : "gi";
    let count = 0;
    pages.forEach((_, i) => {
      const el = pageRefs.current[i];
      const content = el?.innerText || "";
      const matches = content.match(new RegExp(findText, flags));
      if (matches) count += matches.length;
    });
    setFindCount(count);
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    const flags = matchCase ? "g" : "gi";
    const updated = pages.map((pageHtml, i) => {
      const el = pageRefs.current[i];
      const cur = el ? el.innerHTML : pageHtml;
      const replaced = cur.replace(new RegExp(findText, flags), replaceText);
      if (el) el.innerHTML = replaced;
      return replaced;
    });
    setPages(updated);
    updateStats();
    handleFind();
    queueCollabSync();
  };

  // Export as Word (.docx / Word HTML MIME)
  const handleExportDocx = () => {
    const fullHtml = getFullDocumentHtml();
    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title || "Document"}</title>
        <style>
          @page {
            size: ${paperSize === "letter" ? "8.5in 11in" : "21cm 29.7cm"};
            margin: ${margins === "narrow" ? "0.5in" : margins === "wide" ? "1.5in" : "1in"};
          }
          body {
            font-family: ${fontFamily};
            font-size: ${fontSize}pt;
            line-height: ${lineSpacing};
            color: #000000;
          }
          table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
          th, td { border: 1px solid #7f7f7f; padding: 6pt; }
        </style>
      </head>
      <body>
        <h1>${title || "Document"}</h1>
        ${fullHtml}
      </body>
      </html>
    `;
    const blob = new Blob([docHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.trim() || "Document"}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print Document (triggers formatted print)
  const handlePrint = () => {
    window.print();
  };

  // Import Document (.docx, .doc, .html, .txt, .md) with Mammoth binary decoding & alignment preservation
  const handleDocImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lowerName = file.name.toLowerCase();

    try {
      if (lowerName.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const html = await parseDocxBuffer(arrayBuffer);
        if (html) {
          const parsedPages = splitIntoPages(html);
          setPages(parsedPages);
          setPageCount(parsedPages.length);
          setActivePageIndex(0);
          setTimeout(() => {
            parsedPages.forEach((p, idx) => {
              if (pageRefs.current[idx]) {
                pageRefs.current[idx]!.innerHTML = p;
              }
            });
            updateStats();
            queueCollabSync();
          }, 0);
        } else {
          alert("Could not extract content from this Word document (.docx).");
        }
      } else if (lowerName.endsWith(".html") || lowerName.endsWith(".htm") || lowerName.endsWith(".doc")) {
        const text = await file.text();
        let cleanHtml = text;
        if (text.includes("<html") || text.includes("<body") || text.includes("<p>")) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "text/html");
          cleanHtml = doc.body.innerHTML || text;
        } else {
          cleanHtml = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
        }
        const parsedPages = splitIntoPages(cleanHtml);
        setPages(parsedPages);
        setPageCount(parsedPages.length);
        setActivePageIndex(0);
        setTimeout(() => {
          parsedPages.forEach((p, idx) => {
            if (pageRefs.current[idx]) {
              pageRefs.current[idx]!.innerHTML = p;
            }
          });
          updateStats();
          queueCollabSync();
        }, 0);
      } else {
        const text = await file.text();
        const cleanHtml = text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");
        const parsedPages = splitIntoPages(cleanHtml);
        setPages(parsedPages);
        setPageCount(parsedPages.length);
        setActivePageIndex(0);
        setTimeout(() => {
          parsedPages.forEach((p, idx) => {
            if (pageRefs.current[idx]) {
              pageRefs.current[idx]!.innerHTML = p;
            }
          });
          updateStats();
          queueCollabSync();
        }, 0);
      }
    } catch (err) {
      console.error("Document import error:", err);
      alert("Failed to parse Word document. Please ensure it is a valid .docx file.");
    }
  };

  // Start Word Collab session
  const handleStartWordCollab = async () => {
    try {
      const currentHtml = getFullDocumentHtml();
      const res = await fetch("/api/duo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Untitled Word Document",
          content: currentHtml
        })
      });
      const data = await res.json();
      if (res.ok && data.session) {
        setCollabSession(data.session);
        setClientId(data.clientId);
        setRole("host");
        setCollaboratorsCount(1);
        setSyncStatus("synced");

        const inviteUrl = `${window.location.origin}/duo/${data.pin}?mode=word`;
        try {
          const qr = await QRCode.toDataURL(inviteUrl, {
            width: 180,
            margin: 1,
            color: { dark: "#09090b", light: "#ffffff" }
          });
          setCollabQrUrl(qr);
        } catch (e) {
          console.warn("QR code error:", e);
        }
        setShowCollabModal(true);
        setCollabTab("start");
      }
    } catch (err) {
      console.error("Start Word Collab error:", err);
      alert("Failed to start Word Collab session.");
    }
  };

  // Join Word Collab session
  const handleJoinWordCollab = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = collabJoinPin.trim().replace(/\s+/g, "");
    if (!cleanPin) {
      setJoinCollabError("Please enter a 6-digit collaboration PIN.");
      return;
    }
    setIsJoiningCollab(true);
    setJoinCollabError(null);

    try {
      const res = await fetch("/api/duo/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: cleanPin })
      });
      const data = await res.json();
      if (res.ok && data.session) {
        setCollabSession(data.session);
        setClientId(data.clientId);
        setRole("guest");
        setCollaboratorsCount(2);
        if (data.session.title) setTitle(data.session.title);
        if (data.session.content) {
          const parsedPages = splitIntoPages(data.session.content);
          setPages(parsedPages);
          setPageCount(parsedPages.length);
          setActivePageIndex(0);
          setTimeout(() => {
            parsedPages.forEach((p, idx) => {
              if (pageRefs.current[idx]) {
                pageRefs.current[idx]!.innerHTML = p;
              }
            });
            updateStats();
          }, 0);
        }
        setShowCollabModal(false);
      } else {
        setJoinCollabError(data.error || "Session not found or expired.");
      }
    } catch (err) {
      setJoinCollabError("Network error joining Word Collab.");
    } finally {
      setIsJoiningCollab(false);
    }
  };

  // Publish (handles both local document and synchronized Word Collab)
  const handlePublish = async () => {
    const content = getFullDocumentHtml();
    if (!content.trim() || content === "<p><br></p>") {
      alert("Please add some content to your Word document before publishing.");
      return;
    }

    if (collabSession) {
      try {
        const res = await fetch("/api/duo/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pin: collabSession.pin,
            visibility: "public"
          })
        });
        const data = await res.json();
        if (res.ok && data.slug) {
          try {
            sessionStorage.setItem(`sharepaste_cache_${data.slug}`, JSON.stringify({
              slug: data.slug,
              title,
              content,
              isEncrypted: false,
              visibility: "public",
              authorName: "Word Collab Collaborators",
              createdAt: Date.now(),
              updatedAt: Date.now()
            }));
          } catch {}
          if (onPublishSuccess) onPublishSuccess(data.slug);
          else onPublishClick(title, content);
        } else {
          alert(data.error || "Failed to publish shared Word document.");
        }
      } catch {
        alert("Network error publishing shared Word document.");
      }
    } else {
      onPublishClick(title, content);
    }
  };

  // Paper styling depending on options
  const getMarginClass = () => {
    if (margins === "narrow") return "p-6";
    if (margins === "wide") return "p-14 sm:p-20";
    if (margins === "moderate") return "p-8 sm:p-12";
    return "p-8 sm:p-16"; // normal (1 inch)
  };

  const getPageWidthClass = () => {
    if (viewMode === "web") return "max-w-5xl w-full";
    if (viewMode === "focus") return "max-w-4xl w-full";
    if (orientation === "landscape") return "max-w-[1100px] w-full min-h-[750px]";
    return "max-w-[850px] w-full min-h-[1100px]"; // Portrait A4
  };

  const getPaperBg = () => {
    if (pageBgColor === "dark") return "bg-slate-900 text-slate-100 border-slate-800 shadow-2xl";
    if (pageBgColor === "cream") return "bg-[#faf8f0] text-gray-900 border-[#eae4d3] shadow-xl";
    if (pageBgColor === "sepia") return "bg-[#f4ecd8] text-[#5c4b37] border-[#e2d5bc] shadow-xl";
    return "bg-white text-gray-900 border-gray-200/90 shadow-2xl";
  };

  const getPageBorderClasses = () => {
    if (pageBorderStyle === "box") return "border-2 border-gray-900 dark:border-slate-300 shadow-md";
    if (pageBorderStyle === "double") return "border-4 border-double border-[#1f497d] shadow-md";
    if (pageBorderStyle === "shadow") return "border border-gray-300 dark:border-slate-700 shadow-2xl";
    return "border border-gray-200/90 shadow-md hover:shadow-lg";
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full max-h-full overflow-hidden bg-[#f3f4f6] dark:bg-[#0f172a] select-none text-slate-800 dark:text-slate-200 transition-colors">
      
      {/* 1. Word Header Bar (Title, Quick Access Toolbar, Live Collab Bar, Mode Switcher) */}
      <div className="h-11 bg-[#2b579a] dark:bg-[#1e3a8a] text-white px-3 sm:px-4 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Word App Logo Badge */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-700/80 rounded flex items-center justify-center font-serif font-black text-sm tracking-tighter border border-white/20">
              W
            </div>
            <span className="font-semibold text-xs tracking-wide hidden sm:inline">
              SharePaste Word
            </span>
          </div>

          <div className="h-4 w-px bg-white/20 hidden sm:block" />

          {/* Quick Access Icons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handlePublish}
              className="p-1.5 hover:bg-white/15 rounded transition"
              title="Save & Publish to SharePaste (Ctrl+S)"
            >
              <FileDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => exec("undo")}
              className="p-1.5 hover:bg-white/15 rounded transition"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => exec("redo")}
              className="p-1.5 hover:bg-white/15 rounded transition"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 hover:bg-white/15 rounded transition hidden sm:block"
              title="Print Document (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>

          {/* Document Title Input */}
          <div className="flex items-center ml-1 sm:ml-2">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                queueCollabSync();
              }}
              className="bg-transparent hover:bg-white/10 focus:bg-white/20 px-2 py-0.5 rounded text-xs sm:text-sm font-medium text-white outline-none w-32 sm:w-56 transition"
              placeholder="Document Title..."
              title="Click to rename document"
            />
            <span className="text-[10px] text-white/70 ml-2 hidden md:inline">
              {collabSession ? (syncStatus === "saving" ? "Syncing..." : "Synced live") : savedTime}
            </span>
          </div>
        </div>

        {/* Right Header Controls (Word Collab Status, Switcher, Publish) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {collabSession ? (
            /* Live Word Collab Status Bar */
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-500/30 border border-purple-300/40 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-[11px] tracking-tight hidden sm:inline">Collab Live</span>

              {/* PIN button */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(collabSession.pin);
                  setCopiedCollabPin(true);
                  setTimeout(() => setCopiedCollabPin(false), 2000);
                }}
                className="px-1.5 py-0.5 rounded bg-black/25 hover:bg-black/40 font-mono text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition"
                title="Click to copy 6-digit PIN"
              >
                <span>PIN:{collabSession.pin}</span>
                {copiedCollabPin ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-white/70" />}
              </button>

              {/* Role Badge */}
              <span className="px-1.5 py-0.2 rounded bg-white/20 text-[9px] font-bold uppercase tracking-wider hidden md:inline">
                {role === "host" ? "User A (Host)" : "User B (Guest)"}
              </span>

              {/* Collaborators Count */}
              <span className="text-[10px] text-white/90 hidden lg:inline font-semibold">
                {collaboratorsCount > 1 ? "👥 2 Online" : "👥 Waiting for B..."}
              </span>

              {/* Typing indicator */}
              {lastRemoteUpdate && (
                <span className="text-[10px] text-amber-300 font-bold animate-pulse hidden xl:inline">
                  {lastRemoteUpdate}
                </span>
              )}

              {/* Copy Invite Link */}
              <button
                type="button"
                onClick={() => {
                  const link = `${window.location.origin}/duo/${collabSession.pin}?mode=word`;
                  navigator.clipboard.writeText(link);
                  setCopiedCollabLink(true);
                  setTimeout(() => setCopiedCollabLink(false), 2000);
                }}
                className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-medium flex items-center gap-1 transition"
                title="Copy invite link with PIN"
              >
                <Link className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">{copiedCollabLink ? "Copied!" : "Invite Link"}</span>
              </button>

              {/* Leave Button */}
              <button
                type="button"
                onClick={() => {
                  if (confirm("Leave live Word Collab session?")) {
                    setCollabSession(null);
                    if (onLeaveCollab) onLeaveCollab();
                  }
                }}
                className="p-1 hover:bg-red-500/40 rounded text-white/80 hover:text-white transition"
                title="Leave Word Collab"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            /* Start / Join Word Collab Button */
            <button
              type="button"
              onClick={() => {
                setShowCollabModal(true);
                setCollabTab("start");
              }}
              className="px-2.5 py-1 rounded bg-purple-500/30 hover:bg-purple-500/50 text-white text-xs font-semibold flex items-center gap-1.5 border border-purple-300/40 transition cursor-pointer"
              title="Word Collab: Real-time two-person live synchronized editor (User A & B)"
            >
              <Users className="w-3.5 h-3.5 text-purple-200" />
              <span>Word Collab</span>
            </button>
          )}

          {/* Switch to Standard Note Switcher */}
          {onSwitchToStandard && (
            <button
              type="button"
              onClick={onSwitchToStandard}
              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1 transition cursor-pointer"
              title="Switch to Standard Note Editor"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Standard Note</span>
            </button>
          )}

          {/* Direct Publish CTA */}
          <button
            type="button"
            onClick={handlePublish}
            className="px-3 py-1 rounded bg-white text-[#2b579a] hover:bg-blue-50 font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{collabSession ? "Publish Shared Doc" : "Publish"}</span>
          </button>
        </div>
      </div>

      {/* 2. Microsoft Word Ribbon Tabs Header */}
      <div className="bg-[#f3f4f6] dark:bg-slate-900 border-b border-gray-300 dark:border-slate-800 px-4 flex items-center gap-1 text-xs font-semibold shrink-0">
        {[
          { id: "file", label: "File" },
          { id: "home", label: "Home" },
          { id: "insert", label: "Insert" },
          { id: "layout", label: "Layout" },
          { id: "review", label: "Review" },
          { id: "view", label: "View" }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 uppercase tracking-wider text-[11px] font-bold transition border-b-2 ${
              activeTab === tab.id
                ? "border-[#2b579a] text-[#2b579a] dark:text-blue-400 bg-white dark:bg-slate-800 rounded-t-sm"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-slate-800/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Ribbon Toolbar Controls Canvas */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-300 dark:border-slate-800 p-2 sm:px-4 shadow-xs shrink-0 flex flex-wrap items-center gap-y-2 gap-x-3 text-xs relative z-30">
        
        {/* --- FILE TAB --- */}
        {activeTab === "file" && (
          <div className="flex items-center gap-2 py-1 flex-wrap">
            <button
              type="button"
              onClick={handlePublish}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Publish to SharePaste</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCollabModal(true);
                setCollabTab("start");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Word Collab Live (A & B)</span>
            </button>
            <button
              type="button"
              onClick={handleExportDocx}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 font-semibold border border-gray-300 dark:border-slate-700 cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Export Word (.doc / .docx)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 font-semibold border border-gray-300 dark:border-slate-700 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={() => docxInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 font-semibold border border-gray-300 dark:border-slate-700 cursor-pointer"
              title="Open any Word .docx, .html, or text document"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Open / Import Word Doc</span>
            </button>
            <input
              type="file"
              ref={docxInputRef}
              onChange={handleDocImport}
              accept=".docx,.doc,.html,.htm,.txt,.md"
              className="hidden"
            />
          </div>
        )}

        {/* --- HOME TAB (MICROSOFT WORD FORMATTING SUITE) --- */}
        {activeTab === "home" && (
          <>
            {/* Clipboard Group */}
            <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => exec("copy")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Copy (Ctrl+C)"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec("cut")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Cut (Ctrl+X)"
              >
                <Scissors className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleFormatPainterClick}
                className={`p-1.5 rounded transition ${
                  formatPainterStyle
                    ? "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-400"
                    : "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300"
                }`}
                title="Format Painter (Select text, click to copy format, select target to apply)"
              >
                <Paintbrush className="w-4 h-4" />
              </button>
            </div>

            {/* Font Family & Size Group */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-gray-200 dark:border-slate-800">
              {/* Font Family Dropdown */}
              <select
                value={fontFamily}
                onChange={(e) => handleFontFamilyChange(e.target.value)}
                className="h-8 px-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none max-w-[130px] sm:max-w-[150px]"
                title="Font Family"
              >
                {FONT_FAMILIES.map(f => (
                  <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </option>
                ))}
              </select>

              {/* Font Size Dropdown */}
              <select
                value={fontSize}
                onChange={(e) => handleFontSizeChange(e.target.value)}
                className="h-8 px-1.5 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none w-14"
                title="Font Size (pt)"
              >
                {FONT_SIZES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Grow / Shrink Font Buttons */}
              <button
                type="button"
                onClick={handleGrowFont}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded font-bold"
                title="Grow Font (+2pt)"
              >
                A<span className="text-[9px] -mt-1 font-bold">^</span>
              </button>
              <button
                type="button"
                onClick={handleShrinkFont}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded font-bold"
                title="Shrink Font (-2pt)"
              >
                A<span className="text-[9px] font-bold">v</span>
              </button>

              {/* Change Case Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCaseMenu(!showCaseMenu)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded flex items-center font-bold text-xs"
                  title="Change Case (UPPERCASE, lowercase, Title Case, etc.)"
                >
                  <span>Aa</span>
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>
                {showCaseMenu && (
                  <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50">
                    <button
                      type="button"
                      onClick={() => handleChangeCase("sentence")}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      Sentence case.
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeCase("lower")}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      lowercase
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeCase("upper")}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      UPPERCASE
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeCase("title")}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      Capitalize Each Word
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangeCase("toggle")}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                      tOGGLE cASE
                    </button>
                  </div>
                )}
              </div>

              {/* Clear Formatting */}
              <button
                type="button"
                onClick={handleClearFormatting}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Clear All Formatting"
              >
                <span className="font-bold relative">
                  A<span className="text-[10px] text-pink-500 absolute -top-1 -right-1 font-bold">/</span>
                </span>
              </button>
            </div>

            {/* Font Character Formats (B, I, U, S, Sub, Super, Highlight, Color) */}
            <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => exec("bold")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded font-bold"
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec("italic")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </button>

              {/* Underline with Styles Menu */}
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={() => exec("underline")}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-l"
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnderlineMenu(!showUnderlineMenu)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-r text-gray-500"
                  title="Underline Styles (Double, Dotted, Wavy)"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showUnderlineMenu && (
                  <div className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50">
                    <button
                      type="button"
                      onClick={() => handleUnderlineStyle("solid")}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800 underline"
                    >
                      Solid Underline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnderlineStyle("double")}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800 underline decoration-double"
                    >
                      Double Underline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnderlineStyle("dotted")}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800 underline decoration-dotted"
                    >
                      Dotted Underline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnderlineStyle("dashed")}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800 underline decoration-dashed"
                    >
                      Dashed Underline
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnderlineStyle("wavy")}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800 underline decoration-wavy"
                    >
                      Wavy Underline
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => exec("strikeThrough")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Strikethrough"
              >
                <Strikethrough className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec("subscript")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Subscript (X₂)"
              >
                <Subscript className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec("superscript")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Superscript (X²)"
              >
                <Superscript className="w-4 h-4" />
              </button>

              {/* Text Highlight Color (Classic 15-Color Word Grid) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded flex items-center gap-0.5"
                  title="Text Highlight Color"
                >
                  <Highlighter className="w-4 h-4 text-amber-500" />
                  <div className="w-3.5 h-1 rounded-sm mt-0.5" style={{ backgroundColor: highlightColor }} />
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                </button>

                {showHighlightPicker && (
                  <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 w-52">
                    <div className="text-[11px] font-bold uppercase text-gray-400 mb-2">Highlight Colors</div>
                    <div className="grid grid-cols-5 gap-1.5 mb-3">
                      {HIGHLIGHT_COLORS.map(c => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => handleApplyHighlight(c.color)}
                          className="w-7 h-7 rounded border border-gray-300 dark:border-slate-600 hover:scale-110 transition shadow-xs"
                          style={{ backgroundColor: c.color }}
                          title={c.name}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyHighlight("transparent")}
                      className="w-full py-1 text-center text-xs font-semibold rounded bg-gray-100 dark:bg-slate-800 hover:bg-gray-200"
                    >
                      No Color
                    </button>
                  </div>
                )}
              </div>

              {/* Font Color Picker (Office Theme Colors Matrix) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFontColorPicker(!showFontColorPicker)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded flex items-center gap-0.5"
                  title="Font Color (Office Theme Matrix)"
                >
                  <span className="font-serif font-black text-sm">A</span>
                  <div className="w-3.5 h-1 rounded-sm mt-0.5" style={{ backgroundColor: fontColor }} />
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                </button>

                {showFontColorPicker && (
                  <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 w-64">
                    <div className="text-[11px] font-bold uppercase text-gray-400 mb-1.5">Theme Colors</div>
                    <div className="space-y-1 mb-3">
                      {THEME_COLORS.map((row, rIdx) => (
                        <div key={rIdx} className="grid grid-cols-10 gap-1">
                          {row.map((col, cIdx) => (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={() => handleApplyFontColor(col)}
                              className="w-5 h-5 rounded-xs border border-black/10 hover:scale-125 transition"
                              style={{ backgroundColor: col }}
                              title={col}
                            />
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] font-bold uppercase text-gray-400 mb-1.5">Standard Colors</div>
                    <div className="grid grid-cols-10 gap-1 mb-3">
                      {STANDARD_COLORS.map((col, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyFontColor(col)}
                          className="w-5 h-5 rounded-xs border border-black/10 hover:scale-125 transition"
                          style={{ backgroundColor: col }}
                          title={col}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-slate-800">
                      <label className="text-xs font-medium">More Colors:</label>
                      <input
                        type="color"
                        value={fontColor}
                        onChange={(e) => handleApplyFontColor(e.target.value)}
                        className="w-7 h-7 p-0 rounded border cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Text Effects & Typography Menu (Word 365 Style) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTextEffectsMenu(!showTextEffectsMenu)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded flex items-center text-xs"
                  title="Text Effects and Typography (Shadow, Gradient, Small Caps)"
                >
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                </button>
                {showTextEffectsMenu && (
                  <>
                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowTextEffectsMenu(false)} />
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 z-50">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Word Typography</div>
                      <button
                        type="button"
                        onClick={() => handleTextEffect("shadow")}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center gap-2"
                      >
                        <span style={{ textShadow: "0 2px 4px rgba(0,0,0,0.4)", fontWeight: "bold" }}>Drop Shadow</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTextEffect("gradient")}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center gap-2"
                      >
                        <span className="font-bold bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent">Word Gradient</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTextEffect("smallcaps")}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center gap-2"
                      >
                        <span style={{ fontVariant: "small-caps", letterSpacing: "1px", fontWeight: "600" }}>Small Caps (ABC)</span>
                      </button>
                      <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />
                      <button
                        type="button"
                        onClick={handleClearFormatting}
                        className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                      >
                        <span>Clear Typography Formats</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Paragraph Formatting (Bullets, Numbering, Checkbox, Align, Spacing, Shading, Borders) */}
            <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => exec("insertUnorderedList")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec("insertOrderedList")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec("insertHTML", `<p><input type="checkbox" style="margin-right:8px;" /> Task item</p>`)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Checklist / Task List"
              >
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              </button>
              <button
                type="button"
                onClick={() => exec("outdent")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Decrease Indent"
              >
                <Outdent className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec("indent")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Increase Indent"
              >
                <Indent className="w-4 h-4" />
              </button>

              {/* Alignments */}
              <div className="h-4 w-px bg-gray-200 dark:bg-slate-800 mx-0.5" />
              <button
                type="button"
                onClick={() => exec("justifyLeft")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Align Left (Ctrl+L)"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec("justifyCenter")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Align Center (Ctrl+E)"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec("justifyRight")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Align Right (Ctrl+R)"
              >
                <AlignRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec("justifyFull")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Justify (Ctrl+J)"
              >
                <AlignJustify className="w-4 h-4" />
              </button>

              {/* Line & Paragraph Spacing Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLineSpacingMenu(!showLineSpacingMenu)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded flex items-center text-xs"
                  title="Line and Paragraph Spacing"
                >
                  <span className="font-semibold">{lineSpacing}</span>
                  <ChevronDown className="w-3 h-3 ml-0.5 text-gray-500" />
                </button>
                {showLineSpacingMenu && (
                  <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50">
                    {["1.0", "1.15", "1.5", "2.0", "2.5", "3.0"].map(spacing => (
                      <button
                        key={spacing}
                        type="button"
                        onClick={() => handleLineSpacing(spacing)}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-between ${
                          lineSpacing === spacing ? "font-bold text-blue-600" : ""
                        }`}
                      >
                        <span>{spacing}</span>
                        {lineSpacing === spacing && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Paragraph Shading (Background color) */}
              <button
                type="button"
                onClick={() => handleParagraphShading("#f8fafc")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
                title="Paragraph Shading (Light)"
              >
                <Palette className="w-4 h-4 text-indigo-500" />
              </button>

              {/* Special Indents: First-Line & Hanging */}
              <button
                type="button"
                onClick={handleFirstLineIndent}
                className="px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-xs font-semibold"
                title="First-Line Indent (0.5 in for standard APA/MLA paragraphs)"
              >
                1st Indent
              </button>
              <button
                type="button"
                onClick={handleHangingIndent}
                className="px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-xs font-semibold"
                title="Hanging Indent (0.5 in for references and bibliographies)"
              >
                Hanging
              </button>

              {/* Paragraph Spacing (+12pt Before / After) */}
              <button
                type="button"
                onClick={() => handleParagraphSpacing("after", "add")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-xs font-semibold"
                title="Add 12pt Space After Paragraph"
              >
                +12pt
              </button>

              {/* Paragraph Borders Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowBorderMenu(!showBorderMenu)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded flex items-center"
                  title="Paragraph Borders (Bottom, Top, Box, Accent Line)"
                >
                  <Sliders className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  <ChevronDown className="w-3 h-3 text-gray-500" />
                </button>
                {showBorderMenu && (
                  <>
                    <div className="fixed inset-0 z-40 cursor-default" onClick={() => setShowBorderMenu(false)} />
                    <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 z-50">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Borders</div>
                      <button
                        type="button"
                        onClick={() => handleParagraphBorder("bottom")}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800 border-b border-gray-300 dark:border-slate-700"
                      >
                        Bottom Border
                      </button>
                      <button
                        type="button"
                        onClick={() => handleParagraphBorder("top")}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800 border-t border-gray-300 dark:border-slate-700"
                      >
                        Top Border
                      </button>
                      <button
                        type="button"
                        onClick={() => handleParagraphBorder("box")}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800"
                      >
                        Outside Box Border
                      </button>
                      <button
                        type="button"
                        onClick={() => handleParagraphBorder("left")}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-slate-800 border-l-4 border-blue-600 pl-2 ml-1"
                      >
                        Left Accent Line
                      </button>
                      <button
                        type="button"
                        onClick={() => handleParagraphBorder("none")}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                      >
                        No Border
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Styles Gallery */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-gray-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => applyQuickStyle({ name: "Normal", tag: "p", css: "font-size:11pt; line-height:1.15; margin:0 0 8pt 0;" })}
                className="px-2.5 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 font-normal"
                title="Normal Style"
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => applyQuickStyle({ name: "Heading 1", tag: "h1", css: "font-size:20pt; font-weight:bold; color:#1f497d; margin:16pt 0 6pt 0;" })}
                className="px-2.5 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 font-bold text-[#1f497d] dark:text-blue-400"
                title="Heading 1 Style"
              >
                Heading 1
              </button>
              <button
                type="button"
                onClick={() => applyQuickStyle({ name: "Heading 2", tag: "h2", css: "font-size:15pt; font-weight:bold; color:#2e6c80; margin:12pt 0 4pt 0;" })}
                className="px-2.5 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 font-bold text-teal-700 dark:text-teal-400"
                title="Heading 2 Style"
              >
                Heading 2
              </button>
              <button
                type="button"
                onClick={() => applyQuickStyle({ name: "Title", tag: "h1", css: "font-size:28pt; font-weight:900; color:#0f243e; margin:20pt 0 8pt 0; text-align:center;" })}
                className="px-2.5 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 font-black hidden md:block"
                title="Title Style"
              >
                Title
              </button>
            </div>

            {/* Table Inserter Grid on Home Tab */}
            <div className="relative pr-2 border-r border-gray-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowTableGridPicker(!showTableGridPicker)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-blue-50 dark:hover:bg-slate-800 border border-blue-200 dark:border-slate-700 bg-blue-50/60 dark:bg-slate-800/60 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer"
                title="Insert Table (Click to open grid picker)"
              >
                <TableIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Table</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {showTableGridPicker && (
                <>
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setShowTableGridPicker(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-50">
                    <div className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-2">
                      Insert Table ({tableGridHover.rows} x {tableGridHover.cols})
                    </div>
                    <div className="grid grid-cols-8 gap-1 mb-2">
                      {Array.from({ length: 8 }).map((_, r) =>
                        Array.from({ length: 8 }).map((_, c) => (
                          <div
                            key={`home-${r}-${c}`}
                            onMouseEnter={() => setTableGridHover({ rows: r + 1, cols: c + 1 })}
                            onClick={() => handleInsertGridTable(r + 1, c + 1)}
                            className={`w-4 h-4 rounded-xs border cursor-pointer transition ${
                              r < tableGridHover.rows && c < tableGridHover.cols
                                ? "bg-blue-600 border-blue-700"
                                : "bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                            }`}
                          />
                        ))
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 text-center">
                      Hover over grid & click to insert
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Table Tools: Rows, Columns, Deletions, Themes on Home Tab */}
            <div className="relative pr-2 border-r border-gray-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowTableToolsMenu(!showTableToolsMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-purple-50 dark:hover:bg-slate-800 border border-purple-200 dark:border-slate-700 bg-purple-50/60 dark:bg-slate-800/60 text-purple-700 dark:text-purple-300 font-semibold cursor-pointer"
                title="Table Tools (Add/Delete Rows & Columns, Table Styles)"
              >
                <Rows className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Table Tools</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {showTableToolsMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setShowTableToolsMenu(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Rows & Columns</div>
                    <button
                      type="button"
                      onClick={() => handleAddTableRow("above")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span>Insert Row Above</span>
                      <span className="text-[10px] text-gray-400">+Row ↑</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTableRow("below")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span>Insert Row Below</span>
                      <span className="text-[10px] text-gray-400">+Row ↓</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTableColumn("left")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span>Insert Col Left</span>
                      <span className="text-[10px] text-gray-400">+Col ←</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTableColumn("right")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span>Insert Col Right</span>
                      <span className="text-[10px] text-gray-400">+Col →</span>
                    </button>

                    <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-red-500">Delete</div>
                    <button
                      type="button"
                      onClick={handleDeleteTableRow}
                      className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      Delete Row
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteTableColumn}
                      className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      Delete Column
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteEntireTable}
                      className="w-full text-left px-3 py-1.5 text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      Delete Entire Table
                    </button>

                    <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">Table Themes</div>
                    <button
                      type="button"
                      onClick={() => handleApplyTableStyle("navy")}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <div className="w-3.5 h-3.5 rounded bg-[#1f497d]" />
                      <span>Navy Blue Accent</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTableStyle("striped")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <div className="w-3.5 h-3.5 rounded bg-[#334155]" />
                      <span>Alternating Striped</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTableStyle("modern")}
                      className="w-full text-left px-3 py-1.5 hover:bg-sky-50 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <div className="w-3.5 h-3.5 rounded bg-[#0284c7]" />
                      <span>Modern Sky Blue</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTableStyle("minimal")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <div className="w-3.5 h-3.5 rounded border border-gray-400 bg-white" />
                      <span>Minimal Line</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTableStyle("classic")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <div className="w-3.5 h-3.5 rounded bg-gray-200 border border-gray-400" />
                      <span>Classic Grid</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Editing / Find & Replace */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowFindReplace(!showFindReplace)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded flex items-center gap-1"
                title="Find & Replace (Ctrl+F)"
              >
                <Search className="w-4 h-4 text-blue-600" />
                <span className="hidden lg:inline text-xs font-semibold">Find</span>
              </button>
              <button
                type="button"
                onClick={() => exec("selectAll")}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-xs font-semibold"
                title="Select All (Ctrl+A)"
              >
                Select All
              </button>
            </div>
          </>
        )}

        {/* --- INSERT TAB --- */}
        {activeTab === "insert" && (
          <div className="flex items-center gap-2 py-1 flex-wrap">
            {/* Table Inserter Grid */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTableGridPicker(!showTableGridPicker)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-blue-50 dark:hover:bg-slate-800 border border-blue-200 dark:border-slate-700 bg-blue-50/60 dark:bg-slate-800/60 text-blue-700 dark:text-blue-300 font-semibold cursor-pointer"
                title="Insert Table"
              >
                <TableIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Table</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {showTableGridPicker && (
                <>
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setShowTableGridPicker(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl z-50">
                    <div className="text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-2">
                      Insert Table ({tableGridHover.rows} x {tableGridHover.cols})
                    </div>
                    <div className="grid grid-cols-8 gap-1 mb-2">
                      {Array.from({ length: 8 }).map((_, r) =>
                        Array.from({ length: 8 }).map((_, c) => (
                          <div
                            key={`insert-${r}-${c}`}
                            onMouseEnter={() => setTableGridHover({ rows: r + 1, cols: c + 1 })}
                            onClick={() => handleInsertGridTable(r + 1, c + 1)}
                            className={`w-4 h-4 rounded-xs border cursor-pointer transition ${
                              r < tableGridHover.rows && c < tableGridHover.cols
                                ? "bg-blue-600 border-blue-700"
                                : "bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-700"
                            }`}
                          />
                        ))
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 text-center">
                      Hover over grid & click to insert
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Table Tools on Insert Tab */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTableToolsMenu(!showTableToolsMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-purple-50 dark:hover:bg-slate-800 border border-purple-200 dark:border-slate-700 bg-purple-50/60 dark:bg-slate-800/60 text-purple-700 dark:text-purple-300 font-semibold cursor-pointer"
                title="Table Tools (Add/Delete Rows & Columns, Table Styles)"
              >
                <Rows className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Table Tools</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {showTableToolsMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setShowTableToolsMenu(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Rows & Columns</div>
                    <button
                      type="button"
                      onClick={() => handleAddTableRow("above")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span>Insert Row Above</span>
                      <span className="text-[10px] text-gray-400">+Row ↑</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTableRow("below")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span>Insert Row Below</span>
                      <span className="text-[10px] text-gray-400">+Row ↓</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTableColumn("left")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span>Insert Col Left</span>
                      <span className="text-[10px] text-gray-400">+Col ←</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddTableColumn("right")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-between"
                    >
                      <span>Insert Col Right</span>
                      <span className="text-[10px] text-gray-400">+Col →</span>
                    </button>

                    <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-red-500">Delete</div>
                    <button
                      type="button"
                      onClick={handleDeleteTableRow}
                      className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      Delete Row
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteTableColumn}
                      className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      Delete Column
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteEntireTable}
                      className="w-full text-left px-3 py-1.5 text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      Delete Entire Table
                    </button>

                    <div className="h-px bg-gray-100 dark:bg-slate-800 my-1" />
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">Table Themes</div>
                    <button
                      type="button"
                      onClick={() => handleApplyTableStyle("navy")}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <div className="w-3.5 h-3.5 rounded bg-[#1f497d]" />
                      <span>Navy Blue Accent</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTableStyle("striped")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <div className="w-3.5 h-3.5 rounded bg-[#334155]" />
                      <span>Alternating Striped</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTableStyle("modern")}
                      className="w-full text-left px-3 py-1.5 hover:bg-sky-50 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <div className="w-3.5 h-3.5 rounded bg-[#0284c7]" />
                      <span>Modern Sky Blue</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTableStyle("minimal")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <div className="w-3.5 h-3.5 rounded border border-gray-400 bg-white" />
                      <span>Minimal Line</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyTableStyle("classic")}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center gap-2"
                    >
                      <div className="w-3.5 h-3.5 rounded bg-gray-200 border border-gray-400" />
                      <span>Classic Grid</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Picture Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"
              title="Insert Pictures"
            >
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span>Pictures</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
              accept="image/*"
              className="hidden"
            />

            {/* Hyperlink */}
            <button
              type="button"
              onClick={handleInsertLink}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"
              title="Insert Hyperlink"
            >
              <Link className="w-4 h-4 text-blue-500" />
              <span>Link</span>
            </button>

            {/* Pull Quote */}
            <button
              type="button"
              onClick={handleInsertPullQuote}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"
              title="Insert Pull Quote"
            >
              <Quote className="w-4 h-4 text-indigo-500" />
              <span>Pull Quote</span>
            </button>

            {/* Callout Box */}
            <button
              type="button"
              onClick={handleInsertCallout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"
              title="Insert Callout / Text Box"
            >
              <FileText className="w-4 h-4 text-amber-500" />
              <span>Callout Box</span>
            </button>

            {/* Horizontal Line Divider */}
            <button
              type="button"
              onClick={handleInsertHorizontalRule}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"
              title="Insert Horizontal Divider Line"
            >
              <Minus className="w-4 h-4 text-slate-500" />
              <span>Horizontal Line</span>
            </button>

            {/* Checklist Item */}
            <button
              type="button"
              onClick={handleInsertChecklist}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"
              title="Insert Checklist Item"
            >
              <CheckSquare className="w-4 h-4 text-emerald-500" />
              <span>Checklist</span>
            </button>

            {/* Footnote Citation */}
            <button
              type="button"
              onClick={handleInsertFootnote}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"
              title="Insert Footnote Citation"
            >
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span>Footnote</span>
            </button>

            {/* Page Break */}
            <button
              type="button"
              onClick={handleInsertPageBreak}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"
              title="Insert Page Break"
            >
              <Minus className="w-4 h-4 text-purple-600" />
              <span>Page Break</span>
            </button>

            {/* Math Equation */}
            <button
              type="button"
              onClick={handleInsertEquation}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"
              title="Insert Math Equation (LaTeX)"
            >
              <Sigma className="w-4 h-4 text-indigo-600" />
              <span>Equation</span>
            </button>

            {/* Symbols */}
            <div className="flex items-center gap-1 px-2 border-l border-gray-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-gray-500 mr-1">Symbols:</span>
              {["€", "£", "¥", "©", "®", "™", "°", "±", "≠", "≤", "≥", "√", "∞", "π"].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleInsertSymbol(s)}
                  className="w-6 h-6 hover:bg-gray-100 dark:hover:bg-slate-800 rounded font-semibold text-xs"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Date & Time */}
            <button
              type="button"
              onClick={handleInsertDateTime}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"
              title="Insert Today's Date"
            >
              <Calendar className="w-4 h-4 text-cyan-600" />
              <span>Date & Time</span>
            </button>
          </div>
        )}

        {/* --- LAYOUT TAB --- */}
        {activeTab === "layout" && (
          <div className="flex items-center gap-3 py-1 flex-wrap">
            {/* Margins */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-semibold">Margins:</span>
              <select
                value={margins}
                onChange={(e) => setMargins(e.target.value as any)}
                className="h-8 px-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
              >
                <option value="normal">Normal (1.0 in)</option>
                <option value="narrow">Narrow (0.5 in)</option>
                <option value="moderate">Moderate (0.75 in)</option>
                <option value="wide">Wide (1.5 in)</option>
              </select>
            </div>

            {/* Orientation */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-semibold">Orientation:</span>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as any)}
                className="h-8 px-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            {/* Paper Size */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-semibold">Size:</span>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as any)}
                className="h-8 px-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
              >
                <option value="a4">A4 (210 x 297 mm)</option>
                <option value="letter">Letter (8.5 x 11 in)</option>
                <option value="legal">Legal (8.5 x 14 in)</option>
              </select>
            </div>

            {/* Columns */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-semibold">Columns:</span>
              <select
                value={columns}
                onChange={(e) => setColumns(e.target.value as any)}
                className="h-8 px-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
              >
                <option value="1">One Column</option>
                <option value="2">Two Columns</option>
                <option value="3">Three Columns</option>
              </select>
            </div>

            {/* Page Color */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-semibold">Page Color:</span>
              <select
                value={pageBgColor}
                onChange={(e) => setPageBgColor(e.target.value as any)}
                className="h-8 px-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
              >
                <option value="white">Classic White</option>
                <option value="cream">Cream / Parchment</option>
                <option value="sepia">Warm Sepia</option>
                <option value="dark">Matte Black (Dark)</option>
              </select>
            </div>

            {/* Page Borders */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-semibold">Page Border:</span>
              <select
                value={pageBorderStyle}
                onChange={(e) => setPageBorderStyle(e.target.value as any)}
                className="h-8 px-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
              >
                <option value="none">None</option>
                <option value="box">Solid Box</option>
                <option value="double">Double Navy Line</option>
                <option value="shadow">Drop Shadow Box</option>
              </select>
            </div>

            {/* Running Header */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-semibold">Header:</span>
              <input
                type="text"
                value={runningHeaderText}
                onChange={(e) => setRunningHeaderText(e.target.value)}
                placeholder="Document header..."
                className="h-8 px-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none w-28 sm:w-36"
                title="Running document header text across all pages"
              />
            </div>

            {/* Running Footer */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-semibold">Footer:</span>
              <input
                type="text"
                value={runningFooterText}
                onChange={(e) => setRunningFooterText(e.target.value)}
                placeholder="Document footer..."
                className="h-8 px-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none w-28 sm:w-36"
                title="Running document footer text across all pages"
              />
            </div>

            {/* Page Number Format */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-semibold">Numbering:</span>
              <select
                value={pageNumberFormat}
                onChange={(e) => setPageNumberFormat(e.target.value as any)}
                className="h-8 px-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
              >
                <option value="standard">Page 1 of N</option>
                <option value="compact">1 / N</option>
                <option value="hash">#1</option>
              </select>
            </div>

            {/* Watermark */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-semibold">Watermark:</span>
              <select
                value={watermark}
                onChange={(e) => setWatermark(e.target.value)}
                className="h-8 px-2 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium outline-none"
              >
                <option value="">None</option>
                <option value="DRAFT">DRAFT</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="SAMPLE">SAMPLE</option>
                <option value="DO NOT COPY">DO NOT COPY</option>
              </select>
            </div>

            {/* Hyphenation */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none">
              <input
                type="checkbox"
                checked={hyphenation}
                onChange={(e) => setHyphenation(e.target.checked)}
                className="rounded"
              />
              <span>Hyphenation</span>
            </label>
          </div>
        )}

        {/* --- REVIEW TAB --- */}
        {activeTab === "review" && (
          <div className="flex items-center gap-3 py-1 flex-wrap">
            <button
              type="button"
              onClick={() => setShowStatsModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 font-semibold border border-gray-300 dark:border-slate-700 cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Word Count & Document Stats</span>
            </button>
            <button
              type="button"
              onClick={() => setShowProofingModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-semibold border border-blue-300 dark:border-blue-800 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Proofing & Readability Score</span>
            </button>
            <div className="text-xs text-gray-500 flex items-center gap-3">
              <span><strong>{wordCount}</strong> words</span>
              <span><strong>{charCount}</strong> characters</span>
              <span><strong>{pageCount}</strong> estimated page(s)</span>
            </div>
          </div>
        )}

        {/* --- VIEW TAB --- */}
        {activeTab === "view" && (
          <div className="flex items-center gap-3 py-1 flex-wrap">
            {/* View Modes */}
            <div className="flex items-center gap-1 border-r border-gray-200 dark:border-slate-800 pr-3">
              <span className="text-gray-500 font-semibold mr-1">Views:</span>
              <button
                type="button"
                onClick={() => setViewMode("print")}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  viewMode === "print" ? "bg-blue-600 text-white" : "hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                Print Layout (A4)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("web")}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  viewMode === "web" ? "bg-blue-600 text-white" : "hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                Web Layout
              </button>
              <button
                type="button"
                onClick={() => setViewMode("focus")}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  viewMode === "focus" ? "bg-blue-600 text-white" : "hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                Focus Mode
              </button>
            </div>

            {/* Navigation Pane Toggle */}
            <button
              type="button"
              onClick={() => setShowNavPane(!showNavPane)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition cursor-pointer ${
                showNavPane
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "hover:bg-gray-100 dark:hover:bg-slate-800 border-gray-300 dark:border-slate-700"
              }`}
              title="Navigation Pane (Headings Tree)"
            >
              <PanelLeft className="w-4 h-4" />
              <span>Navigation Pane</span>
              {headingsList.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${showNavPane ? "bg-white/25 text-white" : "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"}`}>
                  {headingsList.length}
                </span>
              )}
            </button>

            {/* Show/Hide Ruler */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold select-none">
              <input
                type="checkbox"
                checked={showRuler}
                onChange={(e) => setShowRuler(e.target.checked)}
                className="rounded"
              />
              <span>Ruler</span>
            </label>

            {/* Zoom Slider */}
            <div className="flex items-center gap-2 border-l border-gray-200 dark:border-slate-800 pl-3">
              <button
                type="button"
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="w-12 text-center font-bold text-xs">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(100)}
                className="px-2 py-0.5 text-[11px] rounded bg-gray-100 dark:bg-slate-800 hover:bg-gray-200"
              >
                100%
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Find & Replace Bar (Floating Drawer) */}
      {showFindReplace && (
        <div className="bg-white dark:bg-slate-900 border-b border-gray-300 dark:border-slate-800 px-6 py-2 flex items-center justify-between gap-4 text-xs animate-fade-in shadow-md shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <label className="font-bold text-gray-500">Find:</label>
              <input
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="Find text..."
                className="px-2.5 py-1 rounded border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none w-44"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="font-bold text-gray-500">Replace:</label>
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replace with..."
                className="px-2.5 py-1 rounded border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none w-44"
              />
            </div>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(e) => setMatchCase(e.target.checked)}
              />
              <span>Match case</span>
            </label>
            <button
              type="button"
              onClick={handleFind}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded cursor-pointer"
            >
              Find
            </button>
            <button
              type="button"
              onClick={handleReplaceAll}
              className="px-3 py-1 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200 font-semibold rounded cursor-pointer"
            >
              Replace All
            </button>
            {findCount !== null && (
              <span className="font-bold text-blue-600">
                {findCount} match{findCount === 1 ? "" : "es"} found
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFindReplace(false)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Horizontal Ruler */}
      {showRuler && viewMode === "print" && (
        <div className="h-5 bg-[#e5e7eb] dark:bg-slate-800 border-b border-gray-300 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-[9px] text-gray-500 select-none">
          <div className="max-w-[850px] w-full flex justify-between px-8">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="h-2 w-px bg-gray-400" />
                <span>{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Document Scrollable Workspace & Paginated Paper Sheets */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Pane Drawer (Word Style Headings Outline) */}
        {showNavPane && (
          <div className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col h-full shrink-0 shadow-md animate-fade-in z-20">
            <div className="p-3 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PanelLeft className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-xs text-gray-800 dark:text-gray-200">Headings Outline</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNavPane(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 cursor-pointer"
                title="Close Navigation Pane"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {headingsList.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 dark:text-gray-500">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold mb-1">No Headings Found</p>
                  <p className="text-[11px]">Apply Heading 1 or Heading 2 styles to create your document outline.</p>
                </div>
              ) : (
                headingsList.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => scrollToHeading(h.id, h.pageIdx)}
                    className={`w-full text-left px-2.5 py-1.5 rounded hover:bg-blue-50 dark:hover:bg-slate-800 text-xs transition cursor-pointer truncate ${
                      h.level === 1
                        ? "font-bold text-gray-900 dark:text-white"
                        : h.level === 2
                        ? "font-semibold text-gray-700 dark:text-gray-300 pl-4"
                        : "text-gray-600 dark:text-gray-400 pl-6 text-[11px]"
                    }`}
                    title={h.text}
                  >
                    <span className="text-[10px] text-gray-400 mr-1.5">p.{h.pageIdx + 1}</span>
                    <span>{h.text}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Paper Sheets Scroll Area */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 flex flex-col items-center justify-start cursor-default bg-[#f3f4f6] dark:bg-[#09090b]"
          onClick={handleApplyFormatPainter}
        >
          <div
            style={{ zoom: `${zoom}%` }}
            className="w-full flex flex-col items-center"
          >
            {pages.map((pageHtml, index) => (
              <div
                key={index}
                onClick={() => setActivePageIndex(index)}
                className={`word-page-sheet w-full ${getPageWidthClass()} ${getPaperBg()} ${getPageBorderClasses()} ${getMarginClass()} rounded-xs relative transition-all mx-auto mb-8 focus-within:ring-2 focus-within:ring-blue-500/50`}
                style={{
                  minHeight: "1056px",
                  fontFamily: fontFamily,
                  columnCount: columns !== "1" ? columns : undefined,
                  columnGap: "32px"
                }}
              >
                {/* Watermark (if set) */}
                {watermark && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
                    <span className="text-gray-200/50 dark:text-slate-800/60 font-black text-6xl sm:text-8xl tracking-widest -rotate-45 uppercase">
                      {watermark}
                    </span>
                  </div>
                )}

                {/* Page Header (Word Style) */}
                <div className="flex items-center justify-between pb-2 mb-4 border-b border-gray-200 dark:border-slate-800 text-[11px] text-gray-400 select-none">
                  <span className="font-medium truncate max-w-[240px]">{runningHeaderText || title || "Word Document"}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-500 dark:text-gray-400">
                      {pageNumberFormat === "compact"
                        ? `${index + 1} / ${pages.length}`
                        : pageNumberFormat === "hash"
                        ? `#${index + 1}`
                        : `Page ${index + 1} of ${pages.length}`}
                    </span>
                    {pages.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePage(index);
                        }}
                        className="hover:text-red-600 dark:hover:text-red-400 transition px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                        title={`Delete Page ${index + 1}`}
                      >
                        Delete Page
                      </button>
                    )}
                  </div>
                </div>

                {/* Editable Page Body Canvas */}
                <div
                  ref={(el) => { pageRefs.current[index] = el; }}
                  contentEditable
                  onInput={() => handlePageInput(index)}
                  onFocus={() => setActivePageIndex(index)}
                  onKeyDown={(e) => handlePageKeyDown(e, index)}
                  data-placeholder={index === 0 ? "Start typing your Word document here..." : `Continue typing on Page ${index + 1}...`}
                  className="word-editor-canvas outline-none min-h-[920px] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-gray-600 relative z-10"
                  style={{
                    fontSize: `${fontSize}pt`,
                    lineHeight: lineSpacing,
                    hyphens: hyphenation ? "auto" : "manual"
                  }}
                />

                {/* Page Footer (Word Style) */}
                <div className="flex items-center justify-between pt-3 mt-4 border-t border-gray-200 dark:border-slate-800 text-[11px] text-gray-400 select-none">
                  <span className="truncate max-w-[240px] italic">{runningFooterText || ""}</span>
                  <span>
                    {pageNumberFormat === "compact"
                      ? `${index + 1} / ${pages.length}`
                      : pageNumberFormat === "hash"
                      ? `#${index + 1}`
                      : `Page ${index + 1} of ${pages.length}`}
                  </span>
                </div>
              </div>
            ))}

            {/* Quick Add Page Gutter Action */}
            <div className="flex items-center justify-center my-3 select-none">
              <button
                type="button"
                onClick={() => handleAddPage(pages.length)}
                className="px-4 py-2 rounded-lg border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <span className="text-base font-bold leading-none">+</span>
                <span>Insert Page {pages.length + 1}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Word Bottom Status Bar (Word 365 Style) */}
      <div className="h-7 bg-[#2b579a] dark:bg-[#1e3a8a] text-white px-4 flex items-center justify-between text-[11px] font-medium shrink-0 shadow-inner">
        <div className="flex items-center gap-4">
          <span>Page {activePageIndex + 1} of {pages.length}</span>
          <span>{wordCount} words</span>
          <span className="hidden sm:inline">{charCount} characters</span>
          <span className="hidden md:inline">English (United States)</span>
          {collabSession && (
            <span className="text-emerald-300 font-bold hidden lg:inline">
              ● Word Collab Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode("focus")}
              className={`p-1 rounded ${viewMode === "focus" ? "bg-white/20" : "hover:bg-white/10"}`}
              title="Focus Mode"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("print")}
              className={`p-1 rounded ${viewMode === "print" ? "bg-white/20" : "hover:bg-white/10"}`}
              title="Print Layout"
            >
              <Layout className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("web")}
              className={`p-1 rounded ${viewMode === "web" ? "bg-white/20" : "hover:bg-white/10"}`}
              title="Web Layout"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-3.5 w-px bg-white/20" />

          {/* Zoom Control Bar */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="hover:bg-white/10 p-0.5 rounded cursor-pointer"
            >
              -
            </button>
            <input
              type="range"
              min="50"
              max="200"
              step="5"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-16 accent-white cursor-pointer h-1"
            />
            <button
              type="button"
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              className="hover:bg-white/10 p-0.5 rounded cursor-pointer"
            >
              +
            </button>
            <span className="w-9 text-right font-semibold">{zoom}%</span>
          </div>
        </div>
      </div>

      {/* Word Count & Document Statistics Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowStatsModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Word Count & Statistics</h3>
            </div>

            <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                <span>Pages</span>
                <span className="font-bold">{pageCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                <span>Words</span>
                <span className="font-bold">{wordCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                <span>Characters (with spaces)</span>
                <span className="font-bold">{charCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                <span>Characters (no spaces)</span>
                <span className="font-bold">{charNoSpaces}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                <span>Paragraphs</span>
                <span className="font-bold">{paraCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                <span>Estimated Reading Time</span>
                <span className="font-bold">~{Math.ceil(wordCount / 200)} min</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowStatsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proofing & Readability Statistics Modal */}
      {showProofingModal && (() => {
        const stats = calculateReadability();
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setShowProofingModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">Proofing & Readability</h3>
              </div>

              {/* Flesch Reading Score Gauge */}
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 mb-4 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1">
                  Flesch Reading Ease Score
                </div>
                <div className="text-4xl font-black text-blue-900 dark:text-blue-100 mb-1">
                  {stats.score} <span className="text-sm font-normal text-gray-500">/ 100</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full transition-all duration-500 ${
                      stats.score >= 70
                        ? "bg-emerald-500"
                        : stats.score >= 50
                        ? "bg-blue-500"
                        : stats.score >= 30
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, stats.score))}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Grade Level: <strong>{stats.level}</strong>
                </span>
              </div>

              {/* Detailed Metrics */}
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                  <span>Total Sentences</span>
                  <span className="font-bold">{stats.sentences}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                  <span>Words Per Sentence (Avg)</span>
                  <span className="font-bold">{stats.wordsPerSentence}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                  <span>Estimated Silent Reading Time (200 wpm)</span>
                  <span className="font-bold">{stats.readingMinutes} min</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-slate-800">
                  <span>Estimated Speaking / Presentation Time (130 wpm)</span>
                  <span className="font-bold">{stats.speakingMinutes} min</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowProofingModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Word Collab (Start / Join) Modal */}
      {showCollabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#121214] border border-purple-200 dark:border-purple-900/60 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowCollabModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Word Collab</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                    Live
                  </span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Two-person synchronized live Microsoft Word editor
                </p>
              </div>
            </div>

            {/* Tabs: Start vs Join */}
            {!collabSession && (
              <div className="flex p-1 mb-5 bg-gray-100 dark:bg-[#1c1c1f] rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCollabTab("start")}
                  className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
                    collabTab === "start"
                      ? "bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Start New (User A)
                </button>
                <button
                  type="button"
                  onClick={() => setCollabTab("join")}
                  className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
                    collabTab === "join"
                      ? "bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Join with PIN (User B)
                </button>
              </div>
            )}

            {/* TAB 1: START / ACTIVE COLLAB SESSION */}
            {(collabTab === "start" || collabSession) && (
              <div className="space-y-4">
                {collabSession ? (
                  <>
                    <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 text-center">
                      <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-1">
                        Collaboration PIN
                      </div>
                      <div className="text-4xl font-black font-mono tracking-widest text-purple-900 dark:text-purple-200 py-1">
                        {collabSession.pin}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Share this PIN with User B to edit this Word document together live.
                      </p>
                    </div>

                    {collabQrUrl && (
                      <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 dark:bg-[#1c1c1f] border border-gray-200 dark:border-[#27272a]">
                        <img src={collabQrUrl} alt="Collab QR code" className="w-36 h-36 rounded-lg shadow-xs" />
                        <span className="text-[10px] text-gray-400 mt-2 font-medium">
                          Scan with phone to join Word Collab instantly
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(collabSession.pin);
                          setCopiedCollabPin(true);
                          setTimeout(() => setCopiedCollabPin(false), 2000);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-[#27272a] hover:bg-gray-200 dark:hover:bg-[#3f3f46] text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedCollabPin ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCollabPin ? "PIN Copied!" : "Copy PIN"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const link = `${window.location.origin}/duo/${collabSession.pin}?mode=word`;
                          navigator.clipboard.writeText(link);
                          setCopiedCollabLink(true);
                          setTimeout(() => setCopiedCollabLink(false), 2000);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/25 transition cursor-pointer"
                      >
                        {copiedCollabLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Link className="w-3.5 h-3.5" />}
                        <span>{copiedCollabLink ? "Link Copied!" : "Copy Invite Link"}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCollabModal(false)}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      Enter Live Word Document
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                      Create an instant 6-digit PIN to invite User B into this exact Word document.
                    </p>
                    <button
                      type="button"
                      onClick={handleStartWordCollab}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/25 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      <span>Generate PIN & Start Word Collab</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: JOIN WITH PIN */}
            {collabTab === "join" && !collabSession && (
              <form onSubmit={handleJoinWordCollab} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Enter User A's 6-Digit PIN
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={collabJoinPin}
                    onChange={(e) => setCollabJoinPin(e.target.value)}
                    placeholder="e.g. 482910"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-lg font-mono tracking-widest text-center font-bold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {joinCollabError && (
                    <p className="text-xs text-red-500 font-semibold mt-1.5">{joinCollabError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isJoiningCollab || !collabJoinPin.trim()}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-purple-600/25 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>{isJoiningCollab ? "Joining Word Collab..." : "Join Live Word Document"}</span>
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
