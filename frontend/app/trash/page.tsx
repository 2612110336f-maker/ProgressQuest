"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Quest, deleteQuest, getTrashedQuests, restoreQuest } from "@/lib/api";

export default function TrashPage() {
  const router = useRouter();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await getTrashedQuests();
    setQuests(data);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    load()
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, []);

  const handleRestore = async (id: string) => {
    await restoreQuest(id);
    load();
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("完全に削除します。この操作は元に戻せません。よろしいですか？")) return;
    await deleteQuest(id);
    load();
  };

  return (
    <div className="min-h-screen bg-parchment">
      <header className="bg-[#2D6A4F] h-16 flex items-center">
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-8 flex justify-between items-center">
          <Link href="/dashboard" className="text-sm text-white/80 hover:text-white transition">
            ← ダッシュボードに戻る
          </Link>
          <h1 className="font-display text-lg font-bold text-white">🏆 クリア済み</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-8">
        {loading && <p className="text-[#2D6A4F] font-display">読み込み中...</p>}

        {!loading && quests.length === 0 && (
          <p className="text-[#888888] text-center py-10">クリア済みは空です。</p>
        )}

        <div className="space-y-3">
          {quests.map((q) => (
            <div
              key={q.id}
              className="bg-[#F5F0E8] shadow-neumorphism rounded-xl p-4 flex justify-between items-center gap-3"
            >
              <div>
                <p className="font-bold text-[#2C2C2C]">{q.title}</p>
                {q.description && (
                  <p className="text-xs text-[#5a5a5a] mt-0.5 italic">「{q.description}」</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleRestore(q.id)}
                  className="text-xs h-9 px-3 rounded-xl bg-[#2D6A4F] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm"
                >
                  復元する
                </button>
                <button
                  onClick={() => handlePermanentDelete(q.id)}
                  className="text-xs h-9 px-3 rounded-xl bg-[#E05252] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm"
                >
                  完全に削除
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
