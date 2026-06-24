"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getQuests, Quest } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    getQuests()
      .then(setQuests)
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">ProgressQuest</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-500 transition"
          >
            ログアウト
          </button>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">ロードマップ一覧</h2>
          <Link
            href="/new"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm"
          >
            + 新しいロードマップを作る
          </Link>
        </div>

        {loading && <p className="text-gray-500">読み込み中...</p>}

        {!loading && quests.length === 0 && (
          <p className="text-gray-500">まだロードマップがありません。</p>
        )}

        <div className="grid gap-4">
          {quests.map((quest) => (
            <Link
              key={quest.id}
              href={`/quest/${quest.id}`}
              className="block bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition border"
            >
              <h3 className="font-semibold text-lg">{quest.title}</h3>
              {quest.description && (
                <p className="text-gray-500 text-sm mt-1">{quest.description}</p>
              )}
              {quest.final_deadline && (
                <p className="text-xs text-gray-400 mt-2">期日: {quest.final_deadline}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
