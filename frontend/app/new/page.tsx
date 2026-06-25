"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DiagnoseQuestion,
  RoadmapCheckpoint,
  createCheckpoint,
  createQuest,
  diagnose,
  generateRoadmap,
  proposeDeadline,
} from "@/lib/api";
import QuestLoading from "@/components/QuestLoading";

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

const inputClass = "w-full h-12 rounded-xl px-4 bg-[#F5F0E8] shadow-neumorphism-inset focus:outline-none";
const labelClass = "block text-xs font-bold text-[#2D6A4F] tracking-widest uppercase mb-1";
const primaryButtonClass =
  "flex items-center justify-center h-12 w-full rounded-xl bg-[#2D6A4F] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm";

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
  const [context, setContext] = useState("");

  // Step 2: diagnose questions + answers
  const [questions, setQuestions] = useState<DiagnoseQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

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
      const { questions } = await diagnose(goal, desiredDeadline, context || undefined);
      setQuestions(questions);
      setCurrentQuestionIndex(0);
      setStep("questions");
    } catch (e: any) {
      setError(e.response?.data?.detail || "診断質問の生成に失敗しました");
      setStep("input");
    }
  };

  const handleSelectAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
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
    <div className="min-h-screen bg-parchment">
      <header className="bg-[#2D6A4F] h-16 flex items-center">
        <div className="w-full max-w-md mx-auto px-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-sm text-white/80 hover:text-white transition">
            ← ダッシュボードに戻る
          </Link>
          <span className="font-display text-sm font-bold text-white">ProgressQuest</span>
        </div>
      </header>

      <div className="flex items-center justify-center p-4">
      <div className="bg-[#F5F0E8] shadow-neumorphism rounded-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#E9A62A] flex items-center justify-center text-2xl mb-3 shadow-neumorphism-sm">
            🗺️
          </div>
          <h1 className="font-display text-xl font-bold text-[#2D6A4F] text-center">
            新しいクエストを始める
          </h1>
          <p className="text-xs text-[#888888] tracking-widest uppercase mt-1">
            Quest Initiation
          </p>
        </div>

        {error && (
          <p className="text-[#E05252] text-sm mb-4 text-center bg-[#E05252]/10 rounded-lg py-2">
            {error}
          </p>
        )}

        {step === "choose" && (
          <div className="space-y-3">
            <button
              onClick={() => setStep("input")}
              className="w-full text-left bg-[#F5F0E8] rounded-xl p-4 shadow-neumorphism-sm hover:opacity-90 transition"
            >
              <p className="font-display font-bold text-[#2D6A4F]">🤖 AIで作る</p>
              <p className="text-xs text-[#5a5a5a] mt-1">
                目標を伝えるとAIが診断し、期日とロードマップを自動生成します
              </p>
            </button>
            <button
              onClick={() => setStep("manual")}
              className="w-full text-left bg-[#F5F0E8] rounded-xl p-4 shadow-neumorphism-sm hover:opacity-90 transition"
            >
              <p className="font-display font-bold text-[#2D6A4F]">✍️ 手動で作る</p>
              <p className="text-xs text-[#5a5a5a] mt-1">
                タイトル・説明・期日を自分で入力してすぐに作成します
              </p>
            </button>
          </div>
        )}

        {step === "manual" && (
          <>
            <div className="mb-4">
              <label className={labelClass}>⚔️ クエスト名</label>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className={inputClass}
                placeholder="例：Reactを習得する"
              />
            </div>
            <div className="mb-4">
              <label className={labelClass}>📜 詳細（任意）</label>
              <textarea
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className="w-full rounded-xl px-4 py-3 bg-[#F5F0E8] shadow-neumorphism-inset focus:outline-none"
                placeholder="目標の詳細"
                rows={3}
              />
            </div>
            <div className="mb-6">
              <label className={labelClass}>🏁 期日（任意）</label>
              <input
                type="date"
                value={manualDeadline}
                onChange={(e) => setManualDeadline(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              onClick={handleManualSubmit}
              disabled={manualSubmitting}
              className={`${primaryButtonClass} disabled:opacity-50`}
            >
              {manualSubmitting ? "作成中..." : "クエストを作成する ⚔️"}
            </button>
            <button
              onClick={() => setStep("choose")}
              className="w-full text-center mt-2 text-xs text-[#888888] hover:opacity-70"
            >
              ← 戻る
            </button>
          </>
        )}

        {step === "input" && (
          <>
            <div className="mb-4">
              <label className={labelClass}>⚔️ クエスト（目標）</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className={inputClass}
                placeholder="例：Reactを習得する"
              />
            </div>
            <div className="mb-4">
              <label className={labelClass}>🏁 希望期日</label>
              <input
                type="date"
                value={desiredDeadline}
                onChange={(e) => setDesiredDeadline(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="mb-6">
              <label className={labelClass}>📝 補足情報（任意）</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full rounded-xl px-4 py-3 bg-[#F5F0E8] shadow-neumorphism-inset focus:outline-none"
                placeholder="例：プログラミング未経験だけど絵を描くのは得意、平日は仕事で忙しい、など"
                rows={3}
              />
              <p className="text-xs text-[#888888] mt-1">
                書いておくとAIの診断・ロードマップの精度が上がります
              </p>
            </div>
            <button onClick={handleStartDiagnose} className={primaryButtonClass}>
              AIに診断してもらう ⚔️
            </button>
            <button
              onClick={() => setStep("choose")}
              className="w-full text-center mt-2 text-xs text-[#888888] hover:opacity-70"
            >
              ← 戻る
            </button>
          </>
        )}

        {step === "loading-diagnose" && (
          <QuestLoading label="AIが診断質問を考えています..." expectedSeconds={10} />
        )}
        {step === "loading-propose" && (
          <QuestLoading label="AIが現実的な期日を考えています..." expectedSeconds={10} />
        )}
        {step === "loading-roadmap" && (
          <QuestLoading label="AIがロードマップを作成しています..." expectedSeconds={12} />
        )}
        {step === "creating" && (
          <QuestLoading
            label="クエストを作成しています..."
            expectedSeconds={Math.max(4, checkpoints.length + 2)}
          />
        )}

        {step === "questions" && questions.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-[#2D6A4F] tracking-widest uppercase">現在地診断</p>
              <p className="text-xs text-[#888888] font-bold">
                質問 {currentQuestionIndex + 1} / {questions.length}
              </p>
            </div>
            <div className="w-full bg-[#e8e0d0] rounded-full h-2 mb-6 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                  background: "linear-gradient(90deg, #2D6A4F, #52B788)",
                }}
              />
            </div>

            <p className="font-bold text-base text-[#2C2C2C] mb-4">
              {questions[currentQuestionIndex].text}
            </p>
            <div className="space-y-2 mb-6">
              {questions[currentQuestionIndex].options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleSelectAnswer(questions[currentQuestionIndex].id, opt)}
                  className={`w-full text-left px-3 py-3 bg-[#F5F0E8] rounded-xl text-sm transition ${
                    answers[questions[currentQuestionIndex].id] === opt
                      ? "shadow-neumorphism-inset font-bold text-[#2D6A4F]"
                      : "shadow-neumorphism-sm hover:opacity-90 text-[#2C2C2C]"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                disabled={currentQuestionIndex === 0}
                className="text-xs text-[#888888] hover:opacity-70 disabled:opacity-0"
              >
                ← 前の質問
              </button>
              <p className="text-xs text-[#888888]">
                {currentQuestionIndex < questions.length - 1
                  ? `あと${questions.length - currentQuestionIndex - 1}問`
                  : "最後の質問です"}
              </p>
            </div>

            {currentQuestionIndex === questions.length - 1 &&
              answers[questions[currentQuestionIndex].id] && (
                <button onClick={handleSubmitAnswers} className={`${primaryButtonClass} mt-4`}>
                  診断結果を見る ⚔️
                </button>
              )}
          </>
        )}

        {step === "deadline" && (
          <>
            <p className="text-xs text-[#2D6A4F] tracking-widest uppercase mb-2">AIの診断結果</p>
            <p className="text-sm text-[#2C2C2C] italic mb-4">「{diagnosisSummary}」</p>

            <div className="bg-[#F5F0E8] rounded-xl p-4 mb-4 shadow-neumorphism-inset">
              <p className="text-xs font-bold text-[#E9A62A] mb-1">⚔️ AIの提案期日</p>
              <p className="font-display font-bold text-lg text-[#2C2C2C]">{proposedDeadline}</p>
              <p className="text-sm text-[#2C2C2C] mt-2">{reason}</p>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setCustomDeadline(false);
                  setFinalDeadline(proposedDeadline);
                }}
                className={`flex-1 h-12 bg-[#F5F0E8] rounded-xl text-sm font-bold transition ${
                  !customDeadline
                    ? "shadow-neumorphism-inset text-[#2D6A4F]"
                    : "shadow-neumorphism-sm text-[#888888]"
                }`}
              >
                この期日を採用する
              </button>
              <button
                onClick={() => setCustomDeadline(true)}
                className={`flex-1 h-12 bg-[#F5F0E8] rounded-xl text-sm font-bold transition ${
                  customDeadline
                    ? "shadow-neumorphism-inset text-[#2D6A4F]"
                    : "shadow-neumorphism-sm text-[#888888]"
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
                className={`${inputClass} mb-4`}
              />
            )}

            <button onClick={handleGenerateRoadmap} className={primaryButtonClass}>
              ロードマップを生成する ⚔️
            </button>
          </>
        )}

        {step === "roadmap" && (
          <>
            <p className="text-xs text-[#2D6A4F] tracking-widest uppercase mb-4">
              生成されたロードマップ（期日: {finalDeadline}）
            </p>
            <div className="space-y-2 mb-6 max-h-80 overflow-y-auto">
              {checkpoints.map((cp, i) => (
                <div key={i} className="bg-[#F5F0E8] rounded-xl px-3 py-2 shadow-neumorphism-sm">
                  <p className="font-bold text-sm text-[#2C2C2C]">
                    {cp.order_index}. {cp.title}
                  </p>
                  <p className="text-xs text-[#5a5a5a] mt-0.5">{cp.description}</p>
                  <p className="text-xs text-[#2D6A4F] mt-1">期日: {cp.due_date}</p>
                </div>
              ))}
            </div>
            <button onClick={handleCreateQuest} className={primaryButtonClass}>
              このクエストを始める ⚔️
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
