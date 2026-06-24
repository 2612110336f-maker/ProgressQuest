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
      <div className="min-h-screen bg-amber-50 flex items-center justify-center text-slate-500">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-8 py-4 flex flex-wrap justify-between items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">ProgressQuest</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-amber-600">
              ⚔️ レベル{level} ・ {xp}XP
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-red-500 transition"
            >
              冒険をやめる
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl lg:max-w-5xl mx-auto p-4 sm:p-8">
        <p className="text-sm text-slate-500 mb-4">{email}</p>

        {questDetails.length === 0 && (
          <div className="bg-white border border-amber-200 rounded-xl p-8 text-center">
            <p className="text-slate-500 mb-4">まだクエストがありません。</p>
            <Link
              href="/new"
              className="inline-block bg-green-500 text-white px-5 py-2 rounded-lg hover:bg-green-600 transition font-bold"
            >
              ＋ 新しいクエストを始める
            </Link>
          </div>
        )}

        {activeQuest && (
          <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3 gap-2">
              <h2 className="text-xl font-bold text-slate-800">{activeQuest.title}</h2>
              <button
                onClick={() => setShowModal(true)}
                className="text-xs text-slate-600 border border-amber-200 px-3 py-1 rounded-lg hover:bg-amber-50 transition shrink-0"
              >
                クエストを切り替える
              </button>
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:gap-6">
              <div>
                <div className="w-full bg-slate-100 rounded-full h-3 mb-2">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  {completedCount} / {totalCount} 完了
                </p>

                {nextCheckpoint ? (
                  <div
                    className={`rounded-lg p-4 ${
                      isOverdue(nextCheckpoint.due_date)
                        ? "bg-red-50 text-red-500"
                        : "bg-blue-50 text-blue-500"
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
                  <div className="rounded-lg p-4 bg-green-50 text-green-500 font-bold text-center">
                    🏆 クエストクリア！
                  </div>
                )}

                <Link
                  href={`/quest/${activeQuest.id}`}
                  className="block text-center mt-4 bg-amber-400 text-white py-2 rounded-lg hover:bg-amber-500 transition font-bold"
                >
                  地図を見る
                </Link>
              </div>

              {mapItems.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-4 lg:mt-0 max-w-xs mx-auto lg:max-w-sm">
                  <QuestMap items={mapItems} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4 text-slate-800">クエストを選ぶ</h3>
            <div className="space-y-2 mb-4">
              {questDetails.map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleSelectQuest(q.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                    q.id === activeQuestId
                      ? "bg-green-50 border-green-400 font-bold text-green-700"
                      : "bg-amber-50 border-amber-200 hover:bg-amber-100 text-slate-700"
                  }`}
                >
                  {q.title}
                </button>
              ))}
            </div>
            <Link
              href="/new"
              className="block text-center bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition font-bold"
            >
              ＋ 新しいクエストを始める
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
