import type { Metadata, Viewport } from "next";
import React from "react";
import { Geist } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hop Tracker — Czech Republic 2026",
  description: "Beer logging app for the boys trip",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hop Tracker",
  },
  icons: {
    icon: "/pwa-icon-192.png",
    apple: "/pwa-icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#78350f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-amber-950 text-amber-100">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
