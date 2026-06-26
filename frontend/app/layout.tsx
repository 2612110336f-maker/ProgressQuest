import type { Metadata } from "next";
import { Cinzel, Inter, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const nicoKaku = localFont({
  src: "../public/fonts/nicokaku_v2-5.ttf",
  variable: "--font-nico-kaku",
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  weight: ["400", "600", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ProgressQuest",
  description: "目標達成をRPGのクエストのように体験できるアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${cinzel.variable} ${inter.variable} ${notoSerifJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0F172A] text-[#F8FAFC]">
        {children}
      </body>
    </html>
  );
}
