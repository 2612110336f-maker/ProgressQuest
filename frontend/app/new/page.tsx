"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createQuest } from "@/lib/api";

export default function NewQuestPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const quest = await createQuest({
        title,
        description: description || undefined,
        original_deadline: deadline || undefined,
        final_deadline: deadline || undefined,
      });
      router.push(`/quest/${quest.id}`);
    } catch (e: any) {
      setError(e.response?.data?.detail || "エラーが発生しました");
    } finally {
      setSubmitting(false);
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

        <div className="mb-4">
          <label className="block text-xs font-bold text-amber-700 tracking-widest uppercase mb-1">
            ⚔️ クエスト名
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-amber-200 rounded-lg px-4 py-2 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="例：Reactを習得する"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-amber-700 tracking-widest uppercase mb-1">
            📜 詳細
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-amber-200 rounded-lg px-4 py-2 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="目標の詳細"
            rows={3}
          />
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold text-amber-700 tracking-widest uppercase mb-1">
            🏁 期日
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full border border-amber-200 rounded-lg px-4 py-2 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-amber-400 text-amber-950 font-bold py-3 rounded-lg hover:bg-amber-300 transition shadow-md disabled:opacity-50"
        >
          {submitting ? "作成中..." : "クエストを始める ⚔️"}
        </button>
      </div>
    </div>
  );
}
