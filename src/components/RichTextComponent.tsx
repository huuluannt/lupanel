"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface RichTextComponentProps {
  value: string;
  onChange: (newValue: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
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

const URL_BEFORE_CARET_PATTERN =
  /(?:^|\s)((?:(?:https?:\/\/|www\.)[^\s<]+)|(?:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<]*)?))$/i;
const TRAILING_URL_PUNCTUATION_PATTERN = /[.,!?;:]+$/;

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

const closestAnchor = (node: Node | null) => {
  const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node instanceof Element ? node : null;
  return element?.closest("a") ?? null;
};

const getTextPosition = (root: HTMLElement, targetOffset: number) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentOffset = 0;
  let lastTextNode: Text | null = null;

  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    const nextOffset = currentOffset + textNode.data.length;
    lastTextNode = textNode;

    if (targetOffset <= nextOffset) {
      return {
        node: textNode,
        offset: Math.max(0, targetOffset - currentOffset),
      };
    }

    currentOffset = nextOffset;
  }

  return lastTextNode ? { node: lastTextNode, offset: lastTextNode.data.length } : null;
};

export default function RichTextComponent({
  value,
  onChange,
  autoFocus = false,
  placeholder = "Start writing...",
}: RichTextComponentProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideToolbarTimerRef = useRef<NodeJS.Timeout | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [initialValue] = useState(() => sanitizeHtml(value));
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(DEFAULT_FORMATS);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

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

  const showToolbar = useCallback(() => {
    if (hideToolbarTimerRef.current) {
      clearTimeout(hideToolbarTimerRef.current);
    }
    setIsToolbarVisible(true);
  }, []);

  const runCommand = (command: string, commandValue?: string) => {
    focusEditor();
    document.execCommand(command, false, commandValue);
    updateActiveFormats();
    schedulePublish();
  };

  const toggleHighlight = () => {
    runCommand("backColor", activeFormats.highlight ? "transparent" : "#fff299");
  };

  const saveCurrentSelection = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || !editor || selection.rangeCount === 0) {
      savedSelectionRef.current = null;
      return;
    }

    const range = selection.getRangeAt(0);
    const withinEditor = editor.contains(range.commonAncestorContainer);
    savedSelectionRef.current = withinEditor ? range.cloneRange() : null;
  };

  const restoreSavedSelection = () => {
    const selection = window.getSelection();
    if (!selection || !savedSelectionRef.current) return;

    selection.removeAllRanges();
    selection.addRange(savedSelectionRef.current);
  };

  const openLinkDialog = () => {
    saveCurrentSelection();
    setLinkUrl("");
    setIsLinkDialogOpen(true);
    showToolbar();
  };

  const closeLinkDialog = () => {
    setIsLinkDialogOpen(false);
    setLinkUrl("");
    savedSelectionRef.current = null;
  };

  const applyLink = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    focusEditor();
    restoreSavedSelection();

    const url = normalizeUrl(linkUrl);
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
    closeLinkDialog();
  };

  const autoLinkUrlBeforeCaret = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || !selection.isCollapsed) return;

    const caretRange = selection.getRangeAt(0);
    if (!editor.contains(caretRange.commonAncestorContainer) || closestAnchor(caretRange.startContainer)) return;

    const textBeforeCaretRange = caretRange.cloneRange();
    textBeforeCaretRange.selectNodeContents(editor);
    textBeforeCaretRange.setEnd(caretRange.endContainer, caretRange.endOffset);

    const textBeforeCaret = textBeforeCaretRange.toString();
    const match = textBeforeCaret.match(URL_BEFORE_CARET_PATTERN);
    if (!match) return;

    const rawUrl = match[1];
    const urlText = rawUrl.replace(TRAILING_URL_PUNCTUATION_PATTERN, "");
    const href = normalizeUrl(urlText);
    if (!urlText || !href) return;

    const urlStartOffset = textBeforeCaret.length - rawUrl.length;
    const urlEndOffset = urlStartOffset + urlText.length;
    const startPosition = getTextPosition(editor, urlStartOffset);
    const endPosition = getTextPosition(editor, urlEndOffset);
    if (!startPosition || !endPosition || closestAnchor(startPosition.node) || closestAnchor(endPosition.node)) return;

    const linkRange = document.createRange();
    linkRange.setStart(startPosition.node, startPosition.offset);
    linkRange.setEnd(endPosition.node, endPosition.offset);

    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.appendChild(linkRange.extractContents());
    linkRange.insertNode(anchor);

    const nextRange = document.createRange();
    nextRange.setStartAfter(anchor);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === " " || event.key === "Enter") {
      autoLinkUrlBeforeCaret();
    }
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
    if (!autoFocus) return;

    const timer = window.setTimeout(() => {
      editorRef.current?.focus();
      showToolbar();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoFocus, showToolbar]);

  useEffect(() => {
    if (isLinkDialogOpen) {
      linkInputRef.current?.focus();
    }
  }, [isLinkDialogOpen]);

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
        <button type="button" className="richtext-tool-btn link" onClick={openLinkDialog} title="Link URL">
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

      {isLinkDialogOpen && (
        <form className="richtext-link-popover" onSubmit={applyLink}>
          <label className="richtext-link-label">URL</label>
          <input
            ref={linkInputRef}
            className="richtext-link-input"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https://example.com"
          />
          <div className="richtext-link-actions">
            <button type="button" className="richtext-link-secondary" onClick={closeLinkDialog}>
              Cancel
            </button>
            <button type="submit" className="richtext-link-primary">
              Add
            </button>
          </div>
        </form>
      )}

      <div
        ref={editorRef}
        className="richtext-editor"
        contentEditable
        role="textbox"
        aria-label="Rich text"
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={updateActiveFormats}
        onKeyDown={handleKeyDown}
        onMouseUp={updateActiveFormats}
        onClick={handleEditorClick}
        onPaste={handlePaste}
        onBlur={handleBlur}
      />
    </div>
  );
}
