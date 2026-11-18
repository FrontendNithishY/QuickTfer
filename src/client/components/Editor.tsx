import React, { useState, useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
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
  Upload,
  Undo,
  Redo,
  Sparkles,
  FileUp,
  Minus,
  Key,
  X,
  ExternalLink,
  Check,
  Terminal,
  Users,
  FileText
} from "lucide-react";
import katex from "katex";
import * as mammoth from "mammoth";
import { parseDocxBuffer } from "../utils/wordParser.js";
import { CodeCompilerModal } from "./CodeCompilerModal.js";
import { WordDocEditor } from "./WordDocEditor.js";

interface EditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialMode?: "standard" | "word";
  onPublishClick: (title: string, content: string) => void;
  onPublishSuccess?: (slug: string) => void;
  onStartDuoPaste?: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  initialTitle = "",
  initialContent = "",
  initialMode = "standard",
  onPublishClick,
  onPublishSuccess,
  onStartDuoPaste,
}) => {

  const [title, setTitle] = useState(initialTitle);
  const [mode, setMode] = useState<"standard" | "word">(initialMode || "standard");
  const [draftContent, setDraftContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readingTime, setReadingTime] = useState("0 min");
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleSwitchToWord = () => {
    const current = editorRef.current?.innerHTML || draftContent;
    setDraftContent(current);
    setMode("word");
  };

  const handleSwitchToStandard = (newTitle?: string, newContent?: string) => {
    if (newTitle !== undefined) setTitle(newTitle);
    if (newContent !== undefined) {
      setDraftContent(newContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = newContent;
        updateStats();
      }
    }
    setMode("standard");
  };

  // AI Polish states
  const [isPolishing, setIsPolishing] = useState(false);
  const [previousContent, setPreviousContent] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem("sharepaste_gemini_key") || "");
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);

  const handleAiPolish = async () => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML || "";
    const rawText = editorRef.current.innerText || "";
    if (!rawText.trim() || rawText.trim() === "") {
      alert("Please write or paste some text before using AI Polish.");
      return;
    }

    setIsPolishing(true);
    setAiNotice(null);

    try {
      const storedKey = localStorage.getItem("sharepaste_gemini_key")?.trim() || undefined;
      const res = await fetch("/api/ai/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: currentHtml,
          apiKey: storedKey
        })
      });

      const data = await res.json();

      if (res.status === 400 && data.error === "NO_API_KEY") {
        setShowApiKeyModal(true);
        setIsPolishing(false);
        return;
      }

      if (!res.ok || !data.success) {
        if (data.error === "INVALID_API_KEY") {
          setShowApiKeyModal(true);
        }
        alert(data.message || "AI Polish failed. Please try again.");
        setIsPolishing(false);
        return;
      }

      // Success: Save previous content for one-click Revert
      setPreviousContent(currentHtml);
      editorRef.current.innerHTML = data.polishedContent;
      updateStats();
      setAiNotice("Grammar polished, phrasing refined, and paragraphs auto-aligned.");
    } catch (err: any) {
      console.error("AI polish error:", err);
      alert("Failed to connect to AI polish service.");
    } finally {
      setIsPolishing(false);
    }
  };

  const handleRevert = () => {
    if (previousContent !== null && editorRef.current) {
      editorRef.current.innerHTML = previousContent;
      setPreviousContent(null);
      setAiNotice(null);
      updateStats();
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem("sharepaste_gemini_key", trimmed);
    } else {
      localStorage.removeItem("sharepaste_gemini_key");
    }
    setShowApiKeyModal(false);
  };

  // Initialize initial content
  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
      updateStats();
    }
  }, [initialContent]);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  const updateStats = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = text.length;
    setWordCount(words);
    setCharCount(chars);

    const minutes = Math.ceil(words / 200);
    setReadingTime(words > 0 ? `~${minutes} min read` : "0 min");
  };

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      updateStats();
    }
  };

  // Image Upload handler
  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        exec("insertHTML", `<img src="${data.url}" alt="Uploaded image" class="rounded-xl shadow-md my-4 max-w-full h-auto" />`);
      } else {
        alert(data.error || "Image upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload image.");
    }
  };

  // Clipboard Paste & Drag-and-drop Image Support
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) handleImageUpload(file);
        return;
      }
    }
    setTimeout(updateStats, 10);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        handleImageUpload(file);
      }
    }
  };

  // Insert YouTube Embed
  const promptYoutube = () => {
    const url = prompt("Enter YouTube video link (e.g. https://www.youtube.com/watch?v=VIDEO_ID):");
    if (!url) return;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      const embedUrl = `https://www.youtube.com/embed/${match[2]}`;
      exec("insertHTML", `<div class="my-4 aspect-video max-w-2xl mx-auto"><iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full h-full rounded-xl shadow-md"></iframe></div><p><br></p>`);
    } else {
      alert("Invalid YouTube URL.");
    }
  };

  // Insert Math Formula (KaTeX)
  const promptMath = () => {
    const formula = prompt("Enter LaTeX Math formula (e.g. E = mc^2 or \\int_{0}^{1} x^2 dx):");
    if (!formula) return;
    try {
      const html = katex.renderToString(formula, { throwOnError: false, displayMode: true });
      exec("insertHTML", `<div class="my-3 py-2 text-center select-all">${html}</div><p><br></p>`);
    } catch (e) {
      alert("Failed to render formula.");
    }
  };

  // Insert Link
  const promptLink = () => {
    const url = prompt("Enter Link URL:");
    if (url) {
      exec("createLink", url);
    }
  };

  // Insert Table
  const insertTable = () => {
    const tableHtml = `
      <table class="w-full border-collapse my-4">
        <thead>
          <tr>
            <th class="border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 p-2 font-bold">Header 1</th>
            <th class="border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 p-2 font-bold">Header 2</th>
            <th class="border border-gray-300 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 p-2 font-bold">Header 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-gray-300 dark:border-slate-700 p-2">Item 1</td>
            <td class="border border-gray-300 dark:border-slate-700 p-2">Description</td>
            <td class="border border-gray-300 dark:border-slate-700 p-2">Status</td>
          </tr>
          <tr>
            <td class="border border-gray-300 dark:border-slate-700 p-2">Item 2</td>
            <td class="border border-gray-300 dark:border-slate-700 p-2">Description</td>
            <td class="border border-gray-300 dark:border-slate-700 p-2">Status</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    exec("insertHTML", tableHtml);
  };

  // Import Document (.docx, .txt, .md, .html)
  const handleDocImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editorRef.current) return;
    const lowerName = file.name.toLowerCase();

    try {
      if (lowerName.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const html = await parseDocxBuffer(arrayBuffer);
        if (html && editorRef.current) {
          editorRef.current.innerHTML = html;
          updateStats();
        } else {
          alert("Could not extract text from this Word document.");
        }
      } else if (lowerName.endsWith(".html") || lowerName.endsWith(".htm") || lowerName.endsWith(".doc")) {
        const text = await file.text();
        if (text.includes("<html") || text.includes("<body") || text.includes("<p>")) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, "text/html");
          editorRef.current.innerHTML = doc.body.innerHTML || text;
        } else {
          editorRef.current.innerHTML = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
        }
        updateStats();
      } else {
        const text = await file.text();
        editorRef.current.innerHTML = text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");
        updateStats();
      }
    } catch (err) {
      console.error("Document import error:", err);
      alert("Failed to parse Word document. Please ensure it is a valid .docx file.");
    }
  };

  const handlePublish = () => {
    const content = editorRef.current?.innerHTML || "";
    if (!content.trim() || content === "<p><br></p>") {
      alert("Please write something before publishing.");
      return;
    }
    onPublishClick(title, content);
  };

  if (mode === "word") {
    return (
      <div className="flex-1 flex flex-col w-full min-h-[calc(100vh-64px)]">
        <WordDocEditor
          initialTitle={title}
          initialContent={editorRef.current?.innerHTML || draftContent}
          onPublishClick={(docTitle, docContent) => {
            setTitle(docTitle);
            setDraftContent(docContent);
            onPublishClick(docTitle, docContent);
          }}
          onSwitchToStandard={() => {
            handleSwitchToStandard();
          }}
          onStartDuoPaste={onStartDuoPaste}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex-1 flex flex-col w-full">
      {/* Container Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-200/80 dark:border-slate-800 flex flex-col overflow-hidden transition-colors flex-1">
        
        {/* Editor Mode Switcher Bar */}
        <div className="px-6 sm:px-8 pt-5 pb-2 flex items-center justify-between border-b border-gray-100 dark:border-slate-800/60 bg-gray-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode("standard")}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs cursor-pointer"
            >
              <span>📝 Quick Note</span>
            </button>
            <button
              type="button"
              onClick={handleSwitchToWord}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Word Document</span>
              <span className="px-1.5 py-0.5 text-[9px] bg-blue-600 text-white rounded font-bold uppercase tracking-wider">MS Office</span>
            </button>
          </div>

          <div className="text-xs text-gray-400 hidden sm:block">
            <span>Microsoft Word mode with full ribbon & typography</span>
          </div>
        </div>

        {/* Title Input */}
        <div className="px-6 sm:px-8 pt-6 pb-3 border-b border-gray-100 dark:border-slate-800">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white bg-transparent outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600"
          />
        </div>

        {/* Toolbar */}
        <div className="px-4 sm:px-6 py-2.5 bg-gray-50/80 dark:bg-slate-800/60 border-b border-gray-200 dark:border-slate-800 flex flex-wrap items-center gap-1 text-gray-700 dark:text-gray-300 select-none">
          {/* Headings */}
          <button
            type="button"
            onClick={() => exec("formatBlock", "<h1>")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Heading 1"
            aria-label="Format as Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("formatBlock", "<h2>")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Heading 2"
            aria-label="Format as Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("formatBlock", "<h3>")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Heading 3"
            aria-label="Format as Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />

          {/* Inline Styles */}
          <button
            type="button"
            onClick={() => exec("bold")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 font-bold"
            title="Bold (Ctrl+B)"
            aria-label="Bold text"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("italic")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Italic (Ctrl+I)"
            aria-label="Italic text"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("underline")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Underline (Ctrl+U)"
            aria-label="Underline text"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("strikeThrough")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Strikethrough"
            aria-label="Strikethrough text"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("formatBlock", "<pre>")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Code Block"
            aria-label="Insert code block"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("formatBlock", "<blockquote>")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Quote"
            aria-label="Format as blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => exec("insertUnorderedList")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Bullet List"
            aria-label="Insert bullet list"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("insertOrderedList")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Numbered List"
            aria-label="Insert numbered list"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => exec("justifyLeft")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Align Left"
            aria-label="Align text left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("justifyCenter")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Align Center"
            aria-label="Align text center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("justifyRight")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Align Right"
            aria-label="Align text right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />

          {/* Advanced Embeds */}
          <button
            type="button"
            onClick={promptLink}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Insert Link"
            aria-label="Insert hyperlink"
          >
            <Link className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Upload Image"
            aria-label="Upload image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            accept="image/*"
            className="hidden"
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={promptYoutube}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Embed YouTube Video"
            aria-label="Embed YouTube video"
          >
            <VideoIcon className="w-4 h-4 text-red-600" />
          </button>
          <button
            type="button"
            onClick={insertTable}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Insert Table"
            aria-label="Insert data table"
          >
            <TableIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={promptMath}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Insert Math Formula (LaTeX)"
            aria-label="Insert LaTeX math formula"
          >
            <Sigma className="w-4 h-4" />
          </button>

          {/* Import text file */}
          <button
            type="button"
            onClick={() => docInputRef.current?.click()}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Import document (.docx / .txt / .md)"
            aria-label="Import Word or text document"
          >
            <FileUp className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={docInputRef}
            onChange={handleDocImport}
            accept=".docx,.doc,.txt,.md,.html,.htm"
            className="hidden"
            aria-hidden="true"
          />

          <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />
          <button
            type="button"
            onClick={() => exec("insertHorizontalRule")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Horizontal Divider"
            aria-label="Insert horizontal divider line"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("undo")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Undo"
            aria-label="Undo last action"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("redo")}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700"
            title="Redo"
            aria-label="Redo last action"
          >
            <Redo className="w-4 h-4" />
          </button>

          {/* AI Polish & Grammar Auto-Align Button */}
          <div className="sm:ml-auto flex items-center gap-1.5 my-0.5">
            {previousContent !== null && (
              <button
                type="button"
                onClick={handleRevert}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300/80 dark:border-amber-700/80 transition"
                title="Undo AI changes and restore original text"
              >
                <Undo className="w-3.5 h-3.5" />
                <span>Revert AI</span>
              </button>
            )}

            {/* Start DuoPaste Collaboration Button */}
            {onStartDuoPaste && (
              <button
                type="button"
                onClick={onStartDuoPaste}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100/80 dark:hover:bg-purple-900/60 border border-purple-300 dark:border-purple-800 rounded-lg shadow-sm transition cursor-pointer"
                title="Start DuoPaste: Real-time two-person live synchronized editor"
              >
                <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Start DuoPaste</span>
              </button>
            )}

            {/* Word Document Live Mode Button */}
            <button
              type="button"
              onClick={handleSwitchToWord}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/60 border border-blue-300 dark:border-blue-800 rounded-lg shadow-sm transition cursor-pointer"
              title="Word Document: Full Microsoft Word Ribbon with fonts, colors, and layout"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Word Doc</span>
            </button>

            {/* Code Highlighted Compiler & Formatter Button (Left of AI Polish) */}
            <button
              type="button"
              onClick={() => setShowCodeModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 rounded-lg shadow-sm transition cursor-pointer"
              title="Code highlighted: Run, compile, auto-indent & share code"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Code highlighted</span>
            </button>


            <div className="inline-flex items-center rounded-lg border border-purple-200 dark:border-purple-800/80 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={handleAiPolish}
                disabled={isPolishing}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100/70 dark:hover:bg-purple-900/60 transition disabled:opacity-60 cursor-pointer"
                title="AI Polish: Rephrase grammar, fix spelling, and auto-align paragraphs"
              >
                <Sparkles className={`w-3.5 h-3.5 text-purple-600 dark:text-purple-400 ${isPolishing ? "animate-spin" : ""}`} />
                <span>{isPolishing ? "Polishing with AI..." : "AI Polish"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(true)}
                className="p-1.5 text-purple-600/80 dark:text-purple-400/80 hover:text-purple-900 dark:hover:text-purple-100 hover:bg-purple-100/70 dark:hover:bg-purple-900/60 transition border-l border-purple-200/80 dark:border-purple-800/80 cursor-pointer"
                title="Configure Free Gemini AI Key"
                aria-label="Configure Free Gemini Key"
              >
                <Key className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* AI Notice Banner */}
        {aiNotice && (
          <div className="px-6 py-2 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border-b border-purple-200/70 dark:border-purple-900/40 flex items-center justify-between text-xs text-purple-900 dark:text-purple-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span><strong>AI Polished:</strong> {aiNotice}</span>
            </div>
            {previousContent !== null && (
              <button
                type="button"
                onClick={handleRevert}
                className="underline hover:no-underline font-bold ml-4 text-purple-700 dark:text-purple-300 hover:text-purple-950 flex items-center gap-1 shrink-0"
              >
                <Undo className="w-3 h-3" /> Revert to original
              </button>
            )}
          </div>
        )}

        {/* Editor Writing Canvas */}
        <div
          ref={editorRef}
          contentEditable
          onInput={updateStats}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          data-placeholder="Start typing, paste from Word/Docs, or drag & drop images here..."
          className="paste-content p-6 sm:p-8 min-h-[420px] outline-none flex-1 overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 dark:empty:before:text-gray-600"
        />

        {/* Footer Statistics & Publish CTA Bar */}
        <div className="px-6 sm:px-8 py-3.5 bg-gray-50/90 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
            <span className="hidden sm:inline">{readingTime}</span>
          </div>

          <button
            onClick={handlePublish}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/25 transition flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Publish...</span>
          </button>
        </div>

      </div>

      {/* Free Gemini API Key Setup Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowApiKeyModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Polish Setup</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">100% Free via Google Gemini 3.8 Flash</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              SharePaste uses <strong>Google Gemini 3.8 Flash</strong> to rephrase awkward grammar, eliminate typos, and cleanly align your paragraphs into semantic blocks while preserving formulas and code.
            </p>

            <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 rounded-2xl p-4 mb-5 text-xs text-purple-900 dark:text-purple-200 space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                <Check className="w-4 h-4 text-emerald-500" /> Free Tier: 1,500 requests/day at zero cost
              </div>
              <p>
                Get your free API key in under 30 seconds (no credit card required):
              </p>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-300 underline hover:text-purple-900 dark:hover:text-white"
              >
                <span>Open Google AI Studio</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Your key is saved locally in your browser and used strictly to polish your paste.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                {apiKeyInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem("sharepaste_gemini_key");
                      setApiKeyInput("");
                      setShowApiKeyModal(false);
                    }}
                    className="text-xs text-rose-500 hover:text-rose-600 font-medium"
                  >
                    Remove Saved Key
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(false)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-md shadow-purple-600/25 transition cursor-pointer"
                  >
                    Save & Continue
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Code Highlighted Compiler & Formatter Modal */}
      <CodeCompilerModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        onPublishSuccess={(slug) => {
          if (onPublishSuccess) {
            onPublishSuccess(slug);
          } else {
            window.location.href = `/p/${slug}`;
          }
        }}
      />
    </div>
  );
};
