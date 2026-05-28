"use client";

import React, { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut } from "firebase/auth";
import ComponentList from "../../components/ComponentList";
import Header from "../../components/Header";
import LoginScreen from "../../components/LoginScreen";
import { Panel, PanelComponent, storageProvider } from "../../lib/storage";
import { auth, isFirebaseConfigured } from "../../lib/firebase";

interface UserProfile {
  email: string;
  displayName: string;
  photoURL: string;
}

interface PageProps {
  params: Promise<{ panelId: string }>;
}

type ComponentType = PanelComponent["type"];

const getDefaultComponentValue = (type: ComponentType) => {
  if (type === "table") {
    return JSON.stringify({ rows: [ ["", ""], ["", ""] ], colWidths: [220, 220], rowHeights: [30, 30] });
  }

  if (type === "gallery") {
    return JSON.stringify({ images: [] });
  }

  if (type === "file") {
    return JSON.stringify({ files: [] });
  }

  return "";
};

export default function PanelPage({ params }: PageProps) {
  const { panelId } = use(params);

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
  const [panel, setPanel] = useState<Panel | null>(null);
  const [components, setComponents] = useState<PanelComponent[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const fetchPanelData = useCallback(async () => {
    try {
      setStorageError(null);
      const meta = await storageProvider.getPanel(panelId);
      if (!meta) {
        setNotFound(true);
        return;
      }

      setPanel(meta);
      const list = await storageProvider.getComponents(panelId);
      setComponents(list);
    } catch (error) {
      console.error(error);
      setStorageError("Không thể tải panel từ Firebase. Hãy kiểm tra biến môi trường Vercel và Firestore rules.");
    }
  }, [panelId]);

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
    if (user && panelId) {
      queueMicrotask(() => {
        void fetchPanelData();
      });
    }
  }, [fetchPanelData, panelId, user]);

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
    setPanel(null);
    setComponents([]);
  };

  const saveComponents = async (nextComponents: PanelComponent[]) => {
    try {
      setStorageError(null);
      setComponents(nextComponents);
      await storageProvider.saveComponents(panelId, nextComponents);
    } catch (error) {
      console.error(error);
      setStorageError("Không thể lưu nội dung panel. Hãy kiểm tra quyền ghi Firebase.");
    }
  };

  const handleAddComponent = async (type: ComponentType) => {
    const newComp: PanelComponent = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      value: getDefaultComponentValue(type),
      order: components.length > 0 ? Math.max(...components.map((item) => item.order)) + 1 : 0,
    };

    await saveComponents([...components, newComp]);
  };

  const handleComponentChange = async (id: string, newValue: string) => {
    const updated = components.map((component) => {
      if (component.id === id) {
        return { ...component, value: newValue };
      }
      return component;
    });

    await saveComponents(updated);
  };

  const handleDeleteComponent = async (id: string) => {
    await saveComponents(components.filter((component) => component.id !== id));
  };

  const handleMoveComponent = async (id: string, direction: "up" | "down") => {
    const currentIndex = components.findIndex((component) => component.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= components.length) return;

    const nextComponents = [...components];
    const [moved] = nextComponents.splice(currentIndex, 1);
    nextComponents.splice(targetIndex, 0, moved);

    const orderedComponents = nextComponents.map((component, index) => ({
      ...component,
      order: index,
    }));

    await saveComponents(orderedComponents);
  };

  const handleUploadFile = async (file: File): Promise<string> => {
    return await storageProvider.uploadFile(panelId, file);
  };

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

  if (storageError && !panel) {
    return (
      <div className="layout-container" style={{ justifyContent: "center", alignItems: "center", gap: "16px", padding: "24px", textAlign: "center" }}>
        <span style={{ fontSize: "14px", fontWeight: 500, color: "#ef4444" }}>{storageError}</span>
        <Link href="/" className="btn-slim">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="layout-container" style={{ justifyContent: "center", alignItems: "center", gap: "16px" }}>
        <span style={{ fontSize: "14px", fontWeight: 500 }}>Không tìm thấy Panel này.</span>
        <Link href="/" className="btn-slim">
          Quay lại trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="layout-container">
      <Header
        mode="panel"
        panelTitle={panel?.title}
        user={user}
        onLogout={handleLogout}
        onAddComponent={handleAddComponent}
      />

      <main className="main-content main-content-scroll">
        {storageError && (
          <div style={{ fontSize: "11px", color: "#ef4444", lineHeight: 1.5 }}>
            {storageError}
          </div>
        )}
        <ComponentList
          components={components}
          onComponentChange={handleComponentChange}
          onDeleteComponent={handleDeleteComponent}
          onMoveComponentUp={(id) => void handleMoveComponent(id, "up")}
          onMoveComponentDown={(id) => void handleMoveComponent(id, "down")}
          onUploadFile={handleUploadFile}
        />
      </main>
    </div>
  );
}
