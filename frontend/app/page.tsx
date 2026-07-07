// --- ルート("/")ページ ---
// 画面は何も描画せず、ログイン状態を判定してリダイレクトするだけの
// 「振り分け役」。トークンが無ければ/login、有効なトークンがあれば/dashboardへ。
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    // トークンがあっても失効している可能性があるため、/auth/meで実際に検証する
    getMe()
      .then(() => router.replace("/dashboard"))
      .catch(() => {
        localStorage.removeItem("token");
        router.replace("/login");
      });
  }, [router]);

  return null;
}
