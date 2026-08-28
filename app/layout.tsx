import type { Metadata } from "next";
import { Fraunces, Noto_Sans_Ethiopic, Public_Sans } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Providers } from "@/components/providers/providers";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const ethiopic = Noto_Sans_Ethiopic({
  subsets: ["ethiopic"],
  weight: ["400", "600"],
  variable: "--font-ethiopic",
});

export const metadata: Metadata = {
  title: "AddisSuq | Your neighbourhood, online",
  description:
    "Discover products from independent shops in Addis Ababa — browse, order, pay with Telebirr, CBE Birr, Chapa or cash, and get delivery or pickup.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${ethiopic.variable}`}>
        <Providers>
          <Header />
          <main className="min-h-[70vh]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
