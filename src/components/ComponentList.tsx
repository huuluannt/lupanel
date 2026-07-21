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
  onSelectComponent: (id: string | null) => void;
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
  const copyStatusTimerRef = useRef<number | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const [pendingDeleteComponent, setPendingDeleteComponent] = useState<PanelComponent | null>(null);
  const [pendingRemoveField, setPendingRemoveField] = useState<{
    componentId: string;
    field: "title" | "richText";
  } | null>(null);
  const [pendingTitleFocusId, setPendingTitleFocusId] = useState<string | null>(null);
  const [pendingRichTextFocusId, setPendingRichTextFocusId] = useState<string | null>(null);
  const [copiedComponentId, setCopiedComponentId] = useState<string | null>(null);
  const [actionMenuComponentId, setActionMenuComponentId] = useState<string | null>(null);
  const [fileUploadTriggerTokens, setFileUploadTriggerTokens] = useState<Record<string, number>>({});

  const handleFocusNext = (currentIndex: number) => {
    if (currentIndex + 1 < components.length) {
      const nextComp = components[currentIndex + 1];
      const nextRef = componentRefs.current[nextComp.id];
      nextRef?.focus?.();
    }
  };

  const handleAddTitle = (componentId: string) => {
    setPendingTitleFocusId(componentId);
    onComponentTitleChange(componentId, "");
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

  const handleUploadFileFromMenu = (componentId: string) => {
    setFileUploadTriggerTokens((currentTokens) => ({
      ...currentTokens,
      [componentId]: (currentTokens[componentId] ?? 0) + 1,
    }));
  };

  const confirmRemoveField = () => {
    if (!pendingRemoveField) return;

    if (pendingRemoveField.field === "title") {
      onComponentTitleChange(pendingRemoveField.componentId, undefined);
    } else {
      onComponentRichTextChange(pendingRemoveField.componentId, undefined);
    }

    setPendingRemoveField(null);
  };

  useEffect(() => {
    return () => {
      if (copyStatusTimerRef.current) {
        window.clearTimeout(copyStatusTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const closeActionMenu = (event: PointerEvent) => {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setActionMenuComponentId(null);
      }
    };

    document.addEventListener("pointerdown", closeActionMenu);
    return () => document.removeEventListener("pointerdown", closeActionMenu);
  }, []);

  useEffect(() => {
    const clearSelectionOnOutsidePointer = (event: PointerEvent) => {
      if (!selectedComponentId || !(event.target instanceof Element)) return;

      const shouldKeepSelection = event.target.closest(
        [
          ".component-row",
          ".fixed-header",
          ".dropdown-menu",
          ".component-confirm-backdrop",
          ".gallery-confirm-backdrop",
          ".image-viewer-backdrop",
          ".panel-form-backdrop",
        ].join(", ")
      );

      if (!shouldKeepSelection) {
        onSelectComponent(null);
      }
    };

    document.addEventListener("pointerdown", clearSelectionOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", clearSelectionOnOutsidePointer);
  }, [onSelectComponent, selectedComponentId]);

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
          <div
            ref={(element) => {
              contentWrapperRefs.current[comp.id] = element;
            }}
            className="component-content-wrapper"
          >
            {comp.title !== undefined && (
              <div className="component-inner-title-row">
                <div className="component-inner-title-field">
                  <TitleComponent
                    value={comp.title}
                    onChange={(val) => onComponentTitleChange(comp.id, val)}
                    placeholder="Title"
                    autoFocus={pendingTitleFocusId === comp.id}
                  />
                </div>
                <button
                  type="button"
                  className="component-inner-remove-btn"
                  onClick={() => setPendingRemoveField({ componentId: comp.id, field: "title" })}
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
                uploadTriggerToken={fileUploadTriggerTokens[comp.id] ?? 0}
                hideAddMoreButton
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
                  onClick={() => setPendingRemoveField({ componentId: comp.id, field: "richText" })}
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

            <div
              ref={actionMenuComponentId === comp.id ? actionMenuRef : undefined}
              className={`component-more-control ${actionMenuComponentId === comp.id ? "is-open" : ""}`}
            >
              <button
                type="button"
                className="component-more-btn"
                onClick={() => {
                  setActionMenuComponentId((currentId) => (currentId === comp.id ? null : comp.id));
                }}
                aria-label="Component actions"
                aria-expanded={actionMenuComponentId === comp.id}
                title="Component actions"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="19" cy="12" r="1.8" />
                </svg>
              </button>

              {actionMenuComponentId === comp.id && (
                <div className="component-actions-menu" role="menu">
                  {copyableComponentTypes.has(comp.type) && (
                    <button
                      type="button"
                      className="component-actions-menu-item"
                      onClick={() => {
                        void handleCopyMainContent(comp);
                      }}
                      role="menuitem"
                    >
                      {copiedComponentId === comp.id ? "Copied" : "Copy"}
                    </button>
                  )}
                  {comp.type === "file" && (
                    <button
                      type="button"
                      className="component-actions-menu-item"
                      onClick={() => {
                        handleUploadFileFromMenu(comp.id);
                        setActionMenuComponentId(null);
                      }}
                      role="menuitem"
                    >
                      Upload File
                    </button>
                  )}
                  {comp.title === undefined && comp.type !== "title" && (
                    <button
                      type="button"
                      className="component-actions-menu-item"
                      onClick={() => {
                        handleAddTitle(comp.id);
                        setActionMenuComponentId(null);
                      }}
                      role="menuitem"
                    >
                      Add Title
                    </button>
                  )}
                  {comp.richText === undefined && (
                    <button
                      type="button"
                      className="component-actions-menu-item"
                      onClick={() => {
                        handleAddRichText(comp.id);
                        setActionMenuComponentId(null);
                      }}
                      role="menuitem"
                    >
                      Add Rich Text
                    </button>
                  )}
                  <button
                    type="button"
                    className="component-actions-menu-item"
                    onClick={() => {
                      onMoveComponentUp(comp.id);
                      setActionMenuComponentId(null);
                    }}
                    disabled={idx === 0}
                    role="menuitem"
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="component-actions-menu-item"
                    onClick={() => {
                      onMoveComponentDown(comp.id);
                      setActionMenuComponentId(null);
                    }}
                    disabled={idx === components.length - 1}
                    role="menuitem"
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="component-actions-menu-item danger"
                    onClick={() => {
                      setPendingDeleteComponent(comp);
                      setActionMenuComponentId(null);
                    }}
                    role="menuitem"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {pendingRemoveField && (
        <div className="component-confirm-backdrop" role="dialog" aria-modal="true">
          <div className="component-confirm-modal">
            <div className="component-confirm-title">
              Remove {pendingRemoveField.field === "title" ? "title" : "rich text"}?
            </div>
            <div className="component-confirm-desc">
              This will remove only the extra {pendingRemoveField.field === "title" ? "title" : "rich text"} from this
              component.
            </div>
            <div className="component-confirm-actions">
              <button
                type="button"
                className="component-confirm-secondary"
                onClick={() => setPendingRemoveField(null)}
              >
                Cancel
              </button>
              <button type="button" className="component-confirm-danger" onClick={confirmRemoveField}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

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
