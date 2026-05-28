import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuPanel - Private Personal Workspace",
  description: "A pristine, ultra-minimalist personal workspace to store notes, thoughts, and images securely.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        {children}
      </body>
    </html>
  );
}

