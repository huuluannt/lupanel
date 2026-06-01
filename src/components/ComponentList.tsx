"use client";

import React, { useRef, useState } from "react";
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

interface ComponentListProps {
  components: PanelComponent[];
  onComponentChange: (id: string, value: string) => void;
  onComponentTitleChange: (id: string, title: string) => void;
  onDeleteComponent: (id: string) => void;
  onMoveComponentUp: (id: string) => void;
  onMoveComponentDown: (id: string) => void;
  onUploadFile: (file: File) => Promise<string>;
  selectedComponentId: string | null;
  onSelectComponent: (id: string) => void;
}

export default function ComponentList({
  components,
  onComponentChange,
  onComponentTitleChange,
  onDeleteComponent,
  onMoveComponentUp,
  onMoveComponentDown,
  onUploadFile,
  selectedComponentId,
  onSelectComponent,
}: ComponentListProps) {
  const componentRefs = useRef<Record<string, { focus?: () => void } | null>>({});
  const titleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [pendingDeleteComponent, setPendingDeleteComponent] = useState<PanelComponent | null>(null);

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

          <div className="component-content-wrapper">
            {selectedComponentId === comp.id && comp.title === undefined && comp.type !== "title" && (
              <div className="component-title-toolbar">
                <button
                  type="button"
                  className="component-title-toolbar-btn"
                  onClick={() => handleAddTitle(comp.id)}
                >
                  + Add Title
                </button>
              </div>
            )}

            {comp.title !== undefined && (
              <input
                ref={(element) => {
                  titleInputRefs.current[comp.id] = element;
                }}
                className="component-inner-title-input"
                value={comp.title}
                onChange={(event) => onComponentTitleChange(comp.id, event.target.value)}
                placeholder="Title"
              />
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
