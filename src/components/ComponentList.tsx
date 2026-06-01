"use client";

import React, { useEffect, useRef, useState } from "react";
import { PanelComponent } from "../lib/storage";
import TitleComponent from "./TitleComponent";
import TextComponent from "./TextComponent";
import RichTextComponent from "./RichTextComponent";
import ImageComponent from "./ImageComponent";
import GalleryComponent from "./GalleryComponent";
import FileComponent from "./FileComponent";
import UrlComponent from "./UrlComponent";
import YoutubeComponent from "./YoutubeComponent";
import TableComponent from "./TableComponent";
import CheckboxComponent from "./CheckboxComponent";

interface ComponentListProps {
  components: PanelComponent[];
  onComponentChange: (id: string, value: string) => void;
  onComponentTitleChange: (id: string, title: string | undefined) => void;
  onComponentRichTextChange: (id: string, value: string | undefined) => void;
  onDeleteComponent: (id: string) => void;
  onMoveComponentUp: (id: string) => void;
  onMoveComponentDown: (id: string) => void;
  onUploadFile: (file: File) => Promise<string>;
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
}

const copyableComponentTypes = new Set<PanelComponent["type"]>(["title", "text", "richtext"]);

const htmlToPlainText = (html: string) => {
  if (!html) return "";
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content.textContent ?? "";
};

export default function ComponentList({
  components,
  onComponentChange,
  onComponentTitleChange,
  onComponentRichTextChange,
  onDeleteComponent,
  onMoveComponentUp,
  onMoveComponentDown,
  onUploadFile,
  selectedComponentId,
  onSelectComponent,
}: ComponentListProps) {
  const componentRefs = useRef<Record<string, { focus?: () => void } | null>>({});
  const contentWrapperRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const titleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const copyStatusTimerRef = useRef<number | null>(null);
  const [pendingDeleteComponent, setPendingDeleteComponent] = useState<PanelComponent | null>(null);
  const [pendingRichTextFocusId, setPendingRichTextFocusId] = useState<string | null>(null);
  const [copiedComponentId, setCopiedComponentId] = useState<string | null>(null);

  const handleFocusNext = (currentIndex: number) => {
    if (currentIndex + 1 < components.length) {
      const nextComp = components[currentIndex + 1];
      const nextRef = componentRefs.current[nextComp.id];
      nextRef?.focus?.();
    }
  };

  const handleAddTitle = (componentId: string) => {
    onComponentTitleChange(componentId, "");
    window.setTimeout(() => {
      titleInputRefs.current[componentId]?.focus();
    }, 0);
  };

  const handleAddRichText = (componentId: string) => {
    setPendingRichTextFocusId(componentId);
    onComponentRichTextChange(componentId, "");
  };

  const readCopyPayload = (component: PanelComponent) => {
    const wrapper = contentWrapperRefs.current[component.id];

    if (component.type === "title") {
      const input = wrapper?.querySelector<HTMLInputElement>(".title-input");
      return { text: input?.value ?? component.value };
    }

    if (component.type === "text") {
      const textarea = wrapper?.querySelector<HTMLTextAreaElement>(".text-textarea");
      return { text: textarea?.value ?? component.value };
    }

    if (component.type === "richtext") {
      const editor = wrapper?.querySelector<HTMLElement>(".richtext-editor");
      const html = editor?.innerHTML ?? component.value;
      return { html, text: editor?.innerText ?? htmlToPlainText(html) };
    }

    return { text: "" };
  };

  const writeClipboard = async ({ text, html }: { text: string; html?: string }) => {
    if (html && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
        return;
      } catch {
        // Fall back to plain text when the browser blocks HTML clipboard writes.
      }
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Fall back to execCommand for older or stricter browser environments.
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  };

  const handleCopyMainContent = async (component: PanelComponent) => {
    try {
      await writeClipboard(readCopyPayload(component));
      setCopiedComponentId(component.id);

      if (copyStatusTimerRef.current) {
        window.clearTimeout(copyStatusTimerRef.current);
      }

      copyStatusTimerRef.current = window.setTimeout(() => {
        setCopiedComponentId(null);
      }, 1000);
    } catch (error) {
      console.error("Copy component content failed", error);
    }
  };

  useEffect(() => {
    return () => {
      if (copyStatusTimerRef.current) {
        window.clearTimeout(copyStatusTimerRef.current);
      }
    };
  }, []);

  if (components.length === 0) {
    return (
      <div className="empty-state">
        This panel is empty. Use <strong>+ Add</strong> in the header to add content.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0px", paddingBottom: "100px" }}>
      {components.map((comp, idx) => (
        <div
          key={comp.id}
          className={`component-row ${selectedComponentId === comp.id ? "is-selected" : ""}`}
          onFocusCapture={() => onSelectComponent(comp.id)}
          onMouseDown={() => onSelectComponent(comp.id)}
        >
          <div className="component-controls">
            <button
              className="component-control-btn"
              onClick={() => onMoveComponentUp(comp.id)}
              title="Move up"
              disabled={idx === 0}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 15l6-6 6 6" />
              </svg>
            </button>
            <button
              className="component-control-btn"
              onClick={() => onMoveComponentDown(comp.id)}
              title="Move down"
              disabled={idx === components.length - 1}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          <div
            ref={(element) => {
              contentWrapperRefs.current[comp.id] = element;
            }}
            className="component-content-wrapper"
          >
            {selectedComponentId === comp.id &&
              ((comp.title === undefined && comp.type !== "title") ||
                comp.richText === undefined ||
                copyableComponentTypes.has(comp.type)) && (
              <div className="component-title-toolbar">
                {comp.title === undefined && comp.type !== "title" && (
                  <button
                    type="button"
                    className="component-title-toolbar-btn"
                    onClick={() => handleAddTitle(comp.id)}
                  >
                    + Add Title
                  </button>
                )}
                {comp.richText === undefined && (
                  <button
                    type="button"
                    className="component-title-toolbar-btn"
                    onClick={() => handleAddRichText(comp.id)}
                  >
                    + Add Rich Text
                  </button>
                )}
                {copyableComponentTypes.has(comp.type) && (
                  <button
                    type="button"
                    className="component-title-toolbar-btn"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      void handleCopyMainContent(comp);
                    }}
                    onClick={(event) => {
                      if (event.detail === 0) {
                        void handleCopyMainContent(comp);
                      }
                    }}
                  >
                    {copiedComponentId === comp.id ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
            )}

            {comp.title !== undefined && (
              <div className="component-inner-title-row">
                <input
                  ref={(element) => {
                    titleInputRefs.current[comp.id] = element;
                  }}
                  className="component-inner-title-input"
                  value={comp.title}
                  onChange={(event) => onComponentTitleChange(comp.id, event.target.value)}
                  placeholder="Title"
                />
                <button
                  type="button"
                  className="component-inner-remove-btn"
                  onClick={() => onComponentTitleChange(comp.id, undefined)}
                  aria-label="Remove title"
                  title="Remove title"
                >
                  x
                </button>
              </div>
            )}

            {comp.type === "title" && (
              <TitleComponent
                value={comp.value}
                onChange={(val) => onComponentChange(comp.id, val)}
                onFocusNext={() => handleFocusNext(idx)}
              />
            )}

            {comp.type === "text" && (
              <TextComponent
                value={comp.value}
                onChange={(val) => onComponentChange(comp.id, val)}
                onFocusNext={() => handleFocusNext(idx)}
              />
            )}

            {comp.type === "richtext" && (
              <RichTextComponent value={comp.value} onChange={(val) => onComponentChange(comp.id, val)} />
            )}

            {comp.type === "image" && (
              <ImageComponent
                value={comp.value}
                onChange={(val) => onComponentChange(comp.id, val)}
                onUploadImage={onUploadFile}
              />
            )}

            {comp.type === "gallery" && (
              <GalleryComponent
                value={comp.value}
                onChange={(val) => onComponentChange(comp.id, val)}
                onUploadImage={onUploadFile}
              />
            )}

            {comp.type === "file" && (
              <FileComponent
                value={comp.value}
                onChange={(val) => onComponentChange(comp.id, val)}
                onUploadFile={onUploadFile}
              />
            )}

            {comp.type === "url" && (
              <UrlComponent value={comp.value} onChange={(val) => onComponentChange(comp.id, val)} />
            )}

            {comp.type === "youtube" && (
              <YoutubeComponent value={comp.value} onChange={(val) => onComponentChange(comp.id, val)} />
            )}

            {comp.type === "table" && (
              <TableComponent value={comp.value} onChange={(val) => onComponentChange(comp.id, val)} />
            )}

            {comp.type === "checkbox" && (
              <CheckboxComponent value={comp.value} onChange={(val) => onComponentChange(comp.id, val)} />
            )}

            {comp.richText !== undefined && (
              <div className="component-inner-richtext">
                <button
                  type="button"
                  className="component-inner-remove-btn component-inner-richtext-remove-btn"
                  onClick={() => onComponentRichTextChange(comp.id, undefined)}
                  aria-label="Remove rich text"
                  title="Remove rich text"
                >
                  x
                </button>
                <RichTextComponent
                  value={comp.richText}
                  onChange={(val) => onComponentRichTextChange(comp.id, val)}
                  autoFocus={pendingRichTextFocusId === comp.id}
                  placeholder="Add details..."
                />
              </div>
            )}

            <button
              className="component-delete-btn"
              onClick={() => setPendingDeleteComponent(comp)}
              title="Delete component"
            >
              X
            </button>
          </div>
        </div>
      ))}

      {pendingDeleteComponent && (
        <div className="component-confirm-backdrop" role="dialog" aria-modal="true">
          <div className="component-confirm-modal">
            <div className="component-confirm-title">Delete this component?</div>
            <div className="component-confirm-desc">This component&apos;s content will be removed from the panel.</div>
            <div className="component-confirm-actions">
              <button
                type="button"
                className="component-confirm-secondary"
                onClick={() => setPendingDeleteComponent(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="component-confirm-danger"
                onClick={() => {
                  onDeleteComponent(pendingDeleteComponent.id);
                  setPendingDeleteComponent(null);
                }}
              >
                Delete component
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
