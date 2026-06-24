"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Stepper } from "@/components/ui/Stepper";
import {
  diagnose,
  proposeDeadline,
  generateRoadmap,
  createQuest,
  createCheckpoint,
  AIQuestion,
  AICheckpointProposal,
} from "@/lib/api";

const STEPS = ["目標入力", "AI診断", "期限確認", "ロードマップ生成"];

// フロントエンド単体で動作させるためのダミーデータ
const MOCK_QUESTIONS: AIQuestion[] = [
  {
    id: "q1",
    text: "この目標に関する現在の知識レベルはどのくらいですか？",
    options: ["全くの初心者", "基礎知識はある", "実務・実践経験がある"],
  },
  {
    id: "q2",
    text: "この目標達成のために、1日あたりどれくらいの時間を割けますか？",
    options: ["30分未満", "1〜2時間", "3時間以上"],
  },
  {
    id: "q3",
    text: "過去に似たような目標に挑戦したことはありますか？",
    options: ["初めて挑戦する", "挫折した経験がある", "別の目標なら達成したことがある"],
  },
  {
    id: "q4",
    text: "学習や作業の途中で最も挫折しやすい要因は何ですか？",
    options: ["モチベーションの低下", "時間の確保が難しい", "分からない部分で行き詰まる"],
  },
  {
    id: "q5",
    text: "このクエストをクリアしたとき、自分にどんなご褒美をあげたいですか？",
    options: ["欲しかったものを買う", "美味しいものを食べる", "達成感だけで十分！"],
  },
];

export default function NewQuestPage() {
  const router = useRouter();

  // State
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: 目標 & 希望期日
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [desiredDeadline, setDesiredDeadline] = useState("");

  // Step 2: 診断質問 & 回答
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Step 3: AI提案期日 & 診断サマリー
  const [proposedDeadline, setProposedDeadline] = useState("");
  const [reason, setReason] = useState("");
  const [diagnosisSummary, setDiagnosisSummary] = useState("");
  const [finalDeadline, setFinalDeadline] = useState("");

  // Step 4: 提案されたチェックポイント
  const [checkpoints, setCheckpoints] = useState<AICheckpointProposal[]>([]);

  // API呼出 (Step 1 -> Step 2)
  const handleStartDiagnosis = async () => {
    if (!title.trim()) {
      setError("目標（クエスト名）を入力してください");
      return;
    }
    if (!desiredDeadline) {
      setError("希望期日を選択してください");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // API接続
      const res = await diagnose(title, desiredDeadline);
      setQuestions(res.questions.length > 0 ? res.questions : MOCK_QUESTIONS);
      setStep(2);
    } catch (e: any) {
      console.warn("API呼び出しに失敗したため、モックデータで継続します", e);
      // Fallback
      setQuestions(MOCK_QUESTIONS);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // API呼出 (Step 2 -> Step 3)
  const handleProposeDeadline = async () => {
    // 全て回答しているかチェック
    const unanswered = questions.some((q) => !answers[q.id]);
    if (unanswered) {
      setError("すべての質問に回答してください");
      return;
    }
    setError("");
    setLoading(true);

    const formattedAnswers = Object.entries(answers).map(([question_id, answer]) => ({
      question_id,
      answer,
    }));

    try {
      const res = await proposeDeadline(title, desiredDeadline, formattedAnswers);
      setProposedDeadline(res.proposed_deadline);
      setReason(res.reason);
      setDiagnosisSummary(res.diagnosis_summary);
      setFinalDeadline(res.proposed_deadline);
      setStep(3);
    } catch (e: any) {
      console.warn("API呼び出しに失敗したため、モックデータで継続します", e);
      // Fallback
      const date = new Date(desiredDeadline || Date.now());
      date.setDate(date.getDate() + 14); // 2週間延ばす
      const formattedDate = date.toISOString().split("T")[0];

      setProposedDeadline(formattedDate);
      setReason(
        "現在の習熟度と確保可能な時間から算出すると、基礎習得とアウトプット作成にそれぞれ1週間ずつの猶予を持たせることで、挫折率を大幅に下げて確実にクリア可能です。"
      );
      setDiagnosisSummary(
        `目標「${title}」に対する診断結果：初学者としての丁寧なステップアップと、日々の着実なタスク消化が必要です。`
      );
      setFinalDeadline(formattedDate);
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  // API呼出 (Step 3 -> Step 4)
  const handleGenerateRoadmap = async () => {
    if (!finalDeadline) {
      setError("最終期日を選択してください");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await generateRoadmap(title, finalDeadline, diagnosisSummary);
      setCheckpoints(res.checkpoints);
      setStep(4);
    } catch (e: any) {
      console.warn("API呼び出しに失敗したため、モックデータで継続します", e);
      // Fallback: 5つのチェックポイントを自動生成
      const mockCps: AICheckpointProposal[] = [
        {
          title: "基礎知識のインプットと環境構築",
          description: "必要なツールを準備し、全体像と基礎のインプットを完了する。",
          due_date: getIntermediateDate(desiredDeadline, 1, 5),
          order_index: 1,
        },
        {
          title: "簡単なモック・プロトタイプの作成",
          description: "学んだ内容を元に、小さな機能やサンプルを動かしてみる。",
          due_date: getIntermediateDate(desiredDeadline, 2, 5),
          order_index: 2,
        },
        {
          title: "応用技術の実装とコア機能の完成",
          description: "最も重要で複雑なパートに取り組み、形にする。",
          due_date: getIntermediateDate(desiredDeadline, 3, 5),
          order_index: 3,
        },
        {
          title: "最終調整・デバッグとテスト",
          description: "全体を動かしバグを潰す。必要に応じてデプロイを行う。",
          due_date: getIntermediateDate(desiredDeadline, 4, 5),
          order_index: 4,
        },
        {
          title: "クエストクリアとリファクタリング",
          description: "コードを整理し、自分へのご褒美とともに目標達成を宣言する！",
          due_date: finalDeadline,
          order_index: 5,
        },
      ];
      setCheckpoints(mockCps);
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  // 最終確定 & 保存
  const handleConfirmSave = async () => {
    setLoading(true);
    try {
      // 1. クエストを作成
      const newQuest = await createQuest({
        title,
        description: description || diagnosisSummary || undefined,
        original_deadline: desiredDeadline || undefined,
        final_deadline: finalDeadline || undefined,
      });

      // 2. チェックポイントを順番に登録
      for (const cp of checkpoints) {
        await createCheckpoint(newQuest.id, {
          title: cp.title,
          description: cp.description || undefined,
          due_date: cp.due_date || undefined,
          order_index: cp.order_index,
        });
      }

      // 詳細画面にリダイレクト
      router.push(`/quest/${newQuest.id}`);
    } catch (e: any) {
      setError("クエストの保存に失敗しました。");
      setLoading(false);
    }
  };

  // 日付計算ヘルパー
  const getIntermediateDate = (targetDateStr: string, stepNum: number, totalSteps: number) => {
    const start = new Date();
    const end = new Date(targetDateStr || Date.now());
    const diffTime = Math.max(0, end.getTime() - start.getTime());
    const stepMs = diffTime / totalSteps;
    const currentMs = start.getTime() + stepMs * stepNum;
    return new Date(currentMs).toISOString().split("T")[0];
  };

  const handleSelectOption = (qId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  // アニメーション設定
  const slideVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.3 } },
  };

  return (
    <div className="min-h-screen flex flex-col bg-parchment py-8 px-4 sm:px-6 justify-center items-center">
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* RPGヘッダーデコレーション */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-success" />

        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-2xl mb-3 shadow-[0_0_15px_rgba(108,99,255,0.4)]">
            🗺️
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-emerald-100 text-center">
            クエストを創生する
          </h1>
          <p className="text-[10px] text-slate-400 tracking-widest uppercase mt-0.5">
            Quest Initiation
          </p>
        </div>

        {/* ステッパー */}
        <Stepper currentStep={step} steps={STEPS} />

        {error && (
          <div className="text-danger text-sm mb-4 text-center bg-danger/10 border border-danger/30 rounded-lg py-2">
            {error}
          </div>
        )}

        {/* フォーム切り替え (AnimatePresence) */}
        <div className="mt-6 min-h-[300px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                variants={slideVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
                    ⚔️ 達成したい目標
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-2 bg-slate-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    placeholder="例: Reactを基礎からマスターする"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
                    📜 目標の補足・詳細 (任意)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-2 bg-slate-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    placeholder="詳細な目標設定、合格したい試験、作りたいアプリなど"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
                    🏁 希望する期日
                  </label>
                  <input
                    type="date"
                    value={desiredDeadline}
                    onChange={(e) => setDesiredDeadline(e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-2 bg-slate-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleStartDiagnosis}
                    disabled={loading}
                    className="w-full bg-primary hover:bg-opacity-90 text-white font-bold font-display py-3 rounded-lg transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? "診断中..." : "AI診断を開始 ⚔️"}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                variants={slideVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-5"
              >
                <div className="bg-slate-900/40 p-4 border border-border rounded-xl">
                  <p className="text-xs text-primary font-bold tracking-widest uppercase mb-1">
                    AI Diagnosis
                  </p>
                  <h3 className="text-xs text-slate-400">
                    あなたの現在地を正しく診断するために、以下の質問にお答えください。
                  </h3>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {questions.map((q) => (
                    <div key={q.id} className="border border-border/60 rounded-lg p-3 bg-slate-900/20">
                      <p className="text-xs font-bold text-slate-200 mb-2">{q.text}</p>
                      <div className="grid grid-cols-1 gap-2">
                        {q.options.map((opt) => {
                          const isSelected = answers[q.id] === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => handleSelectOption(q.id, opt)}
                              className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                                isSelected
                                  ? "bg-primary/20 border-primary text-primary font-bold"
                                  : "bg-slate-800/40 border-border text-slate-400 hover:bg-slate-800"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 bg-slate-800 border border-border text-slate-300 font-bold py-2.5 rounded-lg hover:bg-slate-700 transition"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleProposeDeadline}
                    disabled={loading}
                    className="flex-1 bg-success text-white font-bold py-2.5 rounded-lg hover:bg-opacity-90 transition shadow-md disabled:opacity-50"
                  >
                    {loading ? "提案を算出中..." : "期日を提案してもらう 🔮"}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                variants={slideVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <div className="bg-slate-900/40 p-4 border border-border rounded-xl space-y-3">
                  <div>
                    <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 rounded-full px-2.5 py-0.5 font-bold font-display">
                      AI 診断サマリー
                    </span>
                    <p className="text-xs text-slate-300 mt-2 font-serif italic">
                      「{diagnosisSummary}」
                    </p>
                  </div>
                </div>

                <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-4 space-y-2">
                  <span className="text-xs text-secondary font-bold">🔮 AI提案期日</span>
                  <div className="text-2xl font-bold font-display text-success">
                    {proposedDeadline}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    <strong className="text-slate-300">根拠:</strong> {reason}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1">
                    🏁 最終決定期日
                  </label>
                  <input
                    type="date"
                    value={finalDeadline}
                    onChange={(e) => setFinalDeadline(e.target.value)}
                    className="w-full border border-border rounded-lg px-4 py-2 bg-slate-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    ※AIの提案を参考に微調整して決定できます。
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 bg-slate-800 border border-border text-slate-300 font-bold py-2.5 rounded-lg hover:bg-slate-700 transition"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleGenerateRoadmap}
                    disabled={loading}
                    className="flex-1 bg-primary text-white font-bold py-2.5 rounded-lg hover:bg-opacity-90 transition shadow-md disabled:opacity-50 animate-bounce-subtle"
                  >
                    {loading ? "生成中..." : "ロードマップを生成 🗺️"}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                variants={slideVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                <div className="bg-success/10 border border-success/30 p-3 rounded-lg text-center">
                  <p className="text-xs text-success font-bold font-display">
                    🏆 AIによるロードマップ生成が完了しました！
                  </p>
                </div>

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {checkpoints.map((cp) => (
                    <div
                      key={cp.order_index}
                      className="border border-border/80 rounded-xl p-3 bg-slate-900/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 font-display">
                          CHECKPOINT {cp.order_index}
                        </span>
                        {cp.due_date && (
                          <span className="text-[10px] text-slate-400 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5">
                            {cp.due_date}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-slate-200 mt-1 font-display">
                        {cp.title}
                      </h4>
                      {cp.description && (
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {cp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 bg-slate-800 border border-border text-slate-300 font-bold py-2.5 rounded-lg hover:bg-slate-700 transition"
                  >
                    戻る
                  </button>
                  <button
                    onClick={handleConfirmSave}
                    disabled={loading}
                    className="flex-1 bg-success text-white font-bold py-2.5 rounded-lg hover:bg-opacity-90 transition shadow-md disabled:opacity-50"
                  >
                    {loading ? "保存中..." : "このロードマップで冒険を開始！ ⚔️"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
