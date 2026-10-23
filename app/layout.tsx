import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NÓRD — Clube de viagens",
  description: "Demonstração pública de um clube de viagens. Navegação somente leitura, sem dados pessoais.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
