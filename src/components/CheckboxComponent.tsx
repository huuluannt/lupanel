"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface CheckboxItem {
  id: string;
  text: string;
  checked: boolean;
}

interface CheckboxData {
  items: CheckboxItem[];
}

interface CheckboxComponentProps {
  value: string;
  onChange: (newValue: string) => void;
}

const createCheckboxItem = (text = ""): CheckboxItem => ({
  id: `checkbox-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  text,
  checked: false,
});

const createDefaultItems = () => [createCheckboxItem(), createCheckboxItem()];

const normalizeCheckboxData = (value: string): CheckboxData => {
  if (!value) return { items: createDefaultItems() };

  try {
    const parsed = JSON.parse(value) as Partial<CheckboxData> | CheckboxItem[];
    const source = Array.isArray(parsed) ? parsed : parsed.items;
    const items = Array.isArray(source)
      ? source.map((item) => ({
          id: typeof item?.id === "string" && item.id ? item.id : createCheckboxItem().id,
          text: typeof item?.text === "string" ? item.text : "",
          checked: Boolean(item?.checked),
        }))
      : [];

    return { items: items.length ? items : createDefaultItems() };
  } catch {
    return { items: createDefaultItems() };
  }
};

export const createDefaultCheckboxValue = () => JSON.stringify({ items: createDefaultItems() });

export default function CheckboxComponent({ value, onChange }: CheckboxComponentProps) {
  const initialItems = useMemo(() => normalizeCheckboxData(value).items, [value]);
  const [items, setItems] = useState<CheckboxItem[]>(initialItems);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<CheckboxItem | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const publishItems = (nextItems: CheckboxItem[]) => {
    const safeItems = nextItems.length ? nextItems : [createCheckboxItem()];
    setItems(safeItems);
    onChange(JSON.stringify({ items: safeItems }));
  };

  const updateItemText = (id: string, text: string) => {
    publishItems(items.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const toggleItem = (id: string) => {
    publishItems(items.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
  };

  const insertItemAfter = (id: string) => {
    const currentIndex = items.findIndex((item) => item.id === id);
    const insertIndex = currentIndex === -1 ? items.length : currentIndex + 1;
    const nextItem = createCheckboxItem();
    const nextItems = [...items];
    nextItems.splice(insertIndex, 0, nextItem);
    setPendingFocusId(nextItem.id);
    publishItems(nextItems);
  };

  const deleteItem = (id: string) => {
    publishItems(items.filter((item) => item.id !== id));
  };

  const confirmDeleteItem = () => {
    if (!pendingDeleteItem) return;
    deleteItem(pendingDeleteItem.id);
    setPendingDeleteItem(null);
  };

  const handleTextKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    insertItemAfter(id);
  };

  useEffect(() => {
    if (!pendingFocusId) return;
    const input = inputRefs.current[pendingFocusId];
    if (!input) return;

    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    setPendingFocusId(null);
  }, [items, pendingFocusId]);

  return (
    <div className="checkbox-component-wrapper">
      {items.map((item) => (
        <div key={item.id} className={`checkbox-row ${item.checked ? "is-checked" : ""}`}>
          <button
            type="button"
            className="checkbox-toggle"
            onClick={() => toggleItem(item.id)}
            aria-label={item.checked ? "Mark as incomplete" : "Mark as complete"}
            aria-pressed={item.checked}
          >
            {item.checked && (
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2.2 6.3 4.8 9 10 3" />
              </svg>
            )}
          </button>
          <input
            ref={(element) => {
              inputRefs.current[item.id] = element;
            }}
            className="checkbox-text-input"
            value={item.text}
            onChange={(event) => updateItemText(item.id, event.target.value)}
            onKeyDown={(event) => handleTextKeyDown(event, item.id)}
            placeholder="Checklist item"
          />
          <button
            type="button"
            className="checkbox-delete-row-btn"
            onClick={() => setPendingDeleteItem(item)}
            aria-label="Delete checklist row"
            title="Delete row"
          >
            x
          </button>
        </div>
      ))}

      {pendingDeleteItem && (
        <div className="component-confirm-backdrop" role="dialog" aria-modal="true">
          <div className="component-confirm-modal">
            <div className="component-confirm-title">Delete this checkbox row?</div>
            <div className="component-confirm-desc">This checklist row will be removed.</div>
            <div className="component-confirm-actions">
              <button
                type="button"
                className="component-confirm-secondary"
                onClick={() => setPendingDeleteItem(null)}
              >
                Cancel
              </button>
              <button type="button" className="component-confirm-danger" onClick={confirmDeleteItem}>
                Delete row
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
