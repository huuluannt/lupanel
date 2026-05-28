"use client";

import React, { useState, useRef } from "react";
import ImageViewer from "./ImageViewer";

interface ImageComponentProps {
  value: string; // The image source (Base64 or Firebase URL)
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
      setError("Không thể tải hình ảnh lên. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setIsLandscape(naturalWidth > naturalHeight);
  };

  // Browse (click to choose file)
  const handleClick = () => {
    if (!uploading && !value) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Clipboard Paste (Ctrl + V)
  const handlePaste = (e: React.ClipboardEvent) => {
    if (value || uploading) return;
    
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            processFile(blob);
            break;
          }
        }
      }
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
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
            ✕
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
          tabIndex={0} // Makes it focusable to listen for Ctrl + V pastes
          aria-label="Upload Image (Click to browse, drag file, or paste image here)"
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
                  animation: "spin 0.8s linear infinite"
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
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {error && (
        <div style={{ fontSize: "10px", color: "#ef4444", marginTop: "4px" }}>
          {error}
        </div>
      )}

      {viewerOpen && (
        <ImageViewer src={value} onClose={() => setViewerOpen(false)} />
      )}
    </div>
  );
}
