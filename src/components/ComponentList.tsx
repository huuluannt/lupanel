"use client";

import React, { useRef } from "react";
import { PanelComponent } from "../lib/storage";
import TitleComponent from "./TitleComponent";
import TextComponent from "./TextComponent";
import ImageComponent from "./ImageComponent";

interface ComponentListProps {
  components: PanelComponent[];
  onComponentChange: (id: string, value: string) => void;
  onDeleteComponent: (id: string) => void;
  onUploadImage: (file: File) => Promise<string>;
}

export default function ComponentList({
  components,
  onComponentChange,
  onDeleteComponent,
  onUploadImage,
}: ComponentListProps) {
  // To allow smooth focus jumping
  const componentRefs = useRef<{ [key: string]: any }>({});

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
            {/* Minimal drag/delete hover actions on the left */}
            <div className="component-controls">
              <button 
                className="component-control-btn" 
                onClick={() => onDeleteComponent(comp.id)}
                title="Xóa thành phần"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Component Content rendering */}
            <div style={{ width: "100%" }}>
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
