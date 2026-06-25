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
      <header className="card-fantasy">
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-sm text-emerald-700 hover:underline">
            ← ダッシュボードに戻る
          </Link>
          <h1 className="font-display text-lg font-bold text-emerald-900">🗑️ ゴミ箱</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-8">
        {loading && <p className="text-amber-700 font-display">読み込み中...</p>}

        {!loading && quests.length === 0 && (
          <p className="text-slate-500 text-center py-10">ゴミ箱は空です。</p>
        )}

        <div className="space-y-3">
          {quests.map((q) => (
            <div key={q.id} className="card-fantasy rounded-xl p-4 flex justify-between items-center gap-3">
              <div>
                <p className="font-bold text-slate-800">{q.title}</p>
                {q.description && (
                  <p className="text-xs text-slate-500 mt-0.5 italic">「{q.description}」</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleRestore(q.id)}
                  className="text-xs bg-emerald-50 border border-emerald-300 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition font-bold"
                >
                  復元する
                </button>
                <button
                  onClick={() => handlePermanentDelete(q.id)}
                  className="text-xs bg-red-50 border border-red-300 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition font-bold"
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
