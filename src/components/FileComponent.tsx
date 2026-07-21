"use client";

import React, { useEffect, useRef, useState } from "react";

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  extension: string;
}

interface FileData {
  files: UploadedFile[];
}

interface FileComponentProps {
  value: string;
  onChange: (newValue: string) => void;
  onUploadFile: (file: File) => Promise<string>;
  uploadTriggerToken?: number;
  hideAddMoreButton?: boolean;
}

type FileKind = "word" | "excel" | "powerpoint" | "pdf" | "txt" | "photo" | "video" | "zip" | "other";

const createFileId = () => `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getExtension = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) return "";
  return fileName.slice(lastDotIndex + 1).toLowerCase();
};

const getFileKind = (file: Pick<UploadedFile, "extension" | "mimeType">): FileKind => {
  const extension = file.extension.toLowerCase();
  const mimeType = file.mimeType.toLowerCase();

  if (["doc", "docx"].includes(extension) || mimeType.includes("word")) return "word";
  if (["xls", "xlsx", "csv"].includes(extension) || mimeType.includes("excel") || mimeType.includes("spreadsheet")) {
    return "excel";
  }
  if (["ppt", "pptx"].includes(extension) || mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
    return "powerpoint";
  }
  if (extension === "pdf" || mimeType.includes("pdf")) return "pdf";
  if (["txt", "md", "rtf"].includes(extension) || mimeType.startsWith("text/")) return "txt";
  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "heic"].includes(extension)) {
    return "photo";
  }
  if (mimeType.startsWith("video/") || ["mp4", "mov", "avi", "mkv", "webm"].includes(extension)) return "video";
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension) || mimeType.includes("zip") || mimeType.includes("archive")) {
    return "zip";
  }

  return "other";
};

const getFileKindLabel = (kind: FileKind) => {
  switch (kind) {
    case "word":
      return "W";
    case "excel":
      return "X";
    case "powerpoint":
      return "P";
    case "pdf":
      return "PDF";
    case "txt":
      return "TXT";
    case "photo":
      return "IMG";
    case "video":
      return "VID";
    case "zip":
      return "ZIP";
    default:
      return "FILE";
  }
};

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const normalizeFileData = (value: string): FileData => {
  if (!value) return { files: [] };

  try {
    const parsed = JSON.parse(value) as Partial<FileData> | UploadedFile[];
    const source = Array.isArray(parsed) ? parsed : parsed.files;
    const files = Array.isArray(source)
      ? source
          .map((item) => ({
            id: typeof item?.id === "string" && item.id ? item.id : createFileId(),
            name: typeof item?.name === "string" ? item.name : "Untitled file",
            url: typeof item?.url === "string" ? item.url : "",
            size: typeof item?.size === "number" ? item.size : 0,
            mimeType: typeof item?.mimeType === "string" ? item.mimeType : "",
            extension: typeof item?.extension === "string" ? item.extension : getExtension(item?.name || ""),
          }))
          .filter((item) => item.url)
      : [];

    return { files };
  } catch {
    return { files: [] };
  }
};

export default function FileComponent({
  value,
  onChange,
  onUploadFile,
  uploadTriggerToken,
  hideAddMoreButton = false,
}: FileComponentProps) {
  const [files, setFiles] = useState<UploadedFile[]>(() => normalizeFileData(value).files);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UploadedFile | null>(null);

  const filesRef = useRef(files);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTriggerTokenRef = useRef(uploadTriggerToken);

  const publishFiles = (nextFiles: UploadedFile[]) => {
    filesRef.current = nextFiles;
    setFiles(nextFiles);
    onChange(JSON.stringify({ files: nextFiles }));
  };

  const uploadFiles = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    setUploadingCount((count) => count + selectedFiles.length);
    setError(null);

    const results = await Promise.allSettled(
      selectedFiles.map(async (file) => ({
        id: createFileId(),
        name: file.name,
        url: await onUploadFile(file),
        size: file.size,
        mimeType: file.type,
        extension: getExtension(file.name),
      }))
    );

    const uploadedFiles = results
      .filter((result): result is PromiseFulfilledResult<UploadedFile> => result.status === "fulfilled")
      .map((result) => result.value);

    if (uploadedFiles.length > 0) {
      publishFiles([...filesRef.current, ...uploadedFiles]);
    }

    if (uploadedFiles.length < selectedFiles.length) {
      setError("Some files could not be uploaded. Please try again.");
    }

    setUploadingCount((count) => Math.max(0, count - selectedFiles.length));
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (uploadTriggerTokenRef.current === uploadTriggerToken) return;
    uploadTriggerTokenRef.current = uploadTriggerToken;
    fileInputRef.current?.click();
  }, [uploadTriggerToken]);

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

  const confirmDelete = () => {
    if (!pendingDelete) return;
    publishFiles(filesRef.current.filter((file) => file.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  return (
    <div
      className={`file-component-wrapper ${dragActive ? "drag-active" : ""}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} style={{ display: "none" }} />

      {files.length === 0 ? (
        <button
          type="button"
          className="file-upload-placeholder"
          onClick={openFilePicker}
          aria-label="Upload files"
        >
          {uploadingCount > 0 ? (
            <span className="file-upload-spinner" aria-hidden="true" />
          ) : (
            <span className="file-upload-plus">+</span>
          )}
          <span>{uploadingCount > 0 ? `Uploading ${uploadingCount}...` : "Upload File"}</span>
        </button>
      ) : (
        <div className="file-list">
          {files.map((file) => {
            const kind = getFileKind(file);
            const sizeLabel = formatFileSize(file.size);

            return (
              <div className="file-row" key={file.id}>
                <span className={`file-kind-icon ${kind}`} aria-hidden="true">
                  {getFileKindLabel(kind)}
                </span>
                <a className="file-name" href={file.url} target="_blank" rel="noreferrer" title={file.name}>
                  {file.name}
                </a>
                {sizeLabel && <span className="file-size">{sizeLabel}</span>}
                <button
                  type="button"
                  className="file-remove-btn"
                  onClick={() => setPendingDelete(file)}
                  title="Delete file"
                >
                  X
                </button>
              </div>
            );
          })}

          {!hideAddMoreButton && (
            <button type="button" className="file-add-more-btn" onClick={openFilePicker}>
              {uploadingCount > 0 ? (
                <span className="file-upload-spinner small" aria-hidden="true" />
              ) : (
                <span>+</span>
              )}
              <span>{uploadingCount > 0 ? `Uploading ${uploadingCount}...` : "Upload File"}</span>
            </button>
          )}
        </div>
      )}

      {error && <div className="file-error">{error}</div>}

      {pendingDelete && (
        <div className="component-confirm-backdrop" role="dialog" aria-modal="true">
          <div className="component-confirm-modal">
            <div className="component-confirm-title">Delete this file?</div>
            <div className="component-confirm-desc">
              {pendingDelete.name} will be removed from this component.
            </div>
            <div className="component-confirm-actions">
              <button type="button" className="component-confirm-secondary" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button type="button" className="component-confirm-danger" onClick={confirmDelete}>
                Delete file
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
