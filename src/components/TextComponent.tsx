"use client";

import React, { useEffect, useRef, useState } from "react";

interface TextComponentProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  onFocusNext?: () => void;
}

export default function TextComponent({
  value,
  onChange,
  placeholder = "Start writing...",
  onFocusNext,
}: TextComponentProps) {
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-grow height logic
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalValue(val);

    // Debounce state saving
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Ctrl + Enter, trigger focus next
    if (e.key === "Enter" && e.ctrlKey && onFocusNext) {
      e.preventDefault();
      onFocusNext();
    }
  };

  useEffect(() => {
    // Initial height adjustment
    adjustHeight();
    
    // Clean up
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="text-component-wrapper">
      <textarea
        ref={textareaRef}
        className="text-textarea"
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        rows={1}
      />
    </div>
  );
}
