"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { PanelComponent } from "../lib/storage";

interface UserProfile {
  email: string;
  displayName: string;
  photoURL: string;
}

interface HeaderProps {
  mode: "home" | "panel";
  panelTitle?: string;
  panelName?: string;
  panelCode?: string;
  user: UserProfile | null;
  onLogout: () => void;
  // Home mode functions
  onAddPanel?: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  // Panel mode functions
  onAddComponent?: (type: PanelComponent["type"]) => void;
}

export default function Header({
  mode,
  panelTitle,
  panelName,
  panelCode,
  user,
  onLogout,
  onAddPanel,
  searchValue = "",
  onSearchChange,
  onAddComponent,
}: HeaderProps) {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showComponentMenu, setShowComponentMenu] = useState(false);
  
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const componentMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const renderHeaderTitle = () => {
    if (mode === "home") {
      return <span className="logo-label">LuPanel</span>;
    }

    return (
      <span className="logo-label header-panel-label">
        <span className="header-panel-name">{panelName || panelTitle}</span>
        {panelCode && <span className="header-panel-code">/{panelCode}</span>}
      </span>
    );
  };

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setShowAccountMenu(false);
      }
      if (
        componentMenuRef.current &&
        !componentMenuRef.current.contains(event.target as Node)
      ) {
        setShowComponentMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (mode === "home" && e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mode]);

  return (
    <header className="fixed-header">
      {/* LEFT AREA: Logo & Title */}
      <div className="header-left">
        <Link href="/" className="header-logo-container">
          <div className="logo-icon">Lu</div>
          {renderHeaderTitle()}
        </Link>
      </div>

      {/* CENTER AREA: Search bar (Home mode only) */}
      <div className="header-center">
        {mode === "home" && onSearchChange && (
          <div className="search-capsule">
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search panels..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ paddingLeft: "30px" }}
            />
            <span className="search-icon">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <span className="search-hotkey">/</span>
          </div>
        )}
      </div>

      {/* RIGHT AREA: Buttons & User Profile */}
      <div className="header-right">
        {/* Action Button */}
        {mode === "home" && onAddPanel && (
          <button className="btn-slim" onClick={onAddPanel}>
            + Add Panel
          </button>
        )}

        {mode === "panel" && onAddComponent && (
          <div className="header-component-actions" ref={componentMenuRef}>
            <button
              type="button"
              className="header-icon-btn"
              onClick={() => {
                setShowComponentMenu(false);
                onAddComponent("richtext");
              }}
              aria-label="Add Rich Text"
              title="Add Rich Text"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16" />
                <path d="M4 12h10" />
                <path d="M4 17h8" />
                <path d="M17 14l3 3-3 3" />
              </svg>
            </button>
            <button
              type="button"
              className="header-icon-btn"
              onClick={() => {
                setShowComponentMenu(false);
                onAddComponent("gallery");
              }}
              aria-label="Add Gallery"
              title="Add Gallery"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <path d="M17.5 14v7" />
                <path d="M14 17.5h7" />
              </svg>
            </button>
            <button
              type="button"
              className="header-icon-btn"
              onClick={() => {
                setShowComponentMenu(false);
                onAddComponent("table");
              }}
              aria-label="Add Table"
              title="Add Table"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M3 9h18" />
                <path d="M3 15h18" />
                <path d="M9 3v18" />
                <path d="M15 3v18" />
              </svg>
            </button>

            <div className="dropdown-container">
              <button className="btn-slim" onClick={() => setShowComponentMenu(!showComponentMenu)}>
                + Add
              </button>
            
              {showComponentMenu && (
                <div className="dropdown-menu component-dropdown-menu">
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      onAddComponent("title");
                      setShowComponentMenu(false);
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>T</span> Title
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      onAddComponent("text");
                      setShowComponentMenu(false);
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="4" y1="9" x2="20" y2="9"></line>
                      <line x1="4" y1="15" x2="20" y2="15"></line>
                      <line x1="10" y1="3" x2="8" y2="21"></line>
                      <line x1="16" y1="3" x2="14" y2="21"></line>
                    </svg>
                    Text
                  </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    onAddComponent("url");
                    setShowComponentMenu(false);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 6h4a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4h-4" />
                    <path d="M14 18h-4a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4h4" />
                  </svg>
                  URL
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    onAddComponent("youtube");
                    setShowComponentMenu(false);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  YouTube
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    onAddComponent("image");
                    setShowComponentMenu(false);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  Image
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    onAddComponent("file");
                    setShowComponentMenu(false);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M8 13h8" />
                    <path d="M8 17h5" />
                  </svg>
                  File
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    onAddComponent("checkbox");
                    setShowComponentMenu(false);
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <path d="m7 12 3 3 7-7" />
                  </svg>
                  Checkbox
                </button>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Account widget */}
        {user && (
          <div className="dropdown-container" ref={accountMenuRef}>
            <div className="account-widget" onClick={() => setShowAccountMenu(!showAccountMenu)}>
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="Avatar" className="account-avatar" />
              ) : (
                <div 
                  className="account-avatar" 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    backgroundColor: "#f4f4f5",
                    fontSize: "10px",
                    fontWeight: 600
                  }}
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {showAccountMenu && (
              <div className="dropdown-menu" style={{ minWidth: "160px" }}>
                <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border-light)" }}>
                  <div style={{ fontWeight: 500, fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.displayName}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "9px", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }}>
                    {user.email}
                  </div>
                </div>
                <button className="dropdown-item" onClick={onLogout} style={{ color: "#ef4444" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
