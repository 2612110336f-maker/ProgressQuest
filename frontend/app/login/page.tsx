"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    try {
      const data = isLogin
        ? await login(email, password)
        : await register(email, password);
      localStorage.setItem("token", data.access_token);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.response?.data?.detail || "エラーが発生しました");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment p-4">
      <div className="card-fantasy rounded-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-700 flex items-center justify-center text-2xl mb-3 shadow-inner">
            📖
          </div>
          <h1 className="font-display text-2xl font-bold text-emerald-900 tracking-wide">
            ProgressQuest
          </h1>
          <p className="text-xs text-amber-700 tracking-widest uppercase mt-1">
            A New Legend Awaits
          </p>
        </div>

        <h2 className="text-center font-bold text-slate-700 mb-4">
          {isLogin ? "ログイン" : "新規登録"}
        </h2>

        {error && (
          <p className="text-red-600 text-sm mb-4 text-center bg-red-50 border border-red-200 rounded-lg py-2">
            {error}
          </p>
        )}

        <div className="mb-4">
          <label className="block text-xs font-bold text-amber-700 tracking-widest uppercase mb-1">
            ✉️ 冒険者の証（メールアドレス）
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-amber-200 rounded-lg px-4 py-2 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="email@kingdom.com"
          />
        </div>
        <div className="mb-6">
          <label className="block text-xs font-bold text-amber-700 tracking-widest uppercase mb-1">
            🔑 合言葉（パスワード）
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-amber-200 rounded-lg px-4 py-2 bg-amber-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="••••••••"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-amber-400 text-amber-950 font-bold py-3 rounded-lg hover:bg-amber-300 transition shadow-md"
        >
          {isLogin ? "王国に入る ⚔️" : "冒険を始める ⚔️"}
        </button>

        <div className="border-t border-amber-200 my-5" />

        <p className="text-center text-sm text-slate-500">
          {isLogin ? "まだ王国の住人ではない？" : "既に王国の住人？"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-emerald-700 font-bold ml-1 hover:underline"
          >
            {isLogin ? "新規登録" : "ログイン"}
          </button>
        </p>
      </div>
    </div>
  );
}
