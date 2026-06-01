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
const galleryImageDragType = "application/x-lupanel-gallery-image";
const galleryEndDropTarget = "__gallery_end__";

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
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);

  const imagesRef = useRef(images);
  const dragSourceIdRef = useRef<string | null>(null);
  const dragOrderRef = useRef<GalleryImage[] | null>(null);
  const didPreviewReorderRef = useRef(false);
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

  const moveImageBefore = (sourceImages: GalleryImage[], draggedId: string, targetId: string) => {
    const fromIndex = sourceImages.findIndex((image) => image.id === draggedId);
    const toIndex = sourceImages.findIndex((image) => image.id === targetId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return sourceImages;

    const nextImages = [...sourceImages];
    const [movedImage] = nextImages.splice(fromIndex, 1);
    nextImages.splice(toIndex, 0, movedImage);
    return nextImages;
  };

  const moveImageToEnd = (sourceImages: GalleryImage[], draggedId: string) => {
    const fromIndex = sourceImages.findIndex((image) => image.id === draggedId);
    if (fromIndex === -1 || fromIndex === sourceImages.length - 1) return sourceImages;

    const nextImages = [...sourceImages];
    const [movedImage] = nextImages.splice(fromIndex, 1);
    nextImages.push(movedImage);
    return nextImages;
  };

  const isInternalImageDrag = (event: React.DragEvent) => {
    return Boolean(dragSourceIdRef.current || Array.from(event.dataTransfer.types).includes(galleryImageDragType));
  };

  const resetImageDragState = () => {
    dragSourceIdRef.current = null;
    dragOrderRef.current = null;
    didPreviewReorderRef.current = false;
    setDraggedImageId(null);
    setDragOverTargetId(null);
  };

  const previewImageReorder = (targetId: string) => {
    const draggedId = dragSourceIdRef.current;
    if (!draggedId) return;

    setDragOverTargetId(targetId);

    const currentOrder = dragOrderRef.current ?? imagesRef.current;
    const nextOrder =
      targetId === galleryEndDropTarget
        ? moveImageToEnd(currentOrder, draggedId)
        : moveImageBefore(currentOrder, draggedId, targetId);

    if (nextOrder === currentOrder) return;

    dragOrderRef.current = nextOrder;
    didPreviewReorderRef.current = true;
    setImages(nextOrder);
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
    if (isInternalImageDrag(event)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (isInternalImageDrag(event)) {
      event.preventDefault();
      event.stopPropagation();
      if (dragSourceIdRef.current) {
        if (didPreviewReorderRef.current) {
          publishImages(dragOrderRef.current ?? imagesRef.current);
        }
        resetImageDragState();
      }
      return;
    }

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

  const handleImageDragStart = (event: React.DragEvent<HTMLButtonElement>, imageId: string) => {
    event.stopPropagation();
    dragSourceIdRef.current = imageId;
    dragOrderRef.current = imagesRef.current;
    didPreviewReorderRef.current = false;
    setDraggedImageId(imageId);
    setDragOverTargetId(imageId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(galleryImageDragType, imageId);
    event.dataTransfer.setData("text/plain", imageId);
  };

  const handleImageDragOver = (event: React.DragEvent<HTMLDivElement>, imageId: string) => {
    if (!dragSourceIdRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    previewImageReorder(imageId);
  };

  const handleImageDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!dragSourceIdRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    publishImages(dragOrderRef.current ?? imagesRef.current);
    resetImageDragState();
  };

  const handleImageDragEnd = () => {
    if (didPreviewReorderRef.current) {
      setImages(imagesRef.current);
    }
    resetImageDragState();
  };

  const handleEndDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
    if (!dragSourceIdRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    previewImageReorder(galleryEndDropTarget);
  };

  const handleEndDrop = (event: React.DragEvent<HTMLButtonElement>) => {
    if (!dragSourceIdRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    publishImages(dragOrderRef.current ?? imagesRef.current);
    resetImageDragState();
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
          <div
            className={`gallery-tile ${draggedImageId === image.id ? "is-dragging" : ""} ${
              dragOverTargetId === image.id ? "is-drag-target" : ""
            }`}
            key={image.id}
            onDragOver={(event) => handleImageDragOver(event, image.id)}
            onDrop={handleImageDrop}
          >
            <button
              type="button"
              className="gallery-photo-button"
              draggable
              onDragStart={(event) => handleImageDragStart(event, image.id)}
              onDragEnd={handleImageDragEnd}
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
              title="Delete image"
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
          className={`gallery-add-tile ${uploadingCount > 0 ? "is-uploading" : ""} ${
            dragOverTargetId === galleryEndDropTarget ? "is-reorder-target" : ""
          }`}
          onClick={openFilePicker}
          onDragOver={handleEndDragOver}
          onDrop={handleEndDrop}
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
            <div className="gallery-confirm-title">Delete this image?</div>
            <div className="gallery-confirm-actions">
              <button type="button" className="gallery-confirm-secondary" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button type="button" className="gallery-confirm-danger" onClick={confirmDelete}>
                Delete image
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
