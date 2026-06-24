import type { Metadata } from "next";
import { Cinzel, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  weight: ["400", "600", "700", "900"],
  subsets: ["latin"],
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
      className={`${cinzel.variable} ${notoSerifJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
