"use client";

import React, { useEffect, useState } from "react";

interface UrlComponentProps {
  value: string;
  onChange: (newValue: string) => void;
}

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const isValidUrl = (value: string) => {
  try {
    new URL(normalizeUrl(value));
    return true;
  } catch {
    return false;
  }
};

export default function UrlComponent({ value, onChange }: UrlComponentProps) {
  const [editing, setEditing] = useState(value === "");
  const [draftUrl, setDraftUrl] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftUrl(value);
    setEditing(value === "");
  }, [value]);

  const handleInsert = () => {
    if (!draftUrl.trim()) {
      setError("Vui lòng nhập đường dẫn.");
      return;
    }
    if (!isValidUrl(draftUrl)) {
      setError("Đường dẫn không hợp lệ.");
      return;
    }
    const normalized = normalizeUrl(draftUrl);
    onChange(normalized);
    setError(null);
    setEditing(false);
  };

  const handleCancel = () => {
    setError(null);
    setDraftUrl(value);
    setEditing(value === "");
  };

  return (
    <div className="url-component-wrapper">
      {editing ? (
        <div className="url-editor">
          <input
            type="url"
            className="url-input"
            placeholder="https://example.com"
            value={draftUrl}
            onChange={(e) => {
              setDraftUrl(e.target.value);
              setError(null);
            }}
          />
          <div className="url-editor-actions">
            <button type="button" className="btn-slim" onClick={handleInsert}>
              Insert
            </button>
            <button type="button" className="btn-slim" onClick={handleCancel}>
              Cancel
            </button>
          </div>
          {error && <div className="url-error">{error}</div>}
        </div>
      ) : (
        <div className="url-preview">
          <a href={value} target="_blank" rel="noopener noreferrer">
            {value}
          </a>
          <button type="button" className="url-edit-btn" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
