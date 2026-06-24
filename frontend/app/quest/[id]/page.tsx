"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Checkpoint,
  QuestDetail,
  createCheckpoint,
  deleteCheckpoint,
  deleteQuest,
  getQuest,
  updateCheckpoint,
} from "@/lib/api";
import { getCheckpointStatuses } from "@/lib/questStatus";
import QuestMap from "@/components/QuestMap";

export default function QuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const questId = params.id as string;

  const [quest, setQuest] = useState<QuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  const load = async () => {
    try {
      const data = await getQuest(questId);
      setQuest(data);
    } catch (e: any) {
      setError(e.response?.data?.detail || "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    load();
  }, [questId]);

  const handleAddCheckpoint = async () => {
    if (!newTitle.trim()) return;
    await createCheckpoint(questId, {
      title: newTitle,
      due_date: newDueDate || undefined,
      order_index: (quest?.checkpoints.length || 0) + 1,
    });
    setNewTitle("");
    setNewDueDate("");
    load();
  };

  const handleToggleComplete = async (checkpoint: Checkpoint) => {
    await updateCheckpoint(checkpoint.id, { completed: !checkpoint.completed_at });
    load();
  };

  const handleDeleteCheckpoint = async (id: string) => {
    await deleteCheckpoint(id);
    load();
  };

  const handleDeleteQuest = async () => {
    if (!confirm("このクエストを削除しますか？")) return;
    await deleteQuest(questId);
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center text-slate-500">
        読み込み中...
      </div>
    );
  }

  if (error || !quest) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center text-red-500">
        {error || "クエストが見つかりません"}
      </div>
    );
  }

  const items = getCheckpointStatuses(quest.checkpoints);
  const current = items.find((item) => item.status === "current" || item.status === "overdue");
  const allCompleted = items.length > 0 && items.every((item) => item.status === "completed");

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-md lg:max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/dashboard" className="text-sm text-amber-600 hover:underline">
            ← ダッシュボードに戻る
          </Link>
          <button
            onClick={handleDeleteQuest}
            className="text-xs text-red-500 hover:underline"
          >
            削除
          </button>
        </div>
      </header>

      <main className="max-w-md lg:max-w-4xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-slate-800">{quest.title}</h1>
        {quest.description && <p className="text-slate-500 text-sm mt-1">{quest.description}</p>}
        {quest.final_deadline && (
          <p className="text-xs text-slate-400 mt-2 mb-4">期日: {quest.final_deadline}</p>
        )}

        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
          <div className="bg-white border border-amber-200 rounded-xl p-2 mt-4 lg:mt-0 max-w-xs mx-auto lg:max-w-sm overflow-x-auto">
            <QuestMap items={items} />
          </div>

          <div>
            {items.length === 0 && (
              <p className="text-slate-400 text-sm text-center my-6">
                まだチェックポイントがありません。
              </p>
            )}

            {current && (
              <div
                className={`rounded-xl p-4 mt-4 lg:mt-0 border ${
                  current.status === "overdue"
                    ? "bg-red-50 border-red-200"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <p
                  className={`text-xs font-bold mb-1 ${
                    current.status === "overdue" ? "text-red-500" : "text-blue-500"
                  }`}
                >
                  {current.status === "overdue" ? "⚠️ 危険：期日超過" : "⚔️ 現在地"}
                </p>
                <p className="font-bold text-lg text-slate-800">{current.checkpoint.title}</p>
                {current.checkpoint.description && (
                  <p className="text-sm text-slate-600 mt-1">{current.checkpoint.description}</p>
                )}
                {current.checkpoint.due_date && (
                  <p className="text-xs text-slate-500 mt-1">
                    期日: {current.checkpoint.due_date}
                  </p>
                )}
                <button
                  onClick={() => handleToggleComplete(current.checkpoint)}
                  className="mt-3 w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition font-bold"
                >
                  ✅ このチェックポイントをクリア！
                </button>
              </div>
            )}

            {allCompleted && (
              <div className="rounded-xl p-4 mt-4 lg:mt-0 bg-green-50 border border-green-200 text-center">
                <p className="text-green-500 font-bold text-lg">🏆 クエストクリア！</p>
              </div>
            )}

            <div className="bg-white border border-amber-200 rounded-lg p-4 mt-6">
              <h3 className="font-medium mb-3 text-sm text-slate-600">チェックポイントを追加</h3>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="タイトル"
                  className="flex-1 border border-amber-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                />
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="border border-amber-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                />
                <button
                  onClick={handleAddCheckpoint}
                  className="bg-amber-400 text-white px-4 py-2 rounded-lg hover:bg-amber-500 transition font-bold text-sm"
                >
                  追加
                </button>
              </div>
            </div>

            {items.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium mb-2 text-sm text-slate-600">チェックポイント一覧</h3>
                <div className="space-y-2">
                  {items.map(({ checkpoint }) => (
                    <div
                      key={checkpoint.id}
                      className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!checkpoint.completed_at}
                          onChange={() => handleToggleComplete(checkpoint)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700">{checkpoint.title}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCheckpoint(checkpoint.id)}
                        className="text-xs text-slate-400 hover:text-red-500"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
