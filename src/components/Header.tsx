"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserProfile {
  email: string;
  displayName: string;
  photoURL: string;
}

interface HeaderProps {
  mode: "home" | "panel";
  panelTitle?: string;
  user: UserProfile | null;
  onLogout: () => void;
  // Home mode functions
  onAddPanel?: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  // Panel mode functions
  onAddComponent?: (type: "title" | "text" | "image") => void;
}

export default function Header({
  mode,
  panelTitle,
  user,
  onLogout,
  onAddPanel,
  searchValue = "",
  onSearchChange,
  onAddComponent,
}: HeaderProps) {
  const router = useRouter();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showComponentMenu, setShowComponentMenu] = useState(false);
  
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const componentMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
          <span className="logo-label">{mode === "home" ? "LuPanel" : panelTitle}</span>
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
          <div className="dropdown-container" ref={componentMenuRef}>
            <button className="btn-slim" onClick={() => setShowComponentMenu(!showComponentMenu)}>
              + Add Component
            </button>
            
            {showComponentMenu && (
              <div className="dropdown-menu">
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
              </div>
            )}
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
