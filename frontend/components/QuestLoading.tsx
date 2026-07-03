"use client";
import { useEffect, useState } from "react";
import RunnerGame from "@/components/RunnerGame";

const TIPS = [
  "⚔️ ヒント：チェックポイントはあとから編集・削除できます",
  "🗺️ ヒント：クエストはダッシュボードからいつでも切り替えられます",
  "🏆 ヒント：全チェックポイントをクリアすると称号がもらえます",
  "🗑️ ヒント：クリアしたクエストはクリア済みに入れて整理できます",
  "📝 ヒント：補足情報を書くとAIの診断精度が上がります",
];

type Props = {
  label: string;
  expectedSeconds: number;
};

export default function QuestLoading({ label, expectedSeconds }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Eases toward 90% over the expected duration; the parent unmounts this
  // (moving to the next step) once the real request actually finishes.
  const progress = Math.min(90, (elapsed / expectedSeconds) * 90);
  const remaining = Math.max(1, expectedSeconds - elapsed);

  return (
    <div className="text-center py-4">
      <p className="text-[#2D6A4F] font-display font-bold mb-3">{label}</p>

      <div className="w-full bg-[#e8e0d0] rounded-full h-2 mb-1 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #2D6A4F, #52B788)",
          }}
        />
      </div>
      <p className="text-xs text-[#888888] mb-4">
        経過 {elapsed}秒 ・ あと{remaining}秒ほど
      </p>

      <p className="text-xs text-[#2D6A4F] font-bold bg-[#F5F0E8] shadow-neumorphism-inset rounded-xl px-3 py-2 mb-4">
        {TIPS[tipIndex]}
      </p>

      <p className="text-xs text-[#888888] mb-2">🎮 待っている間に遊べます</p>
      <RunnerGame />
    </div>
  );
}
