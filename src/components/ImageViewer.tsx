"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface ImageViewerProps {
  src: string;
  onClose: () => void;
}

export default function ImageViewer({ src, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const translateAtDragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Zoom with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(Math.max(s * delta, 0.2), 8));
  }, []);

  // Pan: mouse down
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateAtDragStart.current = { ...translate };
  };

  // Pan: mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTranslate({
      x: translateAtDragStart.current.x + dx,
      y: translateAtDragStart.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

  // Touch support for mobile pan
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    translateAtDragStart.current = { ...translate };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || !touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;
    setTranslate({
      x: translateAtDragStart.current.x + dx,
      y: translateAtDragStart.current.y + dy,
    });
  };

  const handleZoomIn = () => setScale((s) => Math.min(s * 1.3, 8));
  const handleZoomOut = () => setScale((s) => Math.max(s * 0.77, 0.2));
  const handleReset = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = `image-${Date.now()}.png`;
    a.click();
  };

  // Click on backdrop closes viewer (but not when panning)
  const clickStartPos = useRef<{ x: number; y: number } | null>(null);
  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    clickStartPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (!clickStartPos.current) return;
    const dx = Math.abs(e.clientX - clickStartPos.current.x);
    const dy = Math.abs(e.clientY - clickStartPos.current.y);
    if (dx < 4 && dy < 4) onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      {/* Toolbar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "4px",
          padding: "0 16px",
          zIndex: 100000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Zoom out */}
        <button style={toolbarBtnStyle} onClick={handleZoomOut} title="Thu nhỏ (-)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>

        {/* Zoom level label */}
        <button style={{ ...toolbarBtnStyle, minWidth: "46px", fontSize: "11px", cursor: "default" }} onClick={handleReset} title="Reset zoom">
          {Math.round(scale * 100)}%
        </button>

        {/* Zoom in */}
        <button style={toolbarBtnStyle} onClick={handleZoomIn} title="Phóng to (+)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>

        <div style={{ width: "1px", height: "18px", backgroundColor: "rgba(255,255,255,0.2)", margin: "0 6px" }} />

        {/* Download */}
        <button style={toolbarBtnStyle} onClick={handleDownload} title="Tải ảnh về">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>

        <div style={{ width: "1px", height: "18px", backgroundColor: "rgba(255,255,255,0.2)", margin: "0 6px" }} />

        {/* Close */}
        <button style={toolbarBtnStyle} onClick={onClose} title="Đóng (ESC)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Image canvas */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onWheel={handleWheel}
        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e); }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Preview"
          draggable={false}
          style={{
            maxWidth: "90vw",
            maxHeight: "85vh",
            objectFit: "contain",
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.08s ease-out",
            userSelect: "none",
            borderRadius: "4px",
          }}
        />
      </div>
    </div>
  );
}

const toolbarBtnStyle: React.CSSProperties = {
  width: "32px",
  height: "32px",
  borderRadius: "6px",
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "rgba(255,255,255,0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "background 0.15s",
  fontSize: "11px",
  fontFamily: "inherit",
};
