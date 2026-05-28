"use client";

import React, { useEffect, useRef, useState } from "react";

interface RichTextComponentProps {
  value: string;
  onChange: (newValue: string) => void;
}

interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  highlight: boolean;
}

const DEFAULT_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  underline: false,
  highlight: false,
};

const normalizeUrl = (url: string) => {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return "";
  if (/^https?:\/\//i.test(trimmedUrl)) return trimmedUrl;
  return `https://${trimmedUrl}`;
};

const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const sanitizeHtml = (html: string) => {
  if (typeof window === "undefined" || !html) return html;

  const template = document.createElement("template");
  template.innerHTML = html;
  const allowedTags = new Set(["A", "B", "BR", "DIV", "EM", "I", "LI", "OL", "P", "SPAN", "STRONG", "U", "UL"]);
  const allowedAttrs = new Set(["href", "target", "rel", "style"]);

  template.content.querySelectorAll("*").forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    Array.from(element.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (!allowedAttrs.has(name)) {
        element.removeAttribute(attr.name);
        return;
      }

      if (name === "href") {
        const href = attr.value.trim();
        if (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) {
          element.removeAttribute(attr.name);
        }
      }

      if (name === "style" && !attr.value.includes("background-color: rgb(255, 242, 153)")) {
        element.removeAttribute(attr.name);
      }
    });

    if (element.tagName === "A") {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noreferrer");
    }
  });

  return template.innerHTML;
};

export default function RichTextComponent({ value, onChange }: RichTextComponentProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideToolbarTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [initialValue] = useState(() => sanitizeHtml(value));
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(DEFAULT_FORMATS);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  const publishValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(sanitizeHtml(editor.innerHTML));
  };

  const schedulePublish = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(publishValue, 400);
  };

  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      highlight: ["rgb(255, 242, 153)", "#fff299"].includes(
        String(document.queryCommandValue("backColor")).toLowerCase()
      ),
    });
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const showToolbar = () => {
    if (hideToolbarTimerRef.current) {
      clearTimeout(hideToolbarTimerRef.current);
    }
    setIsToolbarVisible(true);
  };

  const runCommand = (command: string, commandValue?: string) => {
    focusEditor();
    document.execCommand(command, false, commandValue);
    updateActiveFormats();
    schedulePublish();
  };

  const toggleHighlight = () => {
    runCommand("backColor", activeFormats.highlight ? "transparent" : "#fff299");
  };

  const applyLink = () => {
    focusEditor();
    const rawUrl = window.prompt("Nhap URL");
    if (rawUrl === null) return;

    const url = normalizeUrl(rawUrl);
    if (!url) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      const safeUrl = escapeHtml(url);
      document.execCommand("insertHTML", false, `<a href="${safeUrl}" target="_blank" rel="noreferrer">${safeUrl}</a>`);
    } else {
      document.execCommand("createLink", false, url);
      editorRef.current?.querySelectorAll("a").forEach((anchor) => {
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noreferrer");
      });
    }

    updateActiveFormats();
    schedulePublish();
  };

  const clearFormatting = () => {
    runCommand("removeFormat");
  };

  const handleInput = () => {
    updateActiveFormats();
    schedulePublish();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    event.preventDefault();
    document.execCommand("insertText", false, text);
    schedulePublish();
  };

  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    showToolbar();

    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor || !editorRef.current?.contains(anchor)) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    event.preventDefault();
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    publishValue();
  };

  const handleWrapperBlur = () => {
    hideToolbarTimerRef.current = setTimeout(() => {
      if (!wrapperRef.current?.contains(document.activeElement)) {
        setIsToolbarVisible(false);
      }
    }, 0);
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialValue;
    }
  }, [initialValue]);

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats);
    return () => {
      document.removeEventListener("selectionchange", updateActiveFormats);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (hideToolbarTimerRef.current) {
        clearTimeout(hideToolbarTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`richtext-component-wrapper ${isToolbarVisible ? "is-active" : ""}`}
      onFocusCapture={showToolbar}
      onBlurCapture={handleWrapperBlur}
      onMouseDown={showToolbar}
    >
      <div className="richtext-toolbar" onMouseDown={(event) => event.preventDefault()}>
        <button
          type="button"
          className={`richtext-tool-btn ${activeFormats.bold ? "active" : ""}`}
          onClick={() => runCommand("bold")}
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          className={`richtext-tool-btn ${activeFormats.italic ? "active" : ""}`}
          onClick={() => runCommand("italic")}
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          className={`richtext-tool-btn ${activeFormats.underline ? "active" : ""}`}
          onClick={() => runCommand("underline")}
          title="Underline"
        >
          U
        </button>
        <button
          type="button"
          className={`richtext-tool-btn highlight ${activeFormats.highlight ? "active" : ""}`}
          onClick={toggleHighlight}
          title="Highlight yellow"
        >
          H
        </button>
        <button type="button" className="richtext-tool-btn link" onClick={applyLink} title="Link URL">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6.7 10.8H5a2.8 2.8 0 0 1 0-5.6h1.7" />
            <path d="M9.3 5.2H11a2.8 2.8 0 0 1 0 5.6H9.3" />
            <path d="M5.9 8h4.2" />
          </svg>
        </button>
        <button type="button" className="richtext-tool-btn clear" onClick={clearFormatting} title="Clear formatting">
          Tx
        </button>
      </div>

      <div
        ref={editorRef}
        className="richtext-editor"
        contentEditable
        role="textbox"
        aria-label="Rich text"
        data-placeholder="Start writing..."
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        onClick={handleEditorClick}
        onPaste={handlePaste}
        onBlur={handleBlur}
      />
    </div>
  );
}
