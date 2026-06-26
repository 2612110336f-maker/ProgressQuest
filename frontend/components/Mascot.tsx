"use client";
import { useEffect, useState } from "react";

type Props = {
  storageKey: string;
  steps: string[];
};

export default function Mascot({ storageKey, steps }: Props) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(`mascot_seen_${storageKey}`);
    if (!seen) {
      setVisible(true);
    }
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(`mascot_seen_${storageKey}`, "1");
    setVisible(false);
  };

  const handleNext = () => {
    if (index < steps.length - 1) {
      setIndex((i) => i + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-40">
      <div className="bg-[#F5F0E8] shadow-neumorphism rounded-2xl p-4 flex items-start gap-3">
        <span className="text-3xl shrink-0">🦉</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#2C2C2C] mb-3">{steps[index]}</p>
          <div className="flex items-center justify-between">
            <button
              onClick={dismiss}
              className="text-xs text-[#888888] hover:opacity-70"
            >
              スキップ
            </button>
            <button
              onClick={handleNext}
              className="h-8 px-4 rounded-lg bg-[#2D6A4F] text-white text-xs font-bold hover:opacity-90 transition shadow-neumorphism-sm"
            >
              {index < steps.length - 1 ? "次へ" : "わかった！"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
