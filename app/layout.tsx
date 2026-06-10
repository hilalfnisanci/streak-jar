import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Header } from "./components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Streak Jar",
  description: "A marble jar habit tracker.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream font-sans text-ink antialiased">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
