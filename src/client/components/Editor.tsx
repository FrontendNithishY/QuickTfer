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
  Minus
} from "lucide-react";
import katex from "katex";

interface EditorProps {
  initialTitle?: string;
  initialContent?: string;
  onPublishClick: (title: string, content: string) => void;
}

export const Editor: React.FC<EditorProps> = ({
  initialTitle = "",
  initialContent = "",
  onPublishClick,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readingTime, setReadingTime] = useState("0 min");
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

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

  // Import Document (.txt or .md)
  const handleDocImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawText = event.target?.result as string;
      if (rawText && editorRef.current) {
        const formatted = rawText
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");
        editorRef.current.innerHTML = formatted;
        updateStats();
      }
    };
    reader.readAsText(file);
  };

  const handlePublish = () => {
    const content = editorRef.current?.innerHTML || "";
    if (!content.trim() || content === "<p><br></p>") {
      alert("Please write something before publishing.");
      return;
    }
    onPublishClick(title, content);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex-1 flex flex-col w-full">
      {/* Container Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-200/80 dark:border-slate-800 flex flex-col overflow-hidden transition-colors flex-1">
        
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
            title="Import text (.txt / .md)"
            aria-label="Import text or markdown file"
          >
            <FileUp className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={docInputRef}
            onChange={handleDocImport}
            accept=".txt,.md"
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
        </div>

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
    </div>
  );
};
