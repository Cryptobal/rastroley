import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rastro — Escáner de cookies y píxeles (Ley 21.719)",
  description:
    "Escaneo gratuito de cookies y píxeles de rastreo para cumplir la Ley 21.719 de Chile.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        {children}
      </body>
    </html>
  );
}
