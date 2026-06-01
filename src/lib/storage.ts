import { isFirebaseConfigured, db } from "./firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  orderBy, 
  writeBatch 
} from "firebase/firestore";

export interface Panel {
  id: string; // Slugified route code e.g., 'slsb'
  name: string;
  code: string;
  title?: string; // Legacy display title
  createdAt: number;
}

export interface PanelComponent {
  id: string;
  type: "title" | "text" | "richtext" | "image" | "file" | "url" | "youtube" | "table" | "gallery" | "checkbox";
  title?: string;
  richText?: string;
  value: string; // Text string, URL string, base64/remote image URL, or JSON for complex component state
  order: number;
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "StorageError";
  }
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  url?: string;
  error?: {
    message?: string;
  };
}

const isCloudinaryConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  );
};

// Helper to generate a slugified URL path
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-"); // Replace multiple - with single -
};

const normalizePanel = (panel: Partial<Panel>, fallbackId = ""): Panel => {
  const id = slugify(panel.id || panel.code || fallbackId || panel.title || panel.name || "");
  const code = slugify(panel.code || id);
  const name = panel.name || panel.title || code || "Untitled Panel";

  return {
    id: code || id,
    code: code || id,
    name,
    title: panel.title || name,
    createdAt: typeof panel.createdAt === "number" ? panel.createdAt : Date.now(),
  };
};

const createDefaultPanelComponents = (): PanelComponent[] => {
  const timestamp = Date.now();

  return [
    {
      id: `title-${timestamp}`,
      type: "title",
      value: "",
      order: 0,
    },
    {
      id: `richtext-${timestamp}`,
      type: "richtext",
      value: "",
      order: 1,
    },
  ];
};

// Unified storage provider
export const storageProvider = {
  // --- PANELS ---
  async getPanels(): Promise<Panel[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const panelsCol = collection(db, "panels");
        const q = query(panelsCol, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const list: Panel[] = [];
        snapshot.forEach((docSnap) => {
          list.push(normalizePanel(docSnap.data() as Partial<Panel>, docSnap.id));
        });
        return list;
      } catch (e) {
        console.error("Firebase getPanels failed", e);
        throw new StorageError("Khong the tai danh sach panel tu Firebase.", e);
      }
    }

    // Local Storage Fallback
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lupanel_panels");
      if (stored) {
        try {
          const list = JSON.parse(stored) as Panel[];
          return list.map((panel) => normalizePanel(panel)).sort((a, b) => b.createdAt - a.createdAt);
        } catch {
          return [];
        }
      }
    }
    return [];
  },

  async createPanel(name: string, rawCode: string): Promise<Panel | null> {
    const trimmedName = name.trim();
    const id = slugify(rawCode);
    if (!id) return null;

    const newPanel: Panel = {
      id,
      name: trimmedName,
      code: id,
      title: trimmedName,
      createdAt: Date.now(),
    };

    if (isFirebaseConfigured() && db) {
      try {
        const firestore = db;
        const docRef = doc(firestore, "panels", id);
        // Check if panel already exists
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return null; // Panel already exists
        }
        const batch = writeBatch(db);
        batch.set(docRef, newPanel);

        createDefaultPanelComponents().forEach((component) => {
          batch.set(doc(firestore, "panels", id, "components", component.id), component);
        });

        await batch.commit();
        return newPanel;
      } catch (e) {
        console.error("Firebase createPanel failed", e);
        throw new StorageError("Khong the tao panel tren Firebase.", e);
      }
    }

    // Local Storage Fallback
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lupanel_panels");
      const list = stored ? (JSON.parse(stored) as Panel[]) : [];
      if (list.some((p) => p.id === id)) {
        return null; // Panel already exists
      }
      list.push(newPanel);
      localStorage.setItem("lupanel_panels", JSON.stringify(list));
      localStorage.setItem(`lupanel_components_${id}`, JSON.stringify(createDefaultPanelComponents()));
      return newPanel;
    }

    return null;
  },

  async getPanel(id: string): Promise<Panel | null> {
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, "panels", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return normalizePanel(snap.data() as Partial<Panel>, snap.id);
        }
        return null;
      } catch (e) {
        console.error("Firebase getPanel failed", e);
        throw new StorageError("Khong the tai panel tu Firebase.", e);
      }
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lupanel_panels");
      if (stored) {
        const list = JSON.parse(stored) as Panel[];
        const panel = list.map((item) => normalizePanel(item)).find((p) => p.id === id);
        return panel || null;
      }
    }
    return null;
  },

  async deletePanel(id: string): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        // Delete all components of the panel
        const componentsCol = collection(db, "panels", id, "components");
        const componentsSnap = await getDocs(componentsCol);
        
        const batch = writeBatch(db);
        componentsSnap.forEach((compDoc) => {
          batch.delete(compDoc.ref);
        });
        
        batch.delete(doc(db, "panels", id));
        await batch.commit();
        return;
      } catch (e) {
        console.error("Firebase deletePanel failed", e);
        throw new StorageError("Khong the xoa panel tren Firebase.", e);
      }
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lupanel_panels");
      if (stored) {
        let list = JSON.parse(stored) as Panel[];
        list = list.filter((p) => p.id !== id);
        localStorage.setItem("lupanel_panels", JSON.stringify(list));
      }
      localStorage.removeItem(`lupanel_components_${id}`);
    }
  },

  async updatePanel(currentId: string, name: string, rawCode: string): Promise<Panel | null> {
    const nextId = slugify(rawCode);
    const trimmedName = name.trim();
    if (!nextId || !trimmedName) return null;

    if (isFirebaseConfigured() && db) {
      try {
        const firestore = db;
        const currentRef = doc(firestore, "panels", currentId);
        const currentSnap = await getDoc(currentRef);
        if (!currentSnap.exists()) return null;

        if (nextId !== currentId) {
          const nextSnap = await getDoc(doc(firestore, "panels", nextId));
          if (nextSnap.exists()) return null;
        }

        const currentPanel = normalizePanel(currentSnap.data() as Partial<Panel>, currentSnap.id);
        const nextPanel: Panel = {
          ...currentPanel,
          id: nextId,
          code: nextId,
          name: trimmedName,
          title: trimmedName,
        };

        const batch = writeBatch(firestore);

        if (nextId === currentId) {
          batch.set(currentRef, nextPanel);
        } else {
          const currentComponentsCol = collection(firestore, "panels", currentId, "components");
          const currentComponentsSnap = await getDocs(currentComponentsCol);
          batch.set(doc(firestore, "panels", nextId), nextPanel);
          currentComponentsSnap.forEach((componentDoc) => {
            batch.set(doc(firestore, "panels", nextId, "components", componentDoc.id), componentDoc.data());
            batch.delete(componentDoc.ref);
          });
          batch.delete(currentRef);
        }

        await batch.commit();
        return nextPanel;
      } catch (e) {
        console.error("Firebase updatePanel failed", e);
        throw new StorageError("Khong the cap nhat panel tren Firebase.", e);
      }
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lupanel_panels");
      const list = stored ? (JSON.parse(stored) as Panel[]).map((panel) => normalizePanel(panel)) : [];
      const currentPanel = list.find((panel) => panel.id === currentId);
      if (!currentPanel) return null;
      if (nextId !== currentId && list.some((panel) => panel.id === nextId)) return null;

      const nextPanel: Panel = {
        ...currentPanel,
        id: nextId,
        code: nextId,
        name: trimmedName,
        title: trimmedName,
      };
      const nextList = list.map((panel) => (panel.id === currentId ? nextPanel : panel));
      localStorage.setItem("lupanel_panels", JSON.stringify(nextList));

      if (nextId !== currentId) {
        const components = localStorage.getItem(`lupanel_components_${currentId}`);
        if (components !== null) {
          localStorage.setItem(`lupanel_components_${nextId}`, components);
        }
        localStorage.removeItem(`lupanel_components_${currentId}`);
      }

      return nextPanel;
    }

    return null;
  },

  // --- COMPONENTS ---
  async getComponents(panelId: string): Promise<PanelComponent[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const componentsCol = collection(db, "panels", panelId, "components");
        const q = query(componentsCol, orderBy("order", "asc"));
        const snapshot = await getDocs(q);
        const list: PanelComponent[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as PanelComponent);
        });
        return list;
      } catch (e) {
        console.error("Firebase getComponents failed", e);
        throw new StorageError("Khong the tai noi dung panel tu Firebase.", e);
      }
    }

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`lupanel_components_${panelId}`);
      if (stored) {
        try {
          const list = JSON.parse(stored) as PanelComponent[];
          return list.sort((a, b) => a.order - b.order);
        } catch {
          return [];
        }
      }
    }
    return [];
  },

  async saveComponents(panelId: string, components: PanelComponent[]): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        // In Firestore, we will update individual components.
        // A simple batch delete and insert, or writing them individually.
        const batch = writeBatch(db);
        
        // Let's retrieve existing to delete any removed ones
        const colRef = collection(db, "panels", panelId, "components");
        const snap = await getDocs(colRef);
        
        const existingIds = snap.docs.map(doc => doc.id);
        const newIds = components.map(c => c.id);
        
        // Delete removed components
        existingIds.forEach((id) => {
          if (!newIds.includes(id)) {
            batch.delete(doc(colRef, id));
          }
        });

        // Set or update current components
        components.forEach((comp) => {
          batch.set(doc(colRef, comp.id), comp);
        });

        await batch.commit();
        return;
      } catch (e) {
        console.error("Firebase saveComponents failed", e);
        throw new StorageError("Khong the luu noi dung panel len Firebase.", e);
      }
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(`lupanel_components_${panelId}`, JSON.stringify(components));
    }
  },

  // --- IMAGE / FILE UPLOAD ---
  async uploadFile(panelId: string, file: File): Promise<string> {
    if (isCloudinaryConfigured()) {
      try {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        const folder = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || `lupanel/${panelId}`;
        const formData = new FormData();

        formData.append("file", file);
        formData.append("upload_preset", uploadPreset as string);
        formData.append("folder", folder);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: "POST",
          body: formData,
        });
        const data = (await response.json()) as CloudinaryUploadResponse;

        if (!response.ok || data.error || (!data.secure_url && !data.url)) {
          throw new StorageError(data.error?.message || "Cloudinary upload failed.");
        }

        return data.secure_url || (data.url as string);
      } catch (e) {
        console.error("Cloudinary upload failed", e);
        throw new StorageError("Khong the tai file len Cloudinary.", e);
      }
    }

    // Local Storage Base64 Fallback
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  async uploadImage(panelId: string, file: File): Promise<string> {
    return this.uploadFile(panelId, file);
  }
};
