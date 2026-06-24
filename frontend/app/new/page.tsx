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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">新しいロードマップを作る</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="例：Reactを習得する"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">説明</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="目標の詳細"
            rows={3}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">期日</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
        >
          {submitting ? "作成中..." : "作成する"}
        </button>
      </div>
    </div>
  );
}
