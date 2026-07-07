// --- PWA用のWebアプリマニフェスト定義(第3週にServiceweb/Serwistで追加、AGENTS.md参照) ---
// Next.jsがこの関数の戻り値から自動で/manifest.webmanifestを生成する。
// ホーム画面追加時のアイコン・アプリ名・テーマカラーなどを定義する。
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ProgressQuest",
    short_name: "ProgressQuest",
    description: "目標達成をRPGのクエストのように体験できるアプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F0E8",
    theme_color: "#2D6A4F",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
