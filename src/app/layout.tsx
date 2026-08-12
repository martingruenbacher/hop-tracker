import type { Metadata } from "next";
import React from "react";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hop Tracker — Czech Republic 2026",
  description: "Beer logging app for the boys trip",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-amber-950 text-amber-100">{children}</body>
    </html>
  );
}
