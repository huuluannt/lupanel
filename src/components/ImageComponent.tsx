"use client";

import React, { useRef, useState } from "react";
import ImageViewer from "./ImageViewer";

interface ImageComponentProps {
  value: string;
  onChange: (newValue: string) => void;
  onUploadImage: (file: File) => Promise<string>;
}

export default function ImageComponent({
  value,
  onChange,
  onUploadImage,
}: ImageComponentProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Chỉ chấp nhận file hình ảnh.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const url = await onUploadImage(file);
      onChange(url);
    } catch (err) {
      console.error(err);
      setError("Không thể tải hình ảnh lên Cloudinary. Vui lòng thử lại.");
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
      processFile(event.target.files[0]);
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
      processFile(event.dataTransfer.files[0]);
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
          processFile(blob);
          break;
        }
      }
    }
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange("");
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
          <button className="image-delete-btn" onClick={handleDelete} title="Xóa ảnh">
            ×
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

          <style jsx global>{`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      )}

      {error && (
        <div style={{ fontSize: "10px", color: "#ef4444", marginTop: "4px" }}>
          {error}
        </div>
      )}

      {viewerOpen && <ImageViewer src={value} onClose={() => setViewerOpen(false)} />}
    </div>
  );
}
