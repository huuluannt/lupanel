"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ImageViewer from "./ImageViewer";

interface ImageComponentProps {
  value: string;
  onChange: (newValue: string) => void;
  onUploadImage: (file: File) => Promise<string>;
}

const imageWidthOptions = [25, 50, 75, 100] as const;
type ImageWidthPercent = (typeof imageWidthOptions)[number];

interface ImageData {
  src: string;
  widthPercent: ImageWidthPercent;
}

const isImageWidthPercent = (value: unknown): value is ImageWidthPercent => {
  return typeof value === "number" && imageWidthOptions.includes(value as ImageWidthPercent);
};

const normalizeImageData = (value: string): ImageData => {
  if (!value) return { src: "", widthPercent: 100 };

  try {
    const parsed = JSON.parse(value) as Partial<ImageData>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        src: typeof parsed.src === "string" ? parsed.src : "",
        widthPercent: isImageWidthPercent(parsed.widthPercent) ? parsed.widthPercent : 100,
      };
    }
  } catch {
    return { src: value, widthPercent: 100 };
  }

  return { src: value, widthPercent: 100 };
};

const serializeImageData = (imageData: ImageData) => {
  if (!imageData.src) return "";
  return JSON.stringify(imageData);
};

export default function ImageComponent({ value, onChange, onUploadImage }: ImageComponentProps) {
  const imageData = useMemo(() => normalizeImageData(value), [value]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [widthMenuOpen, setWidthMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!widthMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!editMenuRef.current?.contains(event.target as Node)) {
        setWidthMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [widthMenuOpen]);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const url = await onUploadImage(file);
      onChange(serializeImageData({ src: url, widthPercent: imageData.widthPercent }));
    } catch (err) {
      console.error(err);
      setError("Could not upload the image to Cloudinary. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    if (!uploading && !imageData.src) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      void processFile(event.target.files[0]);
    }
  };

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (event.dataTransfer.files?.[0]) {
      void processFile(event.dataTransfer.files[0]);
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    if (imageData.src || uploading) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    for (let index = 0; index < items.length; index += 1) {
      if (items[index].type.includes("image")) {
        const blob = items[index].getAsFile();
        if (blob) {
          event.preventDefault();
          void processFile(blob);
          break;
        }
      }
    }
  };

  const updateWidth = (widthPercent: ImageWidthPercent) => {
    onChange(serializeImageData({ ...imageData, widthPercent }));
    setWidthMenuOpen(false);
  };

  return (
    <div className="image-component-wrapper">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        style={{ display: "none" }}
      />

      {imageData.src ? (
        <div className="image-preview-container" style={{ width: `${imageData.widthPercent}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageData.src}
            alt="Preview"
            className="image-preview-img"
            onClick={() => setViewerOpen(true)}
            style={{ cursor: "zoom-in" }}
          />
          <div className="image-edit-control" ref={editMenuRef}>
            <button
              type="button"
              className="image-edit-btn"
              onClick={(event) => {
                event.stopPropagation();
                setWidthMenuOpen((open) => !open);
              }}
              aria-label="Edit image width"
              aria-expanded={widthMenuOpen}
              title="Edit image width"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </button>

            {widthMenuOpen && (
              <div className="image-width-menu">
                {imageWidthOptions.map((widthPercent) => (
                  <button
                    key={widthPercent}
                    type="button"
                    className={`image-width-option ${imageData.widthPercent === widthPercent ? "is-active" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      updateWidth(widthPercent);
                    }}
                  >
                    {widthPercent}%
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          className={`image-square-placeholder ${dragActive ? "drag-active" : ""}`}
          onClick={handleClick}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onPaste={handlePaste}
          tabIndex={0}
          aria-label="Upload image by browsing, dragging, or pasting"
          style={{ outline: "none" }}
        >
          {uploading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  border: "1.5px solid var(--border-light)",
                  borderTopColor: "var(--border-focus)",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Uploading...</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div className="image-plus-icon">+</div>
              <span style={{ fontSize: "9px", color: "var(--text-muted)", textAlign: "center", padding: "0 8px" }}>
                Browse / Drag / Paste
              </span>
            </div>
          )}
        </div>
      )}

      {error && <div style={{ fontSize: "10px", color: "#ef4444", marginTop: "4px" }}>{error}</div>}

      {viewerOpen && <ImageViewer src={imageData.src} onClose={() => setViewerOpen(false)} />}
    </div>
  );
}
