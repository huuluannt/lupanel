"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface ViewerImage {
  src: string;
  caption?: string;
}

interface ImageViewerProps {
  src: string;
  onClose: () => void;
  items?: ViewerImage[];
  initialIndex?: number;
}

const clampIndex = (index: number, length: number) => {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
};

export default function ImageViewer({
  src,
  onClose,
  items,
  initialIndex = 0,
}: ImageViewerProps) {
  const imageItems = useMemo<ViewerImage[]>(() => {
    return items?.length ? items : [{ src }];
  }, [items, src]);

  const [currentIndex, setCurrentIndex] = useState(() => clampIndex(initialIndex, imageItems.length));
  const [slideDirection, setSlideDirection] = useState<"next" | "prev" | "none">("none");
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const translateAtDragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const clickStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchLatest = useRef<{ x: number; y: number } | null>(null);

  const currentImage = imageItems[currentIndex] ?? { src };
  const canNavigate = imageItems.length > 1;

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  const goToIndex = useCallback(
    (targetIndex: number, direction: "next" | "prev") => {
      if (!canNavigate) return;
      const wrappedIndex = (targetIndex + imageItems.length) % imageItems.length;
      setSlideDirection(direction);
      setCurrentIndex(wrappedIndex);
      resetView();
    },
    [canNavigate, imageItems.length, resetView]
  );

  const goPrevious = useCallback(() => {
    goToIndex(currentIndex - 1, "prev");
  }, [currentIndex, goToIndex]);

  const goNext = useCallback(() => {
    goToIndex(currentIndex + 1, "next");
  }, [currentIndex, goToIndex]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (!canNavigate) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [canNavigate, goNext, goPrevious, onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setScale((currentScale) => Math.min(Math.max(currentScale * delta, 0.2), 8));
  }, []);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: event.clientX, y: event.clientY };
    translateAtDragStart.current = { ...translate };
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return;
    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;
    setTranslate({
      x: translateAtDragStart.current.x + dx,
      y: translateAtDragStart.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStart.current = null;
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length !== 1) return;
    const point = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    touchStart.current = point;
    touchLatest.current = point;
    translateAtDragStart.current = { ...translate };
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (event.touches.length !== 1 || !touchStart.current) return;
    const point = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    touchLatest.current = point;

    if (scale <= 1.05) return;

    const dx = point.x - touchStart.current.x;
    const dy = point.y - touchStart.current.y;
    setTranslate({
      x: translateAtDragStart.current.x + dx,
      y: translateAtDragStart.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart.current || !touchLatest.current || !canNavigate || scale > 1.05) {
      touchStart.current = null;
      touchLatest.current = null;
      return;
    }

    const dx = touchLatest.current.x - touchStart.current.x;
    const dy = touchLatest.current.y - touchStart.current.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      if (dx > 0) {
        goPrevious();
      } else {
        goNext();
      }
    }

    touchStart.current = null;
    touchLatest.current = null;
  };

  const handleZoomIn = () => setScale((currentScale) => Math.min(currentScale * 1.3, 8));
  const handleZoomOut = () => setScale((currentScale) => Math.max(currentScale * 0.77, 0.2));

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = currentImage.src;
    link.download = `image-${Date.now()}.png`;
    link.click();
  };

  const handleBackdropMouseDown = (event: React.MouseEvent) => {
    clickStartPos.current = { x: event.clientX, y: event.clientY };
  };

  const handleBackdropClick = () => {
    if (!clickStartPos.current) return;
    onClose();
  };

  const handleCanvasClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!clickStartPos.current) return;
    const dx = Math.abs(event.clientX - clickStartPos.current.x);
    const dy = Math.abs(event.clientY - clickStartPos.current.y);
    if (dx >= 4 || dy >= 4) return;
  };

  return (
    <div
      className="image-viewer-backdrop"
      onMouseDown={handleBackdropMouseDown}
      onClick={handleBackdropClick}
    >
      <div className="image-viewer-toolbar" onClick={(event) => event.stopPropagation()}>
        {canNavigate && (
          <button className="image-viewer-count" type="button" title="Image count">
            {currentIndex + 1}/{imageItems.length}
          </button>
        )}

        <button style={toolbarBtnStyle} onClick={handleZoomOut} title="Zoom out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>

        <button style={{ ...toolbarBtnStyle, minWidth: "46px", width: "46px", fontSize: "11px" }} onClick={resetView} title="Reset zoom">
          {Math.round(scale * 100)}%
        </button>

        <button style={toolbarBtnStyle} onClick={handleZoomIn} title="Zoom in">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>

        <div className="image-viewer-divider" />

        <button style={toolbarBtnStyle} onClick={handleDownload} title="Download image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        <div className="image-viewer-divider" />

        <button style={toolbarBtnStyle} onClick={onClose} title="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {canNavigate && (
        <>
          <button
            type="button"
            className="image-viewer-nav image-viewer-nav-prev"
            onClick={(event) => {
              event.stopPropagation();
              goPrevious();
            }}
            title="Previous image"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            className="image-viewer-nav image-viewer-nav-next"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            title="Next image"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      <div
        ref={containerRef}
        className={`image-viewer-canvas ${isDragging ? "is-dragging" : ""}`}
        onWheel={handleWheel}
        onMouseDown={(event) => {
          event.stopPropagation();
          handleMouseDown(event);
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCanvasClick}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={`${currentImage.src}-${currentIndex}`}
          src={currentImage.src}
          alt={currentImage.caption || "Preview"}
          draggable={false}
          className={`image-viewer-img ${
            slideDirection === "prev" ? "image-viewer-img-prev" : "image-viewer-img-next"
          }`}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.08s ease-out",
          }}
        />
      </div>

      {currentImage.caption && (
        <div className="image-viewer-caption" onClick={(event) => event.stopPropagation()}>
          {currentImage.caption}
        </div>
      )}
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
