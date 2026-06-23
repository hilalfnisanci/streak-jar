import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { Header } from "./components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Streak Jar",
  description: "A marble jar habit tracker.",
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  variable: "--font-fraunces",
  display: "swap",
});

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html className={`${inter.variable} ${fraunces.variable}`} lang="en">
      <body className="min-h-screen bg-cream font-sans text-ink antialiased">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
