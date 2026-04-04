import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutomatizaciónEscribano",
  description: "Automatización de compraventas para escribanos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
