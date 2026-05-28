"use client";

import React, { useState, useEffect, useRef } from "react";

interface TitleComponentProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  onFocusNext?: () => void;
}

export default function TitleComponent({
  value,
  onChange,
  placeholder = "Add Title...",
  onFocusNext,
}: TitleComponentProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);

    // Debounce the parent onChange callback to avoid frequent storage writes
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onChange(val);
    }, 400);
  };

  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onChange(localValue);
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

  return (
    <div className="title-component-wrapper">
      <input
        type="text"
        className="title-input"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
