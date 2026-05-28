"use client";

import React, { useState } from "react";
import { isFirebaseConfigured, auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, signOut } from "firebase/auth";

interface LoginScreenProps {
  onLoginSuccess: (user: { email: string; displayName: string; photoURL: string }) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFirebaseLogin = async () => {
    if (!auth || !googleProvider) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (user.email === "huuluannt@gmail.com") {
        onLoginSuccess({
          email: user.email,
          displayName: user.displayName || "Luan Huu",
          photoURL: user.photoURL || "",
        });
      } else {
        setError("Truy cập bị từ chối. LuPanel là ứng dụng riêng tư và chỉ khả dụng cho tài khoản huuluannt@gmail.com.");
        await signOut(auth);
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Đã xảy ra lỗi khi đăng nhập bằng Google. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      onLoginSuccess({
        email: "huuluannt@gmail.com",
        displayName: "Huu Luan",
        photoURL: "https://lh3.googleusercontent.com/a/ACg8ocL_c1234567890-demo=s96-c",
      });
      setLoading(false);
    }, 600);
  };

  const isLive = isFirebaseConfigured();

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">Lu</div>
          <div className="logo-label">LuPanel</div>
        </div>
        
        <p className="login-desc">
          Chào mừng bạn đến với LuPanel.<br />
          Không gian lưu trữ thông tin, ghi chú và hình ảnh cá nhân.
        </p>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
          {isLive ? (
            <button 
              className="login-btn" 
              onClick={handleFirebaseLogin}
              disabled={loading}
              style={{ justifyContent: "center" }}
            >
              <svg viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.85-2.08 2.18v2.77h3.3c1.93-1.78 3.03-4.4 3.03-7.8z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.97-1.08 7.96-2.93l-3.3-2.77c-.92.62-2.1 1-3.66 1-3.13 0-5.78-2.1-6.73-4.94H1.03v2.87C3.01 20.3 7.23 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.36c-.25-.7-.39-1.46-.39-2.25s.14-1.55.39-2.25V6.99H1.03C.37 8.3.01 9.77.01 11.3s.36 3 .99 4.31l3.3-2.87c-.03.01.97-.38.97-.38z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.6 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 7.23 0 3.01 3.7 1.03 7.86l3.3 2.87c.95-2.84 3.6-4.94 6.73-4.94z"
                />
              </svg>
              {loading ? "Đang kết nối..." : "Đăng nhập Google"}
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button 
                className="login-btn" 
                onClick={handleDemoLogin}
                disabled={loading}
                style={{ justifyContent: "center" }}
              >
                <span>🚀 Thử nghiệm (huuluannt@gmail.com)</span>
              </button>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "6px" }}>
                * Firebase chưa được cấu hình. Ứng dụng đang chạy ở chế độ Demo (lưu trữ trong trình duyệt).
              </div>
            </div>
          )}

          {error && (
            <div 
              style={{ 
                fontSize: "11px", 
                color: "#ef4444", 
                marginTop: "12px", 
                lineHeight: "1.5",
                padding: "8px",
                border: "1px solid #fee2e2",
                borderRadius: "4px",
                backgroundColor: "#fef2f2"
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
