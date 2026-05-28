"use client";

import React, { useMemo, useRef, useState } from "react";
import ImageViewer, { ViewerImage } from "./ImageViewer";

interface GalleryImage {
  id: string;
  src: string;
  caption: string;
}

interface GalleryData {
  images: GalleryImage[];
}

interface GalleryComponentProps {
  value: string;
  onChange: (newValue: string) => void;
  onUploadImage: (file: File) => Promise<string>;
}

const createGalleryImageId = () => `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const normalizeGalleryData = (value: string): GalleryData => {
  if (!value) return { images: [] };

  try {
    const parsed = JSON.parse(value) as Partial<GalleryData> | GalleryImage[];
    const source = Array.isArray(parsed) ? parsed : parsed.images;
    const images = Array.isArray(source)
      ? source
          .map((item) => ({
            id: typeof item?.id === "string" && item.id ? item.id : createGalleryImageId(),
            src: typeof item?.src === "string" ? item.src : "",
            caption: typeof item?.caption === "string" ? item.caption : "",
          }))
          .filter((item) => item.src)
      : [];

    return { images };
  } catch {
    return { images: [] };
  }
};

export default function GalleryComponent({
  value,
  onChange,
  onUploadImage,
}: GalleryComponentProps) {
  const [images, setImages] = useState<GalleryImage[]>(() => normalizeGalleryData(value).images);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<GalleryImage | null>(null);

  const imagesRef = useRef(images);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const viewerImages = useMemo<ViewerImage[]>(
    () => images.map((image) => ({ src: image.src, caption: image.caption })),
    [images]
  );

  const publishImages = (nextImages: GalleryImage[]) => {
    imagesRef.current = nextImages;
    setImages(nextImages);
    onChange(JSON.stringify({ images: nextImages }));
  };

  const uploadFiles = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setError("Chi nhan file hinh anh.");
      return;
    }

    setUploadingCount((count) => count + imageFiles.length);
    setError(null);

    const results = await Promise.allSettled(
      imageFiles.map(async (file) => ({
        id: createGalleryImageId(),
        src: await onUploadImage(file),
        caption: "",
      }))
    );

    const uploadedImages = results
      .filter((result): result is PromiseFulfilledResult<GalleryImage> => result.status === "fulfilled")
      .map((result) => result.value);

    if (uploadedImages.length > 0) {
      publishImages([...imagesRef.current, ...uploadedImages]);
    }

    if (uploadedImages.length < imageFiles.length) {
      setError("Mot vai anh chua upload duoc. Vui long thu lai.");
    }

    setUploadingCount((count) => Math.max(0, count - imageFiles.length));
  };

  const openFilePicker = () => {
    wrapperRef.current?.focus();
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      void uploadFiles(Array.from(event.target.files));
      event.target.value = "";
    }
  };

  const handleDrag = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (event.dataTransfer.files?.length) {
      void uploadFiles(Array.from(event.dataTransfer.files));
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.clipboardData?.items ?? []);
    const pastedImages = items
      .filter((item) => item.type.includes("image"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (pastedImages.length === 0) return;

    event.preventDefault();
    void uploadFiles(pastedImages);
  };

  const updateCaption = (id: string, caption: string) => {
    publishImages(images.map((image) => (image.id === id ? { ...image, caption } : image)));
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    publishImages(imagesRef.current.filter((image) => image.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  return (
    <div
      ref={wrapperRef}
      className={`gallery-component-wrapper ${dragActive ? "drag-active" : ""}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
      aria-label="Gallery"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div className="gallery-grid">
        {images.map((image, index) => (
          <div className="gallery-tile" key={image.id}>
            <button
              type="button"
              className="gallery-photo-button"
              onClick={() => setViewerIndex(index)}
              title="Open image"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt={image.caption || `Gallery image ${index + 1}`} draggable={false} />
            </button>
            <button
              type="button"
              className="gallery-image-delete-btn"
              onClick={() => setPendingDelete(image)}
              title="Xoa anh"
            >
              X
            </button>
            <input
              className="gallery-caption-input"
              value={image.caption}
              onChange={(event) => updateCaption(image.id, event.target.value)}
              placeholder="Caption"
            />
          </div>
        ))}

        <button
          type="button"
          className={`gallery-add-tile ${uploadingCount > 0 ? "is-uploading" : ""}`}
          onClick={openFilePicker}
          aria-label="Add gallery images"
          title="Browse / Drag & Drop / Ctrl+V"
        >
          {uploadingCount > 0 ? <span className="gallery-upload-spinner" /> : <span className="gallery-plus">+</span>}
        </button>
      </div>

      {error && <div className="gallery-error">{error}</div>}

      {pendingDelete && (
        <div className="gallery-confirm-backdrop" role="dialog" aria-modal="true">
          <div className="gallery-confirm-modal">
            <div className="gallery-confirm-title">Xoa anh nay?</div>
            <div className="gallery-confirm-actions">
              <button type="button" className="gallery-confirm-secondary" onClick={() => setPendingDelete(null)}>
                Huy
              </button>
              <button type="button" className="gallery-confirm-danger" onClick={confirmDelete}>
                Xoa anh
              </button>
            </div>
          </div>
        </div>
      )}

      {viewerIndex !== null && viewerImages[viewerIndex] && (
        <ImageViewer
          src={viewerImages[viewerIndex].src}
          items={viewerImages}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}
