"use client";

import React, { useRef } from "react";
import { PanelComponent } from "../lib/storage";
import TitleComponent from "./TitleComponent";
import TextComponent from "./TextComponent";
import ImageComponent from "./ImageComponent";
import UrlComponent from "./UrlComponent";
import YoutubeComponent from "./YoutubeComponent";

interface ComponentListProps {
  components: PanelComponent[];
  onComponentChange: (id: string, value: string) => void;
  onDeleteComponent: (id: string) => void;
  onMoveComponentUp: (id: string) => void;
  onMoveComponentDown: (id: string) => void;
  onUploadImage: (file: File) => Promise<string>;
}

export default function ComponentList({
  components,
  onComponentChange,
  onDeleteComponent,
  onMoveComponentUp,
  onMoveComponentDown,
  onUploadImage,
}: ComponentListProps) {
  // To allow smooth focus jumping
  const componentRefs = useRef<Record<string, { focus?: () => void } | null>>({});

  const handleFocusNext = (currentIndex: number) => {
    if (currentIndex + 1 < components.length) {
      const nextComp = components[currentIndex + 1];
      const nextRef = componentRefs.current[nextComp.id];
      // Focus if it's an input or textarea
      if (nextRef) {
        nextRef.focus?.();
      }
    }
  };

  if (components.length === 0) {
    return (
      <div className="empty-state">
        Trang trống. Hãy nhấn <strong>+ Add Component</strong> ở header để thêm nội dung.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0px", paddingBottom: "100px" }}>
      {components.map((comp, idx) => {
        return (
          <div key={comp.id} className="component-row">
            {/* Minimal drag actions on the left */}
            <div className="component-controls">
              <button
                className="component-control-btn"
                onClick={() => onMoveComponentUp(comp.id)}
                title="Di chuyển lên"
                disabled={idx === 0}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 15l6-6 6 6" />
                </svg>
              </button>
              <button
                className="component-control-btn"
                onClick={() => onMoveComponentDown(comp.id)}
                title="Di chuyển xuống"
                disabled={idx === components.length - 1}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            {/* Component Content rendering */}
            <div className="component-content-wrapper">
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

              {comp.type === "image" && (
                <ImageComponent
                  value={comp.value}
                  onChange={(val) => onComponentChange(comp.id, val)}
                  onUploadImage={onUploadImage}
                />
              )}

              {comp.type === "url" && (
                <UrlComponent
                  value={comp.value}
                  onChange={(val) => onComponentChange(comp.id, val)}
                />
              )}

              {comp.type === "youtube" && (
                <YoutubeComponent
                  value={comp.value}
                  onChange={(val) => onComponentChange(comp.id, val)}
                />
              )}

              <button
                className="component-delete-btn"
                onClick={() => onDeleteComponent(comp.id)}
                title="Xóa thành phần"
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
