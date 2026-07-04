"use client";
import { useEffect, useState, useRef } from "react";
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

const getStorageKeyFromLabel = (label: string): string => {
  if (label.includes("診断")) return "pq_time_diagnose";
  if (label.includes("期日")) return "pq_time_propose";
  if (label.includes("ロードマップ")) return "pq_time_roadmap";
  return "pq_time_default";
};

export default function QuestLoading({ label, expectedSeconds }: Props) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [dynamicExpectedSeconds, setDynamicExpectedSeconds] = useState(expectedSeconds);
  const elapsedRef = useRef(0);

  // Load historical duration from localStorage to set dynamicExpectedSeconds
  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = getStorageKeyFromLabel(label);
      const saved = localStorage.getItem(key);
      if (saved) {
        const savedVal = parseFloat(saved);
        if (savedVal > 1.5) {
          setDynamicExpectedSeconds(savedVal);
        }
      }
    }
  }, [label]);

  // Main 100ms timer loop
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const elapsed = elapsedMs / 1000;

  // Keep a mutable ref of the elapsed time for cleanup capture
  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  // Save the actual elapsed duration on unmount using an exponential moving average (EMA)
  useEffect(() => {
    return () => {
      const finalElapsed = elapsedRef.current;
      // Filter out transient errors/instant aborts
      if (finalElapsed > 1.5) {
        const key = getStorageKeyFromLabel(label);
        if (typeof window !== "undefined") {
          const prevEstimate = localStorage.getItem(key);
          let newEstimate = finalElapsed;
          if (prevEstimate) {
            const prev = parseFloat(prevEstimate);
            // Apply 70% weight to historical estimation and 30% to current run
            newEstimate = prev * 0.7 + finalElapsed * 0.3;
          }
          localStorage.setItem(key, newEstimate.toFixed(1));
        }
      }
    };
  }, [label]);

  // Tips cycling timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Eases toward 90% over the dynamic expected duration, then slows down asymptotically
  const progress = elapsed < dynamicExpectedSeconds
    ? (elapsed / dynamicExpectedSeconds) * 90
    : 90 + (8 * (elapsed - dynamicExpectedSeconds)) / (elapsed - dynamicExpectedSeconds + 15);

  // Dynamic remaining time calculation (Integer-only, monotonic decrease to 1)
  let remaining: number;
  if (elapsed < dynamicExpectedSeconds - 3) {
    remaining = Math.ceil(dynamicExpectedSeconds - elapsed);
  } else {
    const t = elapsed - (dynamicExpectedSeconds - 3);
    const R = 3 / (1 + t / 10);
    remaining = Math.ceil(R);
  }

  return (
    <div className="text-center py-4">
      <p className="text-[#2D6A4F] font-display font-bold mb-3">{label}</p>

      <div className="w-full bg-[#e8e0d0] rounded-full h-2 mb-1 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-100"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #2D6A4F, #52B788)",
          }}
        />
      </div>
      <p className="text-xs text-[#888888] mb-4">
        経過 {Math.floor(elapsed)}秒 ・ あと{remaining}秒ほど
      </p>

      <p className="text-xs text-[#2D6A4F] font-bold bg-[#F5F0E8] shadow-neumorphism-inset rounded-xl px-3 py-2 mb-4">
        {TIPS[tipIndex]}
      </p>

      <p className="text-xs text-[#888888] mb-2">🎮 待っている間に遊べます</p>
      <RunnerGame />
    </div>
  );
}
