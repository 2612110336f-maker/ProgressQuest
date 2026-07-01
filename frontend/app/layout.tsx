import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/InstallPrompt";

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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ProgressQuest",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2D6A4F",
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
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
