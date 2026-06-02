"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface TableData {
  rows: string[][];
  colWidths: number[];
  rowHeights: number[];
}

interface TableComponentProps {
  value: string;
  onChange: (newValue: string) => void;
}

type CellPosition = {
  rowIndex: number;
  colIndex: number;
};

type PendingTableDelete = {
  type: "row" | "column";
  index: number;
} | null;

const DEFAULT_COL_WIDTH = 144;
const DEFAULT_ROW_HEIGHT = 30;
const DEFAULT_ROWS = 2;
const DEFAULT_COLS = 2;
const MIN_COL_WIDTH = 84;
const MIN_ROW_HEIGHT = 28;
const ROW_HEADER_WIDTH = 34;
const TABLE_URL_PATTERN =
  /((?:(?:https?:\/\/|www\.)[^\s<]+)|(?:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<]*)?))/gi;
const TRAILING_URL_PUNCTUATION_PATTERN = /[.,!?;:]+$/;

const normalizeCellUrl = (url: string) => {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return "";
  if (/^https?:\/\//i.test(trimmedUrl)) return trimmedUrl;
  return `https://${trimmedUrl}`;
};

const createEmptyRows = (rows: number, cols: number): string[][] => {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));
};

const createDefaultTableData = (): TableData => ({
  rows: createEmptyRows(DEFAULT_ROWS, DEFAULT_COLS),
  colWidths: Array.from({ length: DEFAULT_COLS }, () => DEFAULT_COL_WIDTH),
  rowHeights: Array.from({ length: DEFAULT_ROWS }, () => DEFAULT_ROW_HEIGHT),
});

const clampSize = (value: unknown, min: number, fallback: number) => {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(min, value) : fallback;
};

const normalizeSizeArray = (sizeArray: unknown, length: number, defaultValue: number, minValue: number): number[] => {
  const source = Array.isArray(sizeArray) ? sizeArray : [];
  return Array.from({ length }, (_, index) => clampSize(source[index], minValue, defaultValue));
};

const normalizeRows = (rowsInput: unknown): string[][] => {
  const rows = Array.isArray(rowsInput) ? rowsInput : createEmptyRows(DEFAULT_ROWS, DEFAULT_COLS);
  const mappedRows = rows.map((row) => (Array.isArray(row) ? row.map(String) : []));
  const colCount = Math.max(DEFAULT_COLS, ...mappedRows.map((row) => row.length));
  const normalizedRows = mappedRows.map((row) => [...row, ...Array.from({ length: colCount - row.length }, () => "")]);

  while (normalizedRows.length < DEFAULT_ROWS) {
    normalizedRows.push(Array.from({ length: colCount }, () => ""));
  }

  return normalizedRows;
};

const normalizeTableData = (value: string): TableData => {
  if (!value) return createDefaultTableData();

  try {
    const parsed = JSON.parse(value) as Partial<TableData> | string[][];
    const rows = normalizeRows(Array.isArray(parsed) ? parsed : parsed.rows);
    const colCount = rows[0]?.length ?? DEFAULT_COLS;

    return {
      rows,
      colWidths: normalizeSizeArray(
        Array.isArray(parsed) ? [] : parsed.colWidths,
        colCount,
        DEFAULT_COL_WIDTH,
        MIN_COL_WIDTH
      ),
      rowHeights: normalizeSizeArray(
        Array.isArray(parsed) ? [] : parsed.rowHeights,
        rows.length,
        DEFAULT_ROW_HEIGHT,
        MIN_ROW_HEIGHT
      ),
    };
  } catch {
    return createDefaultTableData();
  }
};

const getColumnLabel = (index: number) => {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
};

const getCellKey = (rowIndex: number, colIndex: number) => `${rowIndex}:${colIndex}`;

const cellContainsUrl = (text: string) => {
  TABLE_URL_PATTERN.lastIndex = 0;
  return TABLE_URL_PATTERN.test(text);
};

const renderCellTextWithLinks = (text: string) => {
  if (!text) return null;

  TABLE_URL_PATTERN.lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TABLE_URL_PATTERN.exec(text)) !== null) {
    const rawUrl = match[0];
    const matchIndex = match.index;
    const urlText = rawUrl.replace(TRAILING_URL_PUNCTUATION_PATTERN, "");
    const trailingText = rawUrl.slice(urlText.length);
    const href = normalizeCellUrl(urlText);

    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    if (href) {
      parts.push(
        <a key={`${matchIndex}-${urlText}`} href={href} target="_blank" rel="noreferrer">
          {urlText}
        </a>
      );
    } else {
      parts.push(rawUrl);
    }

    if (trailingText) {
      parts.push(trailingText);
    }

    lastIndex = matchIndex + rawUrl.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

const Icon = ({ type }: { type: "trash" | "left" | "right" | "up" | "down" }) => {
  if (type === "trash") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3.5 4.5h9" />
        <path d="M6.5 2.8h3l.6 1.7H5.9l.6-1.7Z" />
        <path d="M5.2 6.2v6.1c0 .5.4.9.9.9h3.8c.5 0 .9-.4.9-.9V6.2" />
      </svg>
    );
  }

  const paths = {
    left: <path d="M9.8 4.2 6 8l3.8 3.8" />,
    right: <path d="M6.2 4.2 10 8l-3.8 3.8" />,
    up: <path d="M4.2 9.8 8 6l3.8 3.8" />,
    down: <path d="M4.2 6.2 8 10l3.8-3.8" />,
  };

  return <svg viewBox="0 0 16 16" aria-hidden="true">{paths[type]}</svg>;
};

const TableComponent = ({ value, onChange }: TableComponentProps) => {
  const [tableData, setTableData] = useState<TableData>(() => normalizeTableData(value));
  const [activeCell, setActiveCell] = useState<CellPosition | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingTableDelete>(null);
  const lastPublishedValue = useRef(value);
  const scrollShellRef = useRef<HTMLDivElement>(null);
  const cellInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const pendingFocusRef = useRef<CellPosition | null>(null);
  const resizingState = useRef<{
    type: "col" | "row";
    index: number;
    startPos: number;
    startSize: number;
  } | null>(null);

  const rowCount = tableData.rows.length;
  const colCount = tableData.rows[0]?.length ?? 0;

  useEffect(() => {
    if (value === lastPublishedValue.current) return;
    queueMicrotask(() => {
      setTableData(normalizeTableData(value));
    });
  }, [value]);

  useEffect(() => {
    const nextValue = JSON.stringify(tableData);
    const timer = window.setTimeout(() => {
      if (nextValue !== lastPublishedValue.current) {
        lastPublishedValue.current = nextValue;
        onChange(nextValue);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [tableData, onChange]);

  const tableGridStyle = useMemo(
    () => ({
      gridTemplateColumns: `${ROW_HEADER_WIDTH}px ${tableData.colWidths.map((width) => `${width}px`).join(" ")}`,
    }),
    [tableData.colWidths]
  );

  const handleHorizontalWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const shell = scrollShellRef.current;
    if (!shell || shell.scrollWidth <= shell.clientWidth) return;

    const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (horizontalDelta === 0) return;

    event.preventDefault();
    shell.scrollLeft += horizontalDelta;
  };

  const updateCellValue = (rowIndex: number, colIndex: number, text: string) => {
    setTableData((current) => {
      const rows = current.rows.map((row, rIdx) =>
        rIdx === rowIndex ? row.map((cell, cIdx) => (cIdx === colIndex ? text : cell)) : row
      );
      return { ...current, rows };
    });
  };

  const focusCell = (rowIndex: number, colIndex: number) => {
    const cellKey = getCellKey(rowIndex, colIndex);
    setActiveCell({ rowIndex, colIndex });
    window.requestAnimationFrame(() => {
      const textarea = cellInputRefs.current[cellKey];
      textarea?.focus();
      textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
    });
  };

  const focusCellWhenReady = (rowIndex: number, colIndex: number) => {
    pendingFocusRef.current = { rowIndex, colIndex };
    setActiveCell({ rowIndex, colIndex });
  };

  useEffect(() => {
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) return;

    const rowExists = pendingFocus.rowIndex >= 0 && pendingFocus.rowIndex < tableData.rows.length;
    const colExists = pendingFocus.colIndex >= 0 && pendingFocus.colIndex < (tableData.rows[0]?.length ?? 0);
    if (!rowExists || !colExists) return;

    pendingFocusRef.current = null;
    focusCell(pendingFocus.rowIndex, pendingFocus.colIndex);
  }, [tableData]);

  const ensureRowAndFocusCell = (rowIndex: number, colIndex: number) => {
    if (rowIndex < tableData.rows.length) {
      focusCell(rowIndex, colIndex);
      return;
    }

    focusCellWhenReady(rowIndex, colIndex);
    setTableData((current) => {
      if (rowIndex < current.rows.length) return current;

      const cols = current.rows[0]?.length ?? DEFAULT_COLS;
      const rows = current.rows.map((row) => [...row]);
      const rowHeights = [...current.rowHeights];

      while (rows.length <= rowIndex) {
        rows.push(Array.from({ length: cols }, () => ""));
        rowHeights.push(DEFAULT_ROW_HEIGHT);
      }

      return { ...current, rows, rowHeights };
    });
  };

  const addRowAt = (index: number) => {
    setTableData((current) => {
      const cols = current.rows[0]?.length ?? DEFAULT_COLS;
      const rows = [
        ...current.rows.slice(0, index),
        Array.from({ length: cols }, () => ""),
        ...current.rows.slice(index),
      ];
      const rowHeights = [...current.rowHeights];
      rowHeights.splice(index, 0, DEFAULT_ROW_HEIGHT);
      return { ...current, rows, rowHeights };
    });
  };

  const removeRowAt = (index: number) => {
    setActiveCell(null);
    setTableData((current) => {
      if (current.rows.length <= 1) return current;
      return {
        ...current,
        rows: current.rows.filter((_, rowIndex) => rowIndex !== index),
        rowHeights: current.rowHeights.filter((_, rowIndex) => rowIndex !== index),
      };
    });
  };

  const addColAt = (index: number) => {
    setTableData((current) => {
      const rows = current.rows.map((row) => [...row.slice(0, index), "", ...row.slice(index)]);
      const colWidths = [...current.colWidths];
      colWidths.splice(index, 0, DEFAULT_COL_WIDTH);
      return { ...current, rows, colWidths };
    });
  };

  const removeColAt = (index: number) => {
    setActiveCell(null);
    setTableData((current) => {
      if ((current.rows[0]?.length ?? 0) <= 1) return current;
      return {
        ...current,
        rows: current.rows.map((row) => row.filter((_, colIndex) => colIndex !== index)),
        colWidths: current.colWidths.filter((_, colIndex) => colIndex !== index),
      };
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;

    if (pendingDelete.type === "row") {
      removeRowAt(pendingDelete.index);
    } else {
      removeColAt(pendingDelete.index);
    }

    setPendingDelete(null);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>, startRow: number, startCol: number) => {
    const pastedText = event.clipboardData.getData("text/plain");
    if (!pastedText || (!pastedText.includes("\t") && !pastedText.includes("\n"))) return;

    event.preventDefault();
    const pastedRows = pastedText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((line, index, source) => line.length > 0 || index < source.length - 1)
      .map((line) => line.split("\t"));

    setTableData((current) => {
      const targetRows = Math.max(current.rows.length, startRow + pastedRows.length);
      const targetCols = Math.max(current.rows[0]?.length ?? DEFAULT_COLS, startCol + Math.max(...pastedRows.map((row) => row.length)));
      const rows = current.rows.map((row) => [...row, ...Array.from({ length: targetCols - row.length }, () => "")]);

      while (rows.length < targetRows) {
        rows.push(Array.from({ length: targetCols }, () => ""));
      }

      pastedRows.forEach((pasteRow, rowOffset) => {
        pasteRow.forEach((cellText, colOffset) => {
          rows[startRow + rowOffset][startCol + colOffset] = cellText;
        });
      });

      return {
        rows,
        colWidths: normalizeSizeArray(current.colWidths, targetCols, DEFAULT_COL_WIDTH, MIN_COL_WIDTH),
        rowHeights: normalizeSizeArray(current.rowHeights, targetRows, DEFAULT_ROW_HEIGHT, MIN_ROW_HEIGHT),
      };
    });
  };

  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    const arrowMoves: Record<string, { rowOffset: number; colOffset: number }> = {
      ArrowLeft: { rowOffset: 0, colOffset: -1 },
      ArrowRight: { rowOffset: 0, colOffset: 1 },
      ArrowUp: { rowOffset: -1, colOffset: 0 },
      ArrowDown: { rowOffset: 1, colOffset: 0 },
    };
    const arrowMove = arrowMoves[event.key];

    if (arrowMove && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      const targetRow = rowIndex + arrowMove.rowOffset;
      const targetCol = colIndex + arrowMove.colOffset;

      if (targetRow >= 0 && targetRow < rowCount && targetCol >= 0 && targetCol < colCount) {
        focusCell(targetRow, targetCol);
      }

      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ensureRowAndFocusCell(rowIndex + 1, colIndex);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();

      if (event.shiftKey) {
        const targetRow = colIndex === 0 ? Math.max(0, rowIndex - 1) : rowIndex;
        const targetCol = colIndex === 0 ? Math.max(0, colCount - 1) : colIndex - 1;
        focusCell(targetRow, targetCol);
        return;
      }

      const isLastColumn = colIndex >= colCount - 1;
      const targetRow = isLastColumn ? rowIndex + 1 : rowIndex;
      const targetCol = isLastColumn ? 0 : colIndex + 1;
      ensureRowAndFocusCell(targetRow, targetCol);
    }
  };

  const startResize = (type: "col" | "row", index: number, event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resizingState.current = {
      type,
      index,
      startPos: type === "col" ? event.clientX : event.clientY,
      startSize: type === "col" ? tableData.colWidths[index] : tableData.rowHeights[index],
    };
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizingState.current) return;

      const { type, index, startPos, startSize } = resizingState.current;
      const delta = type === "col" ? event.clientX - startPos : event.clientY - startPos;

      setTableData((current) => {
        if (type === "col") {
          const colWidths = [...current.colWidths];
          colWidths[index] = Math.max(MIN_COL_WIDTH, startSize + delta);
          return { ...current, colWidths };
        }

        const rowHeights = [...current.rowHeights];
        rowHeights[index] = Math.max(MIN_ROW_HEIGHT, startSize + delta);
        return { ...current, rowHeights };
      });
    };

    const handleMouseUp = () => {
      resizingState.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="table-component-wrapper">
      <div className="table-scroll-shell" ref={scrollShellRef} onWheel={handleHorizontalWheel}>
        <div className="table-grid" style={tableGridStyle}>
          <div className="table-corner-cell" aria-hidden="true" />

          {tableData.colWidths.map((_, colIndex) => (
            <div key={`col-${colIndex}`} className="table-column-header">
              <span className="table-col-label">{getColumnLabel(colIndex)}</span>
              <div className="table-col-actions">
                <button type="button" onClick={() => addColAt(colIndex)} title="Insert column before" aria-label="Insert column before">
                  <Icon type="left" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete({ type: "column", index: colIndex })}
                  disabled={colCount <= 1}
                  title="Delete column"
                  aria-label="Delete column"
                >
                  <Icon type="trash" />
                </button>
                <button type="button" onClick={() => addColAt(colIndex + 1)} title="Insert column after" aria-label="Insert column after">
                  <Icon type="right" />
                </button>
              </div>
              <div className="table-col-resize-handle" onMouseDown={(event) => startResize("col", colIndex, event)} />
            </div>
          ))}

          {tableData.rows.map((row, rowIndex) => (
            <React.Fragment key={`row-${rowIndex}`}>
              <div className="table-row-header" style={{ height: `${tableData.rowHeights[rowIndex]}px` }}>
                <span className="table-row-label">{rowIndex + 1}</span>
                <div className="table-row-actions">
                  <button type="button" onClick={() => addRowAt(rowIndex)} title="Insert row above" aria-label="Insert row above">
                    <Icon type="up" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete({ type: "row", index: rowIndex })}
                    disabled={rowCount <= 1}
                    title="Delete row"
                    aria-label="Delete row"
                  >
                    <Icon type="trash" />
                  </button>
                  <button type="button" onClick={() => addRowAt(rowIndex + 1)} title="Insert row below" aria-label="Insert row below">
                    <Icon type="down" />
                  </button>
                </div>
                <div className="table-row-resize-handle" onMouseDown={(event) => startResize("row", rowIndex, event)} />
              </div>

              {row.map((cell, colIndex) => (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={`table-cell-wrapper ${
                    activeCell?.rowIndex === rowIndex && activeCell?.colIndex === colIndex ? "is-editing" : ""
                  } ${cellContainsUrl(cell) ? "has-link" : ""}`}
                  style={{ height: `${tableData.rowHeights[rowIndex]}px` }}
                  onMouseDown={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("a") || target.closest("textarea")) return;
                    event.preventDefault();
                    focusCell(rowIndex, colIndex);
                  }}
                >
                  <div className="table-cell-display">{renderCellTextWithLinks(cell)}</div>
                  <textarea
                    ref={(element) => {
                      cellInputRefs.current[getCellKey(rowIndex, colIndex)] = element;
                    }}
                    className="table-cell-input"
                    value={cell}
                    onChange={(event) => updateCellValue(rowIndex, colIndex, event.target.value)}
                    onKeyDown={(event) => handleCellKeyDown(event, rowIndex, colIndex)}
                    onPaste={(event) => handlePaste(event, rowIndex, colIndex)}
                    onFocus={() => setActiveCell({ rowIndex, colIndex })}
                    onBlur={() => setActiveCell(null)}
                    spellCheck={false}
                    aria-label={`Cell ${getColumnLabel(colIndex)}${rowIndex + 1}`}
                  />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {pendingDelete && (
        <div className="component-confirm-backdrop" role="dialog" aria-modal="true">
          <div className="component-confirm-modal">
            <div className="component-confirm-title">
              Delete this {pendingDelete.type === "row" ? "row" : "column"}?
            </div>
            <div className="component-confirm-desc">
              This {pendingDelete.type === "row" ? "row" : "column"} and its cells will be removed from the table.
            </div>
            <div className="component-confirm-actions">
              <button type="button" className="component-confirm-secondary" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button type="button" className="component-confirm-danger" onClick={confirmDelete}>
                Delete {pendingDelete.type === "row" ? "row" : "column"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableComponent;
