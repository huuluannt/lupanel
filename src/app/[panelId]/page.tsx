"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import LoginScreen from "../../components/LoginScreen";
import ComponentList from "../../components/ComponentList";
import { storageProvider, Panel, PanelComponent } from "../../lib/storage";
import { isFirebaseConfigured, auth } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

interface UserProfile {
  email: string;
  displayName: string;
  photoURL: string;
}

interface PageProps {
  params: Promise<{ panelId: string }>;
}

export default function PanelPage({ params }: PageProps) {
  const { panelId } = use(params);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Panel state
  const [panel, setPanel] = useState<Panel | null>(null);
  const [components, setComponents] = useState<PanelComponent[]>([]);
  const [notFound, setNotFound] = useState(false);

  // Authentication sync
  useEffect(() => {
    if (isFirebaseConfigured() && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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
      return () => unsubscribe();
    } else {
      // Demo / Local Mode Session
      if (typeof window !== "undefined") {
        const cachedUser = localStorage.getItem("lupanel_user");
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser) as UserProfile);
          } catch {}
        }
      }
      setLoading(false);
    }
  }, []);

  // Fetch Panel metadata and components
  useEffect(() => {
    if (user && panelId) {
      fetchPanelData();
    }
  }, [user, panelId]);

  const fetchPanelData = async () => {
    const meta = await storageProvider.getPanel(panelId);
    if (!meta) {
      setNotFound(true);
      return;
    }
    
    setPanel(meta);
    const list = await storageProvider.getComponents(panelId);
    setComponents(list);
  };

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

  // Add a new component to the panel
  const handleAddComponent = async (type: "title" | "text" | "image") => {
    const newComp: PanelComponent = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      value: "",
      order: components.length > 0 ? Math.max(...components.map((c) => c.order)) + 1 : 0,
    };

    const updated = [...components, newComp];
    setComponents(updated);
    
    // Save to persistence
    await storageProvider.saveComponents(panelId, updated);
  };

  // Handle value change inside a component
  const handleComponentChange = async (id: string, newValue: string) => {
    const updated = components.map((c) => {
      if (c.id === id) {
        return { ...c, value: newValue };
      }
      return c;
    });
    
    setComponents(updated);
    await storageProvider.saveComponents(panelId, updated);
  };

  // Handle deleting a component from the list
  const handleDeleteComponent = async (id: string) => {
    const updated = components.filter((c) => c.id !== id);
    setComponents(updated);
    await storageProvider.saveComponents(panelId, updated);
  };

  // Handle uploading files (used by ImageComponent)
  const handleUploadImage = async (file: File): Promise<string> => {
    return await storageProvider.uploadImage(panelId, file);
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
      {/* Header for Panel view */}
      <Header
        mode="panel"
        panelTitle={panel?.title}
        user={user}
        onLogout={handleLogout}
        onAddComponent={handleAddComponent}
      />

      {/* Main Page Area */}
      <main className="main-content main-content-scroll">
        <ComponentList
          components={components}
          onComponentChange={handleComponentChange}
          onDeleteComponent={handleDeleteComponent}
          onUploadImage={handleUploadImage}
        />
      </main>
    </div>
  );
}
