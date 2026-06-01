"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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

type PanelFormMode = "create" | "edit";

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
  const [panelFormOpen, setPanelFormOpen] = useState(false);
  const [panelFormMode, setPanelFormMode] = useState<PanelFormMode>("create");
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [panelName, setPanelName] = useState("");
  const [panelCode, setPanelCode] = useState("");
  const [panelFormError, setPanelFormError] = useState<string | null>(null);
  const [panelListError, setPanelListError] = useState<string | null>(null);
  const panelBackdropMouseDownRef = useRef(false);

  const fetchPanels = useCallback(async () => {
    try {
      setPanelListError(null);
      const list = await storageProvider.getPanels();
      setPanels(list);
    } catch (error) {
      console.error(error);
      setPanelListError("Could not load panels. Check Firebase env and Firestore rules on Vercel.");
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

  const openCreatePanel = () => {
    setPanelFormMode("create");
    setEditingPanel(null);
    setPanelName("");
    setPanelCode("");
    setPanelFormError(null);
    setPanelFormOpen(true);
  };

  const openEditPanel = (panel: Panel, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setPanelFormMode("edit");
    setEditingPanel(panel);
    setPanelName(panel.name);
    setPanelCode(panel.code);
    setPanelFormError(null);
    setPanelFormOpen(true);
  };

  const closePanelForm = () => {
    setPanelFormOpen(false);
    setEditingPanel(null);
    setPanelFormError(null);
  };

  const handlePanelBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    panelBackdropMouseDownRef.current = event.target === event.currentTarget;
  };

  const handlePanelBackdropMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (panelBackdropMouseDownRef.current && event.target === event.currentTarget) {
      closePanelForm();
    }
    panelBackdropMouseDownRef.current = false;
  };

  const handlePanelFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPanelFormError(null);

    const trimmedName = panelName.trim();
    const trimmedCode = panelCode.trim();
    if (!trimmedName) {
      setPanelFormError("Name is required.");
      return;
    }
    if (!trimmedCode) {
      setPanelFormError("Code is required.");
      return;
    }

    try {
      if (panelFormMode === "create") {
        const created = await storageProvider.createPanel(trimmedName, trimmedCode);
        if (!created) {
          setPanelFormError("Code already exists or is invalid.");
          return;
        }
        closePanelForm();
        router.push(`/${created.id}`);
        return;
      }

      if (!editingPanel) return;
      const updated = await storageProvider.updatePanel(editingPanel.id, trimmedName, trimmedCode);
      if (!updated) {
        setPanelFormError("Code already exists or is invalid.");
        return;
      }
      closePanelForm();
      await fetchPanels();
    } catch (error) {
      console.error(error);
      setPanelFormError("Could not save panel. Check Firebase write permissions.");
    }
  };

  const handleDeletePanel = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    if (!window.confirm("Delete this panel? All content inside it will be permanently removed.")) return;

    try {
      await storageProvider.deletePanel(id);
      await fetchPanels();
    } catch (error) {
      console.error(error);
      setPanelListError("Could not delete panel. Check Firebase write permissions.");
    }
  };

  const filteredPanels = panels.filter((panel) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return panel.name.toLowerCase().includes(query) || panel.code.toLowerCase().includes(query);
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
        onAddPanel={openCreatePanel}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="main-content main-content-scroll">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-light)", paddingBottom: "12px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600 }}>All Panels</h2>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{filteredPanels.length} panels</span>
        </div>

        {panelListError && (
          <div style={{ fontSize: "11px", color: "#ef4444", lineHeight: 1.5 }}>{panelListError}</div>
        )}

        {filteredPanels.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? "No matching panels found." : "No panels have been created yet."}
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
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                  <span className="panel-title">{panel.name}</span>
                  <span className="panel-meta">/{panel.code}</span>
                </div>

                <div className="panel-actions">
                  <button
                    className="component-control-btn panel-action-btn"
                    onClick={(event) => openEditPanel(panel, event)}
                    title="Edit panel"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button
                    className="component-control-btn panel-action-btn"
                    onClick={(event) => handleDeletePanel(panel.id, event)}
                    title="Delete panel"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {panelFormOpen && (
        <div
          className="panel-form-backdrop"
          onMouseDown={handlePanelBackdropMouseDown}
          onMouseUp={handlePanelBackdropMouseUp}
        >
          <div className="panel-form-modal">
            <form onSubmit={handlePanelFormSubmit} className="panel-form">
              <div className="panel-form-field">
                <label>Name</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Hoi nghi Khoa hoc quoc te FBB"
                  value={panelName}
                  onChange={(event) => setPanelName(event.target.value)}
                />
              </div>
              <div className="panel-form-field">
                <label>Code</label>
                <input
                  type="text"
                  placeholder="SLSB"
                  value={panelCode}
                  onChange={(event) => setPanelCode(event.target.value)}
                />
              </div>

              {panelFormError && <div className="panel-form-error">{panelFormError}</div>}

              <div className="panel-form-actions">
                <button type="button" className="btn-slim" onClick={closePanelForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-slim" style={{ borderColor: "var(--text-primary)" }}>
                  {panelFormMode === "create" ? "Create Panel" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
