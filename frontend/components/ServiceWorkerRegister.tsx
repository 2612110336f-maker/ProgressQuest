// --- PWA: Service Worker登録専用コンポーネント ---
// 画面には何も描画せず、マウント時に一度だけ/sw.js(Serwistが生成)を登録する。
// 開発中(NODE_ENV !== "production")は登録しない=キャッシュに邪魔されず常に最新コードで開発できる。
"use client";
import { useEffect } from "react";

export const ServiceWorkerRegister = () => {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return null;
};
