"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  createLineLinkCode,
  deleteQuest,
  getLineStatus,
  getMe,
  getQuest,
  getQuests,
  Quest,
  QuestDetail,
} from "@/lib/api";
import { getCheckpointStatuses, isOverdue } from "@/lib/questStatus";
import QuestMap from "@/components/QuestMap";
import QuestMapSimple from "@/components/QuestMapSimple";
import WeeklyTimeline from "@/components/WeeklyTimeline";
import Mascot from "@/components/Mascot";
import { useTheme } from "@/lib/theme";

const ACTIVE_QUEST_KEY = "activeQuestId";

export default function DashboardPage() {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState("");
  const [questDetails, setQuestDetails] = useState<QuestDetail[]>([]);
  const [activeQuestId, setActiveQuestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);
  const [lineLinked, setLineLinked] = useState(false);
  const [lineCode, setLineCode] = useState<string | null>(null);
  const [lineLoading, setLineLoading] = useState(false);

  const load = async () => {
    const me = await getMe();
    setEmail(me.email);

    const quests = await getQuests();
    const details = await Promise.all(quests.map((q: Quest) => getQuest(q.id)));
    setQuestDetails(details);

    const savedId = localStorage.getItem(ACTIVE_QUEST_KEY);
    const fallbackId = details[0]?.id ?? null;
    const validId = details.some((d) => d.id === savedId) ? savedId : fallbackId;
    setActiveQuestId(validId);
    if (validId) localStorage.setItem(ACTIVE_QUEST_KEY, validId);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    load()
      .catch((error: unknown) => {
        if (typeof error === "object" && error !== null && "response" in error) {
          const response = error.response as { status?: number };
          if (response.status === 401) {
            router.push("/login");
          }
        }
      })
      .finally(() => setLoading(false));
    getLineStatus()
      .then((res) => setLineLinked(res.linked))
      .catch(() => {});
  }, []);

  const handleOpenLineModal = async () => {
    setShowLineModal(true);
    if (!lineLinked && !lineCode) {
      setLineLoading(true);
      try {
        const res = await createLineLinkCode();
        setLineCode(res.code);
      } finally {
        setLineLoading(false);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem(ACTIVE_QUEST_KEY);
    router.push("/login");
  };

  const handleSelectQuest = (id: string) => {
    setActiveQuestId(id);
    localStorage.setItem(ACTIVE_QUEST_KEY, id);
    setShowModal(false);
  };

  const handleDeleteQuest = async (id: string) => {
    if (!confirm("このクエストを削除しますか？")) return;
    try {
      await deleteQuest(id);
      const updatedDetails = questDetails.filter((q) => q.id !== id);
      setQuestDetails(updatedDetails);
      if (activeQuestId === id) {
        const nextActiveId = updatedDetails[0]?.id ?? null;
        setActiveQuestId(nextActiveId);
        if (nextActiveId) {
          localStorage.setItem(ACTIVE_QUEST_KEY, nextActiveId);
        } else {
          localStorage.removeItem(ACTIVE_QUEST_KEY);
        }
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || "クエストの削除に失敗しました。");
    }
  };

  // レベル/XPは計算だけ裏で続け、表示は止めたまま（ユーザー指示）
  const totalCompleted = questDetails
    .flatMap((q) => q.checkpoints)
    .filter((cp) => cp.completed_at).length;
  const level = Math.floor(totalCompleted / 5) + 1;
  const xp = totalCompleted * 100;
  void level;
  void xp;

  const activeQuest = questDetails.find((q) => q.id === activeQuestId) ?? null;
  const sortedCheckpoints = activeQuest
    ? [...activeQuest.checkpoints].sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
      )
    : [];
  const completedCount = sortedCheckpoints.filter((cp) => cp.completed_at).length;
  const totalCount = sortedCheckpoints.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const nextCheckpoint = sortedCheckpoints.find((cp) => !cp.completed_at) ?? null;
  const mapItems = activeQuest ? getCheckpointStatuses(activeQuest.checkpoints) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment flex items-center justify-center text-[#2D6A4F] font-display">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <header className="bg-[#2D6A4F] h-16 flex items-center">
        <div className="w-full max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-8 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
              <Image src="/icon-source.png" alt="ProgressQuest" width={36} height={36} className="w-full h-full object-cover" />
            </span>
            <h1 className="font-display text-lg font-bold text-white">ProgressQuest</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleOpenLineModal}
              className="text-sm text-white/80 hover:text-white transition"
            >
              {lineLinked ? "🔔 LINE連携済み" : "🔔 LINE通知"}
            </button>
            <Link href="/trash" className="text-sm text-white/80 hover:text-white transition">
              🏆 クリア済み
            </Link>
            <button
              onClick={toggle}
              className="text-sm text-white/80 hover:text-white transition"
              title={theme === "fantasy" ? "シンプルモードに切り替え" : "ファンタジーモードに切り替え"}
            >
              {theme === "fantasy" ? "📋 シンプル" : "⚔️ ファンタジー"}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-white/80 hover:text-white transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-5xl mx-auto p-4 sm:p-8">
        <div className="flex justify-between items-center mb-4 gap-2">
          <p className="text-sm text-[#888888]">{email}</p>
          {questDetails.length > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 h-9 px-3 text-xs rounded-xl bg-[#F5F0E8] text-[#2D6A4F] font-bold hover:opacity-90 transition shrink-0 shadow-neumorphism-sm"
            >
              <span className="truncate max-w-[10rem]">📜 {activeQuest?.title ?? "クエストを選ぶ"}</span>
              <span aria-hidden>▾</span>
            </button>
          )}
        </div>

        {questDetails.length === 0 && (
          <div className="bg-[#F5F0E8] shadow-neumorphism rounded-2xl p-8 text-center">
            <p className="text-[#888888] mb-4">まだクエストがありません。</p>
            <Link
              href="/new"
              className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-[#E9A62A] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm"
            >
              ＋ 新しいクエストを始める
            </Link>
          </div>
        )}

        {activeQuest && (
          <div className="bg-[#F5F0E8] shadow-neumorphism rounded-2xl p-5">
            <h2 className="font-display text-xl font-bold text-[#2C2C2C] mb-1">
              {activeQuest.title}
            </h2>
            {activeQuest.description && (
              <p className="text-xs text-[#5a5a5a] italic mb-3">「{activeQuest.description}」</p>
            )}

            <div className="lg:grid lg:grid-cols-2 lg:gap-6">
              <div>
                <p className="text-xs font-bold text-[#2D6A4F] tracking-widest uppercase mb-1">
                  Quest Progress
                </p>
                <div className="w-full bg-[#e8e0d0] rounded-full h-3 mb-2 overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${progressPercent}%`,
                      background: "linear-gradient(90deg, #2D6A4F, #52B788)",
                    }}
                  />
                </div>
                <p className="text-xs text-[#888888] mb-4">
                  {completedCount} / {totalCount} 完了
                </p>

                {nextCheckpoint ? (
                  <div
                    className={`rounded-xl p-4 ${
                      isOverdue(nextCheckpoint.due_date)
                        ? "bg-[#E05252]/10 text-[#E05252]"
                        : "bg-[#2D6A4F]/10 text-[#2D6A4F]"
                    }`}
                  >
                    <p className="text-xs font-bold mb-1">
                      {isOverdue(nextCheckpoint.due_date)
                        ? "⚠️ 危険：期日超過"
                        : "⚔️ 次にやるべきこと"}
                    </p>
                    <p className="font-bold">{nextCheckpoint.title}</p>
                    {nextCheckpoint.due_date && (
                      <p className="text-xs opacity-80 mt-1">期日: {nextCheckpoint.due_date}</p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl p-4 bg-[#4CAF50]/10 text-[#4CAF50] font-bold text-center">
                    🏆 クエストクリア！
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <Link
                    href={`/quest/${activeQuest.id}`}
                    className="flex-1 flex items-center justify-center h-12 rounded-xl bg-[#2D6A4F] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm"
                  >
                    地図を見る
                  </Link>
                  <button
                    onClick={() => handleDeleteQuest(activeQuest.id)}
                    className="h-12 px-5 rounded-xl bg-[#E05252] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm text-sm"
                  >
                    削除
                  </button>
                </div>
              </div>

              {mapItems.length > 0 && (
                <div className={`bg-[#EEF5EE] rounded-xl p-2 mt-4 lg:mt-0 max-w-xs mx-auto lg:max-w-sm max-h-[75vh] overflow-auto${theme === "fantasy" ? " border-[3px] border-[#2D6A4F]/50 shadow-[inset_0_0_10px_rgba(45,106,79,0.08),0_4px_16px_rgba(45,106,79,0.18)]" : ""}`}>
                  {theme === "fantasy" ? (
                    <QuestMap items={mapItems} viewMode="focus-current" interactive />
                  ) : (
                    <QuestMapSimple items={mapItems} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {questDetails.length > 0 && (
          <div className="mt-6">
            <WeeklyTimeline quests={questDetails} />
          </div>
        )}
      </main>

      <Mascot
        storageKey="dashboard"
        steps={[
          "ようこそ、冒険者！ここProgressQuestは、目標をRPGのクエストのように管理できる場所だよ。",
          "「クエストを切り替える」からいつでも別の目標に切り替えられるし、まずは新しいクエストを作ってみよう。",
          "「📅 今週のタスク」では、複数のクエストをまとめて今週やるべきことが見えるよ。困ったらまたここに相談してね！",
        ]}
      />

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[#F5F0E8] shadow-neumorphism rounded-2xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold mb-4 text-[#2C2C2C]">
              クエストを選ぶ
            </h3>
            <div className="space-y-2 mb-4">
              {questDetails.map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleSelectQuest(q.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition ${
                    q.id === activeQuestId
                      ? "bg-[#2D6A4F]/10 font-bold text-[#2D6A4F] shadow-neumorphism-inset"
                      : "bg-[#F5F0E8] text-[#2C2C2C] shadow-neumorphism-sm hover:opacity-90"
                  }`}
                >
                  {q.title}
                </button>
              ))}
            </div>
            <Link
              href="/new"
              className="flex items-center justify-center h-12 rounded-xl bg-[#E9A62A] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm"
            >
              ＋ 新しいクエストを始める
            </Link>
          </div>
        </div>
      )}

      {showLineModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setShowLineModal(false)}
        >
          <div
            className="bg-[#F5F0E8] shadow-neumorphism rounded-2xl p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold mb-4 text-[#2C2C2C]">
              🔔 LINE通知連携
            </h3>

            {lineLinked ? (
              <p className="text-sm text-[#2D6A4F] font-bold">
                連携済みです。期日を過ぎたチェックポイントがあると、次回ログイン時にLINEでお知らせします。
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[#5a5a5a]">
                  以下の手順でLINE通知を有効にできます。
                </p>
                <ol className="text-sm text-[#2C2C2C] list-decimal list-inside space-y-2">
                  <li>ProgressQuestのLINE公式アカウントを友だち追加する</li>
                  <li>下の連携コードをそのままLINEでメッセージ送信する</li>
                </ol>
                <div className="bg-[#F5F0E8] shadow-neumorphism-inset rounded-xl p-4 text-center">
                  {lineLoading ? (
                    <p className="text-sm text-[#888888]">発行中...</p>
                  ) : (
                    <p className="font-display text-2xl font-bold tracking-widest text-[#2D6A4F]">
                      {lineCode ?? "----"}
                    </p>
                  )}
                </div>
                <a
                  href="https://line.me/R/ti/p/@555grfji"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-12 rounded-xl bg-[#06C755] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm"
                >
                  LINEで友だち追加する
                </a>
              </div>
            )}

            <button
              onClick={() => setShowLineModal(false)}
              className="w-full text-center mt-4 text-xs text-[#888888] hover:opacity-70"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
