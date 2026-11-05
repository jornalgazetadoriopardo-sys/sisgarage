import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "SisGarage — Carros e motos das melhores lojas", template: "%s | SisGarage" },
  description: "Encontre carros, motos e utilitários seminovos das lojas da sua região.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen bg-page text-slate-900 antialiased`}>{children}</body>
    </html>
  );
}
