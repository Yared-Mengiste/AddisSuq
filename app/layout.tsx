import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "AddisSuq | Your neighbourhood, online", description: "Discover products from independent shops in Addis Ababa." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
