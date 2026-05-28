"use client";

import React, { useRef, useState } from "react";
import ImageViewer from "./ImageViewer";

interface ImageComponentProps {
  value: string;
  onChange: (newValue: string) => void;
  onUploadImage: (file: File) => Promise<string>;
}

export default function ImageComponent({ value, onChange, onUploadImage }: ImageComponentProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const url = await onUploadImage(file);
      onChange(url);
    } catch (err) {
      console.error(err);
      setError("Could not upload the image to Cloudinary. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    setIsLandscape(naturalWidth > naturalHeight);
  };

  const handleClick = () => {
    if (!uploading && !value) {
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
    if (value || uploading) return;

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

  const requestDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    onChange("");
    setDeleteConfirmOpen(false);
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

      {value ? (
        <div className={`image-preview-container ${isLandscape ? "landscape" : "portrait"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="image-preview-img"
            onLoad={handleImageLoad}
            onClick={() => setViewerOpen(true)}
            style={{ cursor: "zoom-in" }}
          />
          <button className="image-delete-btn" onClick={requestDelete} title="Delete image">
            X
          </button>
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

      {viewerOpen && <ImageViewer src={value} onClose={() => setViewerOpen(false)} />}

      {deleteConfirmOpen && (
        <div className="component-confirm-backdrop" role="dialog" aria-modal="true">
          <div className="component-confirm-modal">
            <div className="component-confirm-title">Delete this image?</div>
            <div className="component-confirm-desc">This image will be removed from the component.</div>
            <div className="component-confirm-actions">
              <button
                type="button"
                className="component-confirm-secondary"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="component-confirm-danger" onClick={confirmDelete}>
                Delete image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
