"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import LoginScreen from "../components/LoginScreen";
import { Panel, storageProvider } from "../lib/storage";
import { auth, isFirebaseConfigured } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

interface UserProfile {
  email: string;
  displayName: string;
  photoURL: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (isFirebaseConfigured() || typeof window === "undefined") return null;
    const cachedUser = localStorage.getItem("lupanel_user");
    if (!cachedUser) return null;
    try {
      return JSON.parse(cachedUser) as UserProfile;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => isFirebaseConfigured());

  const [panels, setPanels] = useState<Panel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPanelName, setNewPanelName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [panelListError, setPanelListError] = useState<string | null>(null);

  const fetchPanels = useCallback(async () => {
    try {
      setPanelListError(null);
      const list = await storageProvider.getPanels();
      setPanels(list);
    } catch (error) {
      console.error(error);
      setPanelListError(
        "Không thể tải danh sách panel. Hãy kiểm tra Firebase env và Firestore rules trên Vercel."
      );
      setPanels([]);
    }
  }, []);

  useEffect(() => {
    const loadingFallback = window.setTimeout(() => {
      setLoading(false);
    }, 8000);

    if (isFirebaseConfigured() && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        window.clearTimeout(loadingFallback);
        if (firebaseUser && firebaseUser.email === "huuluannt@gmail.com") {
          setUser({
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || "Huu Luan",
            photoURL: firebaseUser.photoURL || "",
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return () => {
        window.clearTimeout(loadingFallback);
        unsubscribe();
      };
    }

    if (isFirebaseConfigured() && !auth) {
      queueMicrotask(() => setLoading(false));
    }

    return () => window.clearTimeout(loadingFallback);
  }, []);

  useEffect(() => {
    if (user) {
      queueMicrotask(() => {
        void fetchPanels();
      });
    }
  }, [fetchPanels, user]);

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    if (!isFirebaseConfigured()) {
      localStorage.setItem("lupanel_user", JSON.stringify(profile));
    }
  };

  const handleLogout = async () => {
    if (isFirebaseConfigured() && auth) {
      await signOut(auth);
    } else {
      localStorage.removeItem("lupanel_user");
    }
    setUser(null);
    setPanels([]);
  };

  const handleAddPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const trimmedName = newPanelName.trim();
    if (!trimmedName) {
      setCreateError("Vui lòng nhập tên panel.");
      return;
    }

    let created: Panel | null = null;
    try {
      created = await storageProvider.createPanel(trimmedName);
      if (!created) {
        setCreateError("Panel đã tồn tại hoặc đường dẫn không hợp lệ.");
        return;
      }
    } catch (error) {
      console.error(error);
      setCreateError(
        "Không thể tạo panel trên Firebase. Hãy kiểm tra biến môi trường Vercel và Firestore rules."
      );
      return;
    }

    setNewPanelName("");
    setShowAddModal(false);
    router.push(`/${created.id}`);
  };

  const handleDeletePanel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (confirm("Bạn có chắc chắn muốn xóa panel này? Tất cả dữ liệu bên trong sẽ bị xóa vĩnh viễn.")) {
      try {
        await storageProvider.deletePanel(id);
        fetchPanels();
      } catch (error) {
        console.error(error);
        setPanelListError("Không thể xóa panel. Hãy kiểm tra quyền ghi Firebase.");
      }
    }
  };

  const filteredPanels = panels.filter((panel) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return panel.title.toLowerCase().includes(query) || panel.id.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div style={{ display: "flex", width: "100vw", height: "100vh", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ width: "16px", height: "16px", border: "1.5px solid var(--border-light)", borderTopColor: "var(--border-focus)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="layout-container">
      <Header
        mode="home"
        user={user}
        onLogout={handleLogout}
        onAddPanel={() => setShowAddModal(true)}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="main-content main-content-scroll">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-light)", paddingBottom: "12px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600 }}>Tất cả Panels</h2>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{filteredPanels.length} panels</span>
        </div>

        {panelListError && (
          <div style={{ fontSize: "11px", color: "#ef4444", lineHeight: 1.5 }}>
            {panelListError}
          </div>
        )}

        {filteredPanels.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? "Không tìm thấy panel nào phù hợp." : "Chưa có panel nào được tạo."}
          </div>
        ) : (
          <div className="panel-grid">
            {filteredPanels.map((panel) => (
              <div
                key={panel.id}
                className="panel-row"
                onClick={() => router.push(`/${panel.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span className="panel-title">{panel.title}</span>
                  <span className="panel-meta">/{panel.id}</span>
                </div>

                <button
                  className="component-control-btn"
                  onClick={(event) => handleDeletePanel(panel.id, event)}
                  title="Xóa panel"
                  style={{ width: "24px", height: "24px" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "320px",
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-light)",
              borderRadius: "8px",
              padding: "24px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.05)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <form onSubmit={handleAddPanel} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)" }}>TÊN PANEL MỚI</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ví dụ: SLSB"
                  value={newPanelName}
                  onChange={(event) => setNewPanelName(event.target.value)}
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: "1px solid var(--border-light)",
                    padding: "6px 0",
                    fontSize: "14px",
                  }}
                />
              </div>

              {createError && (
                <div style={{ fontSize: "10px", color: "#ef4444", lineHeight: 1.5 }}>
                  {createError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" className="btn-slim" onClick={() => setShowAddModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-slim" style={{ borderColor: "var(--text-primary)" }}>
                  Tạo Panel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
