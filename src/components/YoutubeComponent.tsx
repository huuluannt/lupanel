"use client";

import React, { useEffect, useState } from "react";

interface YoutubeData {
  url: string;
}

interface YoutubeComponentProps {
  value: string;
  onChange: (newValue: string) => void;
}

const extractYoutubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const isValidYoutubeUrl = (url: string): boolean => {
  return extractYoutubeId(url) !== null;
};

export default function YoutubeComponent({ value, onChange }: YoutubeComponentProps) {
  const [editing, setEditing] = useState(value === "");
  const [draftUrl, setDraftUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<YoutubeData | null>(null);

  useEffect(() => {
    if (value) {
      try {
        const parsed = JSON.parse(value) as YoutubeData;
        setData(parsed);
        setDraftUrl(parsed.url);
      } catch {
        setData(null);
      }
    } else {
      setEditing(true);
    }
  }, [value]);

  const handleInsert = () => {
    if (!draftUrl.trim()) {
      setError("Vui lòng nhập link YouTube.");
      return;
    }
    if (!isValidYoutubeUrl(draftUrl)) {
      setError("Link YouTube không hợp lệ.");
      return;
    }
    const youtubeData: YoutubeData = {
      url: draftUrl,
    };
    onChange(JSON.stringify(youtubeData));
    setError(null);
    setEditing(false);
  };

  const handleCancel = () => {
    setError(null);
    if (data) {
      setDraftUrl(data.url);
      setEditing(false);
    } else {
      setDraftUrl("");
    }
  };

  const youtubeId = data ? extractYoutubeId(data.url) : null;

  return (
    <div className="youtube-component-wrapper">
      {editing ? (
        <div className="youtube-editor">
          <input
            type="url"
            className="youtube-input"
            placeholder="https://www.youtube.com/watch?v=..."
            value={draftUrl}
            onChange={(e) => {
              setDraftUrl(e.target.value);
              setError(null);
            }}
          />
          <div className="youtube-editor-actions">
            <button type="button" className="btn-slim" onClick={handleInsert}>
              Insert
            </button>
            <button type="button" className="btn-slim" onClick={handleCancel}>
              Cancel
            </button>
          </div>
          {error && <div className="youtube-error">{error}</div>}
        </div>
      ) : youtubeId ? (
        <div style={{ position: "relative" }}>
          <div className="youtube-preview">
            <iframe
              width="100%"
              height="315"
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title="YouTube video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ borderRadius: "6px" }}
            />
          </div>
          <button
            type="button"
            className="youtube-edit-btn-inline"
            onClick={() => setEditing(true)}
            title="Chỉnh sửa"
          >
            Edit
          </button>
        </div>
      ) : null}
    </div>
  );
}
