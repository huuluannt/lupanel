"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface TitleComponentProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  onFocusNext?: () => void;
}

type TitleTheme = "default" | "color" | "pane";

interface TitleData {
  text: string;
  theme: TitleTheme;
  color: string;
}

const titleThemeOptions: Array<{ id: TitleTheme; label: string }> = [
  { id: "default", label: "Default" },
  { id: "color", label: "Color" },
  { id: "pane", label: "Pane" },
];

const titleColorOptions = ["#e4e4e7", "#fde68a", "#bfdbfe", "#bbf7d0", "#fecdd3", "#ddd6fe"];

const isTitleTheme = (value: unknown): value is TitleTheme => {
  return value === "default" || value === "color" || value === "pane";
};

const normalizeTitleData = (value: string): TitleData => {
  if (!value) return { text: "", theme: "default", color: "#e4e4e7" };

  try {
    const parsed = JSON.parse(value) as Partial<TitleData>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        text: typeof parsed.text === "string" ? parsed.text : "",
        theme: isTitleTheme(parsed.theme) ? parsed.theme : "default",
        color: typeof parsed.color === "string" && parsed.color ? parsed.color : "#e4e4e7",
      };
    }
  } catch {
    return { text: value, theme: "default", color: "#e4e4e7" };
  }

  return { text: value, theme: "default", color: "#e4e4e7" };
};

const serializeTitleData = (data: TitleData) => {
  if (data.theme === "default" && data.color === "#e4e4e7") {
    return data.text;
  }

  return JSON.stringify(data);
};

export default function TitleComponent({
  value,
  onChange,
  placeholder = "Add Title...",
  onFocusNext,
}: TitleComponentProps) {
  const titleData = useMemo(() => normalizeTitleData(value), [value]);
  const [localValue, setLocalValue] = useState(titleData.text);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!themeMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!editMenuRef.current?.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [themeMenuOpen]);

  const publishTitleData = (nextData: TitleData) => {
    onChange(serializeTitleData(nextData));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);

    // Debounce the parent onChange callback to avoid frequent storage writes
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      publishTitleData({ ...titleData, text: val });
    }, 400);
  };

  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    publishTitleData({ ...titleData, text: localValue });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onFocusNext) {
      e.preventDefault();
      onFocusNext();
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const updateTheme = (theme: TitleTheme) => {
    publishTitleData({ ...titleData, text: localValue, theme });
    setThemeMenuOpen(false);
  };

  const updateColor = (color: string) => {
    publishTitleData({ ...titleData, text: localValue, color, theme: titleData.theme === "default" ? "color" : titleData.theme });
  };

  const titleLength = Math.max(localValue.length || placeholder.length, 10);

  return (
    <div className={`title-component-wrapper title-theme-${titleData.theme}`}>
      <input
        type="text"
        className="title-input"
        placeholder={placeholder}
        value={localValue}
        style={{
          backgroundColor: titleData.theme === "default" ? "transparent" : titleData.color,
          width: titleData.theme === "default" ? "100%" : `min(100%, ${titleLength + 1}ch)`,
        }}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />

      <div className="title-edit-control" ref={editMenuRef}>
        <button
          type="button"
          className="title-edit-btn"
          onClick={(event) => {
            event.stopPropagation();
            setThemeMenuOpen((open) => !open);
          }}
          aria-label="Edit title theme"
          aria-expanded={themeMenuOpen}
          title="Edit title theme"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </button>

        {themeMenuOpen && (
          <div className="title-theme-menu">
            <div className="title-theme-group">
              {titleThemeOptions.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`title-theme-option ${titleData.theme === theme.id ? "is-active" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    updateTheme(theme.id);
                  }}
                >
                  {theme.label}
                </button>
              ))}
            </div>

            <div className="title-color-grid" aria-label="Title color">
              {titleColorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`title-color-swatch ${titleData.color === color ? "is-active" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={(event) => {
                    event.stopPropagation();
                    updateColor(color);
                  }}
                  aria-label={`Set title color ${color}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
