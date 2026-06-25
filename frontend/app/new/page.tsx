"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DiagnoseQuestion,
  RoadmapCheckpoint,
  createCheckpoint,
  createQuest,
  diagnose,
  generateRoadmap,
  proposeDeadline,
} from "@/lib/api";

type Step =
  | "choose"
  | "manual"
  | "input"
  | "loading-diagnose"
  | "questions"
  | "loading-propose"
  | "deadline"
  | "loading-roadmap"
  | "roadmap"
  | "creating";

export default function NewQuestPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [error, setError] = useState("");

  // Manual creation
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualDeadline, setManualDeadline] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Step 1: goal + desired deadline
  const [goal, setGoal] = useState("");
  const [desiredDeadline, setDesiredDeadline] = useState("");

  // Step 2: diagnose questions + answers
  const [questions, setQuestions] = useState<DiagnoseQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Step 3: proposed deadline
  const [proposedDeadline, setProposedDeadline] = useState("");
  const [reason, setReason] = useState("");
  const [diagnosisSummary, setDiagnosisSummary] = useState("");
  const [finalDeadline, setFinalDeadline] = useState("");
  const [customDeadline, setCustomDeadline] = useState(false);

  // Step 4: generated roadmap
  const [checkpoints, setCheckpoints] = useState<RoadmapCheckpoint[]>([]);

  const handleManualSubmit = async () => {
    if (!manualTitle.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    setError("");
    setManualSubmitting(true);
    try {
      const quest = await createQuest({
        title: manualTitle,
        description: manualDescription || undefined,
        original_deadline: manualDeadline || undefined,
        final_deadline: manualDeadline || undefined,
      });
      router.push(`/quest/${quest.id}`);
    } catch (e: any) {
      setError(e.response?.data?.detail || "エラーが発生しました");
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleStartDiagnose = async () => {
    if (!goal.trim() || !desiredDeadline) {
      setError("目標と希望期日を入力してください");
      return;
    }
    setError("");
    setStep("loading-diagnose");
    try {
      const { questions } = await diagnose(goal, desiredDeadline);
      setQuestions(questions);
      setStep("questions");
    } catch (e: any) {
      setError(e.response?.data?.detail || "診断質問の生成に失敗しました");
      setStep("input");
    }
  };

  const handleSubmitAnswers = async () => {
    if (questions.some((q) => !answers[q.id])) {
      setError("すべての質問に回答してください");
      return;
    }
    setError("");
    setStep("loading-propose");
    try {
      const answerList = questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id],
      }));
      const result = await proposeDeadline(goal, desiredDeadline, answerList);
      setProposedDeadline(result.proposed_deadline);
      setReason(result.reason);
      setDiagnosisSummary(result.diagnosis_summary);
      setFinalDeadline(result.proposed_deadline);
      setStep("deadline");
    } catch (e: any) {
      setError(e.response?.data?.detail || "期日の提案に失敗しました");
      setStep("questions");
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!finalDeadline) {
      setError("期日を選択してください");
      return;
    }
    setError("");
    setStep("loading-roadmap");
    try {
      const result = await generateRoadmap(goal, finalDeadline, diagnosisSummary);
      setCheckpoints(result.checkpoints);
      setStep("roadmap");
    } catch (e: any) {
      setError(e.response?.data?.detail || "ロードマップの生成に失敗しました");
      setStep("deadline");
    }
  };

  const handleCreateQuest = async () => {
    setError("");
    setStep("creating");
    try {
      const quest = await createQuest({
        title: goal,
        description: diagnosisSummary,
        original_deadline: desiredDeadline,
        final_deadline: finalDeadline,
      });
      for (const cp of checkpoints) {
        await createCheckpoint(quest.id, {
          title: cp.title,
          description: cp.description,
          due_date: cp.due_date,
          order_index: cp.order_index,
        });
      }
      router.push(`/quest/${quest.id}`);
    } catch (e: any) {
      setError(e.response?.data?.detail || "クエストの作成に失敗しました");
      setStep("roadmap");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment p-4">
      <div className="card-fantasy rounded-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center text-2xl mb-3 shadow-inner">
            🗺️
          </div>
          <h1 className="font-display text-xl font-bold text-emerald-900 text-center">
            新しいクエストを始める
          </h1>
          <p className="text-xs text-amber-700 tracking-widest uppercase mt-1">
            Quest Initiation
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-4 text-center bg-red-50 border border-red-200 rounded-lg py-2">
            {error}
          </p>
        )}

        {step === "choose" && (
          <div className="space-y-3">
            <button
              onClick={() => setStep("input")}
              className="w-full text-left bg-amber-50/40 border border-amber-200 rounded-lg p-4 hover:bg-amber-100 transition"
            >
              <p className="font-display font-bold text-emerald-900">🤖 AIで作る</p>
              <p className="text-xs text-slate-500 mt-1">
                目標を伝えるとAIが診断し、期日とロードマップを自動生成します
              </p>
            </button>
            <button
              onClick={() => setStep("manual")}
              className="w-full text-left bg-amber-50/40 border border-amber-200 rounded-lg p-4 hover:bg-amber-100 transition"
            >
              <p className="font-display font-bold text-emerald-900">✍️ 手動で作る</p>
              <p className="text-xs text-slate-500 mt-1">
                タイトル・説明・期日を自分で入力してすぐに作成します
              </p>
            </button>
          </div>
        )}

        {step === "manual" && (
          <>
            <div className="mb-4">
              <label className="block text-xs font-bold text-amber-700 tracking-widest uppercase mb-1">
                ⚔️ クエスト名
              </label>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="w-full border border-amber-200 rounded-lg px-4 py-2 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="例：Reactを習得する"
              />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-bold text-amber-700 tracking-widest uppercase mb-1">
                📜 詳細（任意）
              </label>
              <textarea
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className="w-full border border-amber-200 rounded-lg px-4 py-2 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="目標の詳細"
                rows={3}
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-bold text-amber-700 tracking-widest uppercase mb-1">
                🏁 期日（任意）
              </label>
              <input
                type="date"
                value={manualDeadline}
                onChange={(e) => setManualDeadline(e.target.value)}
                className="w-full border border-amber-200 rounded-lg px-4 py-2 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={handleManualSubmit}
              disabled={manualSubmitting}
              className="w-full bg-amber-400 text-amber-950 font-bold py-3 rounded-lg hover:bg-amber-300 transition shadow-md disabled:opacity-50"
            >
              {manualSubmitting ? "作成中..." : "クエストを作成する ⚔️"}
            </button>
            <button
              onClick={() => setStep("choose")}
              className="w-full text-center mt-2 text-xs text-slate-400 hover:text-slate-600"
            >
              ← 戻る
            </button>
          </>
        )}

        {step === "input" && (
          <>
            <div className="mb-4">
              <label className="block text-xs font-bold text-amber-700 tracking-widest uppercase mb-1">
                ⚔️ クエスト（目標）
              </label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full border border-amber-200 rounded-lg px-4 py-2 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="例：Reactを習得する"
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs font-bold text-amber-700 tracking-widest uppercase mb-1">
                🏁 希望期日
              </label>
              <input
                type="date"
                value={desiredDeadline}
                onChange={(e) => setDesiredDeadline(e.target.value)}
                className="w-full border border-amber-200 rounded-lg px-4 py-2 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              onClick={handleStartDiagnose}
              className="w-full bg-amber-400 text-amber-950 font-bold py-3 rounded-lg hover:bg-amber-300 transition shadow-md"
            >
              AIに診断してもらう ⚔️
            </button>
            <button
              onClick={() => setStep("choose")}
              className="w-full text-center mt-2 text-xs text-slate-400 hover:text-slate-600"
            >
              ← 戻る
            </button>
          </>
        )}

        {(step === "loading-diagnose" ||
          step === "loading-propose" ||
          step === "loading-roadmap" ||
          step === "creating") && (
          <div className="text-center py-10">
            <p className="text-emerald-800 font-display font-bold animate-pulse">
              {step === "loading-diagnose" && "AIが診断質問を考えています..."}
              {step === "loading-propose" && "AIが現実的な期日を考えています..."}
              {step === "loading-roadmap" && "AIがロードマップを作成しています..."}
              {step === "creating" && "クエストを作成しています..."}
            </p>
          </div>
        )}

        {step === "questions" && (
          <>
            <p className="text-xs text-amber-700 tracking-widest uppercase mb-4">
              現在地診断
            </p>
            <div className="space-y-5 mb-6">
              {questions.map((q) => (
                <div key={q.id}>
                  <p className="font-bold text-sm text-slate-800 mb-2">{q.text}</p>
                  <div className="space-y-1">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${
                          answers[q.id] === opt
                            ? "bg-emerald-50 border-emerald-400 font-bold text-emerald-800"
                            : "bg-amber-50/40 border-amber-200 hover:bg-amber-100 text-slate-700"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleSubmitAnswers}
              className="w-full bg-amber-400 text-amber-950 font-bold py-3 rounded-lg hover:bg-amber-300 transition shadow-md"
            >
              診断結果を見る ⚔️
            </button>
          </>
        )}

        {step === "deadline" && (
          <>
            <p className="text-xs text-amber-700 tracking-widest uppercase mb-2">
              AIの診断結果
            </p>
            <p className="text-sm text-slate-600 italic mb-4">「{diagnosisSummary}」</p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-xs font-bold text-blue-500 mb-1">⚔️ AIの提案期日</p>
              <p className="font-display font-bold text-lg text-slate-800">
                {proposedDeadline}
              </p>
              <p className="text-sm text-slate-600 mt-2">{reason}</p>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setCustomDeadline(false);
                  setFinalDeadline(proposedDeadline);
                }}
                className={`flex-1 py-2 rounded-lg border text-sm font-bold transition ${
                  !customDeadline
                    ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                    : "bg-amber-50/40 border-amber-200 text-slate-600"
                }`}
              >
                この期日を採用する
              </button>
              <button
                onClick={() => setCustomDeadline(true)}
                className={`flex-1 py-2 rounded-lg border text-sm font-bold transition ${
                  customDeadline
                    ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                    : "bg-amber-50/40 border-amber-200 text-slate-600"
                }`}
              >
                自分で設定する
              </button>
            </div>

            {customDeadline && (
              <input
                type="date"
                value={finalDeadline}
                onChange={(e) => setFinalDeadline(e.target.value)}
                className="w-full border border-amber-200 rounded-lg px-4 py-2 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
              />
            )}

            <button
              onClick={handleGenerateRoadmap}
              className="w-full bg-amber-400 text-amber-950 font-bold py-3 rounded-lg hover:bg-amber-300 transition shadow-md"
            >
              ロードマップを生成する ⚔️
            </button>
          </>
        )}

        {step === "roadmap" && (
          <>
            <p className="text-xs text-amber-700 tracking-widest uppercase mb-4">
              生成されたロードマップ（期日: {finalDeadline}）
            </p>
            <div className="space-y-2 mb-6 max-h-80 overflow-y-auto">
              {checkpoints.map((cp, i) => (
                <div
                  key={i}
                  className="bg-amber-50/40 border border-amber-200 rounded-lg px-3 py-2"
                >
                  <p className="font-bold text-sm text-slate-800">
                    {cp.order_index}. {cp.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{cp.description}</p>
                  <p className="text-xs text-amber-700 mt-1">期日: {cp.due_date}</p>
                </div>
              ))}
            </div>
            <button
              onClick={handleCreateQuest}
              className="w-full bg-amber-400 text-amber-950 font-bold py-3 rounded-lg hover:bg-amber-300 transition shadow-md"
            >
              このクエストを始める ⚔️
            </button>
          </>
        )}
      </div>
    </div>
  );
}
