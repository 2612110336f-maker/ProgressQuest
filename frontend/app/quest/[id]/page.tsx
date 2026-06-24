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
import Timeline from "@/components/Timeline";

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
      <div className="min-h-screen bg-parchment flex items-center justify-center text-amber-800 font-display">
        読み込み中...
      </div>
    );
  }

  if (error || !quest) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center text-red-500">
        {error || "クエストが見つかりません"}
      </div>
    );
  }

  const items = getCheckpointStatuses(quest.checkpoints);
  const current = items.find((item) => item.status === "current" || item.status === "overdue");
  const allCompleted = items.length > 0 && items.every((item) => item.status === "completed");

  return (
    <div className="min-h-screen bg-parchment">
      <header className="card-fantasy border-b border-border bg-card/65 backdrop-blur-md">
        <div className="max-w-md lg:max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/dashboard" className="text-sm text-primary hover:underline font-display">
            ← ダッシュボードに戻る
          </Link>
          <button
            onClick={handleDeleteQuest}
            className="text-xs text-danger hover:underline font-display"
          >
            クエストを破棄 ⚔️
          </button>
        </div>
      </header>

      <main className="max-w-md lg:max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-100">{quest.title}</h1>
          {quest.description && (
            <p className="text-slate-400 text-sm italic mt-1">「{quest.description}」</p>
          )}
          {quest.final_deadline && (
            <p className="text-xs text-warning mt-2 font-display">最終期日: {quest.final_deadline}</p>
          )}
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
          {/* 左カラム：クエストビジュアルマップ */}
          <div className="card-fantasy rounded-2xl p-4 bg-card/40 border border-border overflow-x-auto max-w-xs mx-auto lg:max-w-sm">
            <h3 className="font-display font-bold text-xs text-primary mb-3 uppercase tracking-widest">
              Quest Map (探索地図)
            </h3>
            <QuestMap items={items} />
          </div>

          {/* 右カラム：現在地とタイムライン */}
          <div className="space-y-6">
            {current && (
              <div
                className={`rounded-xl p-4 border transition-all duration-300 ${
                  current.status === "overdue"
                    ? "bg-danger/10 border-danger text-slate-200"
                    : "bg-primary/10 border-primary text-slate-200"
                }`}
              >
                <span className="inline-block text-[10px] font-bold tracking-widest uppercase bg-secondary/20 text-secondary border border-secondary/30 rounded-full px-2.5 py-0.5 mb-2 font-display">
                  {current.status === "overdue" ? "Overdue" : "Current Active Quest"}
                </span>
                <p
                  className={`text-xs font-bold mb-1 ${
                    current.status === "overdue" ? "text-danger" : "text-primary"
                  }`}
                >
                  {current.status === "overdue" ? "⚠️ 警告：期日超過" : "⚔️ 現在進行中"}
                </p>
                <p className="font-display font-bold text-lg text-slate-100">
                  {current.checkpoint.title}
                </p>
                {current.checkpoint.description && (
                  <p className="text-xs text-slate-400 mt-1">{current.checkpoint.description}</p>
                )}
                {current.checkpoint.due_date && (
                  <p className="text-xs text-slate-400 mt-1 font-display">
                    期日: {current.checkpoint.due_date}
                  </p>
                )}
                <button
                  onClick={() => handleToggleComplete(current.checkpoint)}
                  className="mt-3 w-full bg-success text-white py-2 rounded-lg hover:bg-opacity-90 transition font-bold font-display shadow-md text-sm"
                >
                  ✅ このチェックポイントをクリア！
                </button>
              </div>
            )}

            {allCompleted && (
              <div className="rounded-xl p-4 bg-success/20 border border-success text-center">
                <p className="text-success font-bold text-lg font-display">🏆 クエストクリア！</p>
              </div>
            )}

            {/* チェックポイント追加 */}
            <div className="card-fantasy rounded-xl p-4 bg-card/40 border border-border">
              <h3 className="font-bold mb-3 text-xs text-slate-350 tracking-widest uppercase font-display">
                チェックポイントを追加
              </h3>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="タイトル"
                  className="flex-1 border border-border rounded-lg px-3 py-2 bg-slate-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 bg-slate-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <button
                  onClick={handleAddCheckpoint}
                  className="bg-primary hover:bg-opacity-90 text-white px-4 py-2 rounded-lg transition font-bold text-sm font-display shadow-md"
                >
                  追加
                </button>
              </div>
            </div>

            {/* タイムライン表示 */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs text-slate-400 tracking-widest uppercase font-display">
                ロードマップ進捗
              </h3>
              {items.length === 0 ? (
                <p className="text-slate-500 text-sm text-center my-6">
                  まだチェックポイントがありません。
                </p>
              ) : (
                <Timeline
                  checkpoints={quest.checkpoints}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDeleteCheckpoint}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
