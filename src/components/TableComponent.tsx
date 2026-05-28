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

const DEFAULT_COL_WIDTH = 144;
const DEFAULT_ROW_HEIGHT = 30;
const DEFAULT_ROWS = 2;
const DEFAULT_COLS = 2;
const MIN_COL_WIDTH = 84;
const MIN_ROW_HEIGHT = 28;
const ROW_HEADER_WIDTH = 34;

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
  const lastPublishedValue = useRef(value);
  const scrollShellRef = useRef<HTMLDivElement>(null);
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
    setTableData((current) => {
      if ((current.rows[0]?.length ?? 0) <= 1) return current;
      return {
        ...current,
        rows: current.rows.map((row) => row.filter((_, colIndex) => colIndex !== index)),
        colWidths: current.colWidths.filter((_, colIndex) => colIndex !== index),
      };
    });
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
                  onClick={() => removeColAt(colIndex)}
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
                    onClick={() => removeRowAt(rowIndex)}
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
                  className="table-cell-wrapper"
                  style={{ height: `${tableData.rowHeights[rowIndex]}px` }}
                >
                  <textarea
                    className="table-cell-input"
                    value={cell}
                    onChange={(event) => updateCellValue(rowIndex, colIndex, event.target.value)}
                    onPaste={(event) => handlePaste(event, rowIndex, colIndex)}
                    aria-label={`Cell ${getColumnLabel(colIndex)}${rowIndex + 1}`}
                  />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TableComponent;
