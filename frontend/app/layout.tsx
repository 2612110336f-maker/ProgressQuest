import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const zenMaruGothic = localFont({
  src: [
    {
      path: "../public/fonts/ZenMaruGothic-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/ZenMaruGothic-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/ZenMaruGothic-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/ZenMaruGothic-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/ZenMaruGothic-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-zen-maru-gothic",
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
      className={`${zenMaruGothic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
