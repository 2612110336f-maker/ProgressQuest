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

const getStatus = (checkpoint: Checkpoint): "completed" | "overdue" | "pending" => {
  if (checkpoint.completed_at) return "completed";
  if (checkpoint.due_date && new Date(checkpoint.due_date) < new Date(new Date().toDateString())) {
    return "overdue";
  }
  return "pending";
};

const statusStyles: Record<string, string> = {
  completed: "bg-green-50 border-green-300 text-green-700",
  overdue: "bg-red-50 border-red-300 text-red-700",
  pending: "bg-gray-50 border-gray-300 text-gray-700",
};

const statusLabel: Record<string, string> = {
  completed: "完了",
  overdue: "期日超過",
  pending: "未完了",
};

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
    if (!confirm("このロードマップを削除しますか？")) return;
    await deleteQuest(questId);
    router.push("/dashboard");
  };

  if (loading) {
    return <div className="p-8 text-gray-500">読み込み中...</div>;
  }

  if (error || !quest) {
    return <div className="p-8 text-red-500">{error || "ロードマップが見つかりません"}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-sm text-blue-500 hover:underline">
          ← ダッシュボードに戻る
        </Link>

        <div className="flex justify-between items-start mt-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">{quest.title}</h1>
            {quest.description && <p className="text-gray-500 mt-1">{quest.description}</p>}
            {quest.final_deadline && (
              <p className="text-sm text-gray-400 mt-2">期日: {quest.final_deadline}</p>
            )}
          </div>
          <button
            onClick={handleDeleteQuest}
            className="text-sm text-red-500 hover:underline"
          >
            ロードマップを削除
          </button>
        </div>

        <h2 className="text-xl font-semibold mb-4">チェックポイント</h2>

        <div className="space-y-3 mb-6">
          {quest.checkpoints.map((checkpoint) => {
            const status = getStatus(checkpoint);
            return (
              <div
                key={checkpoint.id}
                className={`border rounded-lg p-4 flex items-center justify-between ${statusStyles[status]}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!checkpoint.completed_at}
                    onChange={() => handleToggleComplete(checkpoint)}
                    className="w-5 h-5"
                  />
                  <div>
                    <p className="font-medium">{checkpoint.title}</p>
                    {checkpoint.description && (
                      <p className="text-sm opacity-80">{checkpoint.description}</p>
                    )}
                    <div className="flex gap-2 items-center mt-1">
                      {checkpoint.due_date && (
                        <span className="text-xs opacity-70">期日: {checkpoint.due_date}</span>
                      )}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/60">
                        {statusLabel[status]}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteCheckpoint(checkpoint.id)}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  削除
                </button>
              </div>
            );
          })}
          {quest.checkpoints.length === 0 && (
            <p className="text-gray-400 text-sm">まだチェックポイントがありません。</p>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium mb-3">チェックポイントを追加</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="タイトル"
              className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleAddCheckpoint}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              追加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
