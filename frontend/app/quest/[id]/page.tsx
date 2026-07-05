"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Checkpoint,
  QuestDetail,
  createCheckpoint,
  deleteCheckpoint,
  deleteQuest,
  getQuest,
  trashQuest,
  updateCheckpoint,
} from "@/lib/api";
import { getCheckpointStatuses } from "@/lib/questStatus";
import QuestMap from "@/components/QuestMap";
import QuestMapSimple from "@/components/QuestMapSimple";
import Mascot from "@/components/Mascot";
import { useTheme } from "@/lib/theme";

type Tab = "map" | "list";

export default function QuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const questId = params.id as string;

  const [quest, setQuest] = useState<QuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("map");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);

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
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      description: newDescription || undefined,
      due_date: newDueDate || undefined,
      order_index: (quest?.checkpoints.length || 0) + 1,
    });
    setNewTitle("");
    setNewDescription("");
    setNewDueDate("");
    load();
  };

  const handleToggleComplete = async (checkpoint: Checkpoint) => {
    const wasAllCompleted =
      !!quest && quest.checkpoints.length > 0 && quest.checkpoints.every((cp) => cp.completed_at);
    await updateCheckpoint(checkpoint.id, { completed: !checkpoint.completed_at });
    const data = await getQuest(questId);
    setQuest(data);
    const isAllCompletedNow =
      data.checkpoints.length > 0 && data.checkpoints.every((cp) => cp.completed_at);
    if (isAllCompletedNow && !wasAllCompleted) {
      setShowCelebration(true);
    }
  };

  const handleDeleteCheckpoint = async (id: string) => {
    await deleteCheckpoint(id);
    load();
  };

  const handleTrashQuest = async () => {
    if (!confirm("このクエストクリア済みに入れますか？")) return;
    await trashQuest(questId);
    router.push("/dashboard");
  };

  const handleDeleteQuest = async () => {
    if (!confirm("このクエストを削除しますか？")) return;
    try {
      await deleteQuest(questId);
      router.push("/dashboard");
    } catch (e: any) {
      alert(e.response?.data?.detail || "クエストの削除に失敗しました。");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center text-[#2D6A4F] font-display">
        読み込み中...
      </div>
    );
  }

  if (error || !quest) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center text-[#E05252]">
        {error || "クエストが見つかりません"}
      </div>
    );
  }

  const items = getCheckpointStatuses(quest.checkpoints);
  const current = items.find((item) => item.status === "current" || item.status === "overdue");
  const allCompleted = items.length > 0 && items.every((item) => item.status === "completed");

  return (
    <div className="min-h-screen bg-parchment">
      <header className="bg-[#2D6A4F] h-16 flex items-center">
        <div className="w-full max-w-md lg:max-w-4xl mx-auto px-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-sm text-white/80 hover:text-white transition">
            ← ダッシュボードに戻る
          </Link>
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 text-white/80 hover:text-white transition"
              aria-label="メニュー"
            >
              <span className="block w-5 h-0.5 bg-current rounded" />
              <span className="block w-5 h-0.5 bg-current rounded" />
              <span className="block w-5 h-0.5 bg-current rounded" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-[#F5F0E8] rounded-xl shadow-lg overflow-hidden z-50">
                <button
                  onClick={() => { toggle(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-[#2C2C2C] hover:bg-[#2D6A4F]/10 transition"
                >
                  {theme === "fantasy" ? "📋 シンプル" : "⚔️ ファンタジー"}
                </button>
                <button
                  onClick={() => { handleTrashQuest(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-[#2C2C2C] hover:bg-[#2D6A4F]/10 transition"
                >
                  🏆 クリア済みに入れる
                </button>
                <div className="border-t border-[#E8E0D0]" />
                <button
                  onClick={() => { handleDeleteQuest(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-[#E05252] hover:bg-[#E05252]/10 transition"
                >
                  🗑️ クエスト削除
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md lg:max-w-4xl mx-auto p-4 sm:p-6">
        <h1 className="font-display text-2xl font-bold text-[#2C2C2C]">{quest.title}</h1>
        {quest.description && (
          <p className="text-[#5a5a5a] text-sm italic mt-1">「{quest.description}」</p>
        )}
        {quest.final_deadline && (
          <p className="text-xs text-[#2D6A4F] mt-2 mb-4">期日: {quest.final_deadline}</p>
        )}

        <div className="flex border-b border-[#E8E0D0] mb-6">
          <button
            onClick={() => setTab("map")}
            className={`flex-1 py-3 text-sm font-bold transition ${
              tab === "map"
                ? "border-b-2 border-[#2D6A4F] text-[#2D6A4F]"
                : "text-gray-400"
            }`}
          >
            🗺️ マップ
          </button>
          <button
            onClick={() => setTab("list")}
            className={`flex-1 py-3 text-sm font-bold transition ${
              tab === "list"
                ? "border-b-2 border-[#2D6A4F] text-[#2D6A4F]"
                : "text-gray-400"
            }`}
          >
            📋 一覧
          </button>
        </div>

        {tab === "map" && (
          <div>
            <div className={`bg-[#EEF5EE] rounded-2xl p-2 max-w-xs mx-auto max-h-[75vh] overflow-auto ${theme === "fantasy" ? "border-[3px] border-[#2D6A4F]/50 shadow-[inset_0_0_10px_rgba(45,106,79,0.08),0_4px_16px_rgba(45,106,79,0.18)]" : ""}`}>
              {theme === "fantasy" ? (
                <QuestMap items={items} interactive />
              ) : (
                <QuestMapSimple items={items} />
              )}
            </div>

            {items.length === 0 && (
              <p className="text-[#888888] text-sm text-center my-6">
                まだチェックポイントがありません。「一覧」タブから追加してください。
              </p>
            )}

            {current && (
              <div
                className={`rounded-xl p-4 mt-4 ${
                  current.status === "overdue" ? "bg-[#E05252]/10" : "bg-[#2D6A4F]/10"
                }`}
              >
                <span className="inline-block text-[10px] font-bold tracking-widest uppercase bg-[#E9A62A] text-white rounded-full px-2 py-0.5 mb-2">
                  {current.status === "overdue" ? "Overdue" : "Current Quest"}
                </span>
                <p
                  className={`text-xs font-bold mb-1 ${
                    current.status === "overdue" ? "text-[#E05252]" : "text-[#2D6A4F]"
                  }`}
                >
                  {current.status === "overdue" ? "⚠️ 危険：期日超過" : "⚔️ 現在地"}
                </p>
                <p className="font-display font-bold text-lg text-[#2C2C2C]">
                  {current.checkpoint.title}
                </p>
                {current.checkpoint.description && (
                  <p className="text-sm text-[#5a5a5a] mt-1">{current.checkpoint.description}</p>
                )}
                {current.checkpoint.due_date && (
                  <p className="text-xs text-[#888888] mt-1">
                    期日: {current.checkpoint.due_date}
                  </p>
                )}
                {current.checkpoint.estimated_hours != null && (
                  <p className="text-xs text-[#E9A62A] font-bold mt-1">
                    ⏱ 目安{current.checkpoint.estimated_hours}時間
                  </p>
                )}
                <button
                  onClick={() => handleToggleComplete(current.checkpoint)}
                  className="flex items-center justify-center h-12 w-full mt-3 rounded-xl bg-[#2D6A4F] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm"
                >
                  ✅ このチェックポイントをクリア！
                </button>
              </div>
            )}

            {allCompleted && (
              <div className="rounded-xl p-4 mt-4 bg-[#4CAF50]/10 text-center">
                <p className="text-[#4CAF50] font-bold text-lg">🏆 クエストクリア！</p>
              </div>
            )}
          </div>
        )}

        {tab === "list" && (
          <div>
            <div className="bg-[#F5F0E8] shadow-neumorphism rounded-2xl p-4">
              <h3 className="font-bold mb-3 text-xs text-[#2D6A4F] tracking-widest uppercase">
                チェックポイントを追加
              </h3>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="タイトル"
                  className="h-12 rounded-xl px-3 bg-[#F5F0E8] shadow-neumorphism-inset focus:outline-none text-sm"
                />
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="詳細（任意）"
                  rows={2}
                  className="rounded-xl px-3 py-2 bg-[#F5F0E8] shadow-neumorphism-inset focus:outline-none text-sm"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="flex-1 h-12 rounded-xl px-3 bg-[#F5F0E8] shadow-neumorphism-inset focus:outline-none text-sm"
                  />
                  <button
                    onClick={handleAddCheckpoint}
                    className="h-12 px-4 rounded-xl bg-[#E9A62A] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm text-sm"
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>

            {items.length > 0 ? (
              <div className="mt-6">
                <h3 className="font-bold mb-2 text-xs text-[#2D6A4F] tracking-widest uppercase">
                  チェックポイント一覧
                </h3>
                <div className="space-y-2">
                  {items.map(({ checkpoint }) => (
                    <div
                      key={checkpoint.id}
                      className="flex items-start justify-between bg-[#F5F0E8] shadow-neumorphism-sm rounded-xl px-3 py-2"
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={!!checkpoint.completed_at}
                          onChange={() => handleToggleComplete(checkpoint)}
                          className="w-4 h-4 mt-0.5"
                        />
                        <div>
                          <span className="text-sm text-[#2C2C2C]">{checkpoint.title}</span>
                          {checkpoint.description && (
                            <p className="text-xs text-[#5a5a5a] mt-0.5">
                              {checkpoint.description}
                            </p>
                          )}
                          {checkpoint.estimated_hours != null && (
                            <p className="text-xs text-[#E9A62A] font-bold mt-0.5">
                              ⏱ 目安{checkpoint.estimated_hours}時間
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteCheckpoint(checkpoint.id)}
                        className="text-xs text-[#E05252] hover:opacity-70 shrink-0"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[#888888] text-sm text-center my-6">
                まだチェックポイントがありません。
              </p>
            )}
          </div>
        )}
      </main>

      {showCelebration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#F5F0E8] shadow-neumorphism rounded-2xl p-8 w-full max-w-sm text-center">
            <p className="text-5xl mb-3">🏆</p>
            <p className="font-display text-2xl font-bold text-[#2C2C2C] mb-1">
              クエストクリア！
            </p>
            <p className="text-sm text-[#5a5a5a] mb-4">
              「{quest.title}」を達成しました。伝説の冒険者の称号を獲得！
            </p>
            <div className="bg-[#F5F0E8] rounded-xl p-3 mb-6 text-sm text-[#2C2C2C] shadow-neumorphism-inset">
              <p>クリアしたチェックポイント: {quest.checkpoints.length}個</p>
              <p>
                かかった日数:{" "}
                {Math.max(
                  1,
                  Math.ceil(
                    (Date.now() - new Date(quest.created_at).getTime()) / (1000 * 60 * 60 * 24)
                  )
                )}
                日
              </p>
            </div>
            <button
              onClick={() => setShowCelebration(false)}
              className="flex items-center justify-center h-12 w-full rounded-xl bg-[#2D6A4F] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm mb-2"
            >
              ✅ このまま残す
            </button>
            <button
              onClick={handleTrashQuest}
              className="flex items-center justify-center h-12 w-full rounded-xl bg-[#E9A62A] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm"
            >
              🏆 クリア済みに入れる
            </button>
          </div>
        </div>
      )}

      <Mascot
        storageKey="quest_detail"
        steps={[
          "🗺️「マップ」タブでは、すごろく風にクエストの道のりが見えるよ。今いる場所が⚔️マークでわかるんだ。",
          "📋「一覧」タブでは、チェックポイントの追加・削除や、詳細の確認ができるよ。両方使い分けてみてね！",
        ]}
      />
    </div>
  );
}
