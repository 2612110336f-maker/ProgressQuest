"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMe, getQuest, getQuests, Quest, QuestDetail } from "@/lib/api";
import { getCheckpointStatuses, isOverdue } from "@/lib/questStatus";
import QuestMap from "@/components/QuestMap";

const ACTIVE_QUEST_KEY = "activeQuestId";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [questDetails, setQuestDetails] = useState<QuestDetail[]>([]);
  const [activeQuestId, setActiveQuestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    const [me, quests] = await Promise.all([getMe(), getQuests()]);
    setEmail(me.email);
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
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, []);

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

  const totalCompleted = questDetails
    .flatMap((q) => q.checkpoints)
    .filter((cp) => cp.completed_at).length;
  const level = Math.floor(totalCompleted / 5) + 1;
  const xp = totalCompleted * 100;

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
      <div className="min-h-screen bg-parchment flex items-center justify-center text-amber-800 font-display">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment">
      <header className="card-fantasy border-b border-border bg-card/65 backdrop-blur-md">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-8 py-4 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-lg shrink-0 shadow-[0_0_10px_rgba(108,99,255,0.4)]">
              📖
            </span>
            <h1 className="font-display text-lg font-bold text-slate-100">ProgressQuest</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-white bg-slate-800 border border-slate-700 rounded-full px-3 py-1 font-display shadow-[0_0_8px_rgba(255,255,255,0.05)]">
              ⚔️ レベル{level} ・ {xp}XP
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-danger transition font-display"
            >
              冒険をやめる
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <p className="text-xs text-slate-400">{email}</p>
          <Link
            href="/new"
            className="bg-primary hover:bg-opacity-90 text-white text-xs px-4 py-2 rounded-lg transition font-bold font-display shadow-md"
          >
            ＋ 新しいクエストを始める
          </Link>
        </div>

        {/* 経験値バー (レベル進行状況) */}
        <div className="card-fantasy rounded-2xl p-4 bg-card/40 border border-border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-350 uppercase tracking-widest font-display">
              Character Level (レベル {level})
            </span>
            <span className="text-xs font-bold text-slate-450 font-display">
              {xp % 500} / 500 XP (Next Level: Lvl {level + 1})
            </span>
          </div>
          <div className="w-full bg-slate-900/60 rounded-full h-3 border border-border overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
              style={{ width: `${((xp % 500) / 500) * 100}%` }}
            />
          </div>
        </div>

        {/* 進行中のクエストがない場合 */}
        {questDetails.length === 0 && (
          <div className="card-fantasy rounded-2xl p-8 text-center bg-card/20 border border-border/80">
            <p className="text-slate-400 mb-4">まだアクティブなクエストがありません。新しい冒険に出かけましょう！</p>
            <Link
              href="/new"
              className="inline-block bg-primary hover:bg-opacity-90 text-white px-5 py-2.5 rounded-lg transition font-bold font-display shadow-lg"
            >
              ＋ クエストを創生する ⚔️
            </Link>
          </div>
        )}

        {/* 最優先タスク (今日やるべきタスク) - 最上部に配置 */}
        {activeQuest && nextCheckpoint && (
          <div
            className={`rounded-2xl p-5 border shadow-xl relative overflow-hidden transition-all duration-300 ${
              isOverdue(nextCheckpoint.due_date)
                ? "bg-danger/10 border-danger text-slate-200"
                : "bg-secondary/15 border-secondary/40 text-slate-200"
            }`}
          >
            {/* 動くパルスインジケータ */}
            {isOverdue(nextCheckpoint.due_date) && (
              <span className="absolute top-4 right-4 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-danger"></span>
              </span>
            )}
            
            <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-350 rounded-full px-2.5 py-0.5 font-bold font-display uppercase tracking-wider">
              {isOverdue(nextCheckpoint.due_date) ? "⚠️ Critical Quest" : "⚔️ Next Objective (最優先タスク)"}
            </span>
            <div className="mt-3 flex justify-between items-start gap-4 flex-wrap">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-100">
                  {nextCheckpoint.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-display">
                  クエスト: <span className="font-bold text-slate-300">{activeQuest.title}</span>
                </p>
              </div>
              {nextCheckpoint.due_date && (
                <div className={`text-xs font-bold px-3 py-1 rounded-lg border font-display ${
                  isOverdue(nextCheckpoint.due_date) 
                    ? "bg-danger/20 border-danger/40 text-danger" 
                    : "bg-slate-900 border-border text-slate-450"
                }`}>
                  期日: {nextCheckpoint.due_date} {isOverdue(nextCheckpoint.due_date) && "(期日超過!)"}
                </div>
              )}
            </div>
            
            <div className="mt-4 flex gap-3">
              <Link
                href={`/quest/${activeQuest.id}`}
                className="bg-slate-850 hover:bg-slate-800 border border-border text-slate-300 text-xs px-4 py-2 rounded-lg font-display transition"
              >
                詳細を見る 📜
              </Link>
            </div>
          </div>
        )}

        {/* 進行中のクエストメインビュー */}
        {activeQuest && (
          <div className="card-fantasy rounded-2xl p-6 bg-card/30 border border-border space-y-6">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <span className="text-[10px] text-primary border border-primary/30 bg-primary/10 rounded-full px-2 py-0.5 font-bold tracking-wider font-display uppercase">
                  Active Campaign
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-100 mt-1">
                  {activeQuest.title}
                </h2>
                {activeQuest.description && (
                  <p className="text-xs text-slate-400 italic mt-1 font-serif">「{activeQuest.description}」</p>
                )}
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="text-xs text-slate-300 border border-border px-3 py-1.5 bg-slate-800/40 rounded-lg hover:bg-slate-800 transition font-display animate-pulse-slow"
              >
                別のクエストに切り替え 🛡️
              </button>
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-center">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-400 tracking-widest uppercase font-display">
                      Campaign Progress
                    </span>
                    <span className="text-xs font-bold text-success font-display">
                      {progressPercent.toFixed(0)}% ({completedCount} / {totalCount} 完了)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-3 border border-border overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary via-secondary to-success h-3 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {!nextCheckpoint && (
                  <div className="rounded-xl p-4 bg-success/20 border border-success/40 text-success font-bold text-center font-display">
                    🏆 このクエストのすべての試練をクリアしました！
                  </div>
                )}

                <Link
                  href={`/quest/${activeQuest.id}`}
                  className="block text-center bg-primary hover:bg-opacity-90 text-white py-2.5 rounded-lg transition font-bold font-display shadow-md text-sm"
                >
                  作戦地図を展開 🗺️
                </Link>
              </div>

              {mapItems.length > 0 && (
                <div className="bg-slate-900/40 border border-border rounded-xl p-4 mt-4 lg:mt-0 flex justify-center">
                  <QuestMap items={mapItems} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="card-fantasy rounded-2xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto bg-card/95 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold mb-4 text-slate-100">
              クエストを選ぶ
            </h3>
            <div className="space-y-2 mb-4">
              {questDetails.map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleSelectQuest(q.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition text-sm font-display ${
                    q.id === activeQuestId
                      ? "bg-primary/20 border-primary font-bold text-primary shadow-[0_0_8px_rgba(108,99,255,0.2)]"
                      : "bg-slate-800/40 border-border hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  {q.title}
                </button>
              ))}
            </div>
            <Link
              href="/new"
              className="block text-center bg-primary hover:bg-opacity-90 text-white py-2.5 rounded-lg transition font-bold font-display shadow-md text-sm"
            >
              ＋ 新しいクエストを始める
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
