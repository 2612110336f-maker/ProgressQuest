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
      <div className="card-fantasy rounded-2xl p-8 w-full max-w-md bg-card/60 border border-border shadow-2xl relative overflow-hidden">
        {/* RPGヘッダーデコレーション */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary" />

        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-2xl mb-3 shadow-[0_0_15px_rgba(108,99,255,0.4)]">
            📖
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-100 tracking-wide">
            ProgressQuest
          </h1>
          <p className="text-xs text-slate-400 tracking-widest uppercase mt-1 font-display">
            A New Legend Awaits
          </p>
        </div>

        <h2 className="text-center font-bold text-slate-200 mb-5 font-display text-lg">
          {isLogin ? "王国に入る ⚔️" : "新たな冒険者として登録 🛡️"}
        </h2>

        {error && (
          <p className="text-danger text-sm mb-4 text-center bg-danger/10 border border-danger/30 rounded-lg py-2">
            {error}
          </p>
        )}

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1 font-display">
            ✉️ 冒険者の証 (メールアドレス)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2 bg-slate-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            placeholder="email@kingdom.com"
          />
        </div>
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-400 tracking-widest uppercase mb-1 font-display">
            🔑 合言葉 (パスワード)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-border rounded-lg px-4 py-2 bg-slate-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            placeholder="••••••••"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-primary hover:bg-opacity-90 text-white font-bold font-display py-3 rounded-lg transition shadow-lg text-sm"
        >
          {isLogin ? "王国に入る ⚔️" : "冒険を始める ⚔️"}
        </button>

        <div className="border-t border-border my-5" />

        <p className="text-center text-sm text-slate-450">
          {isLogin ? "まだ王国の住人ではない？" : "既に王国の住人？"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-bold ml-1 hover:underline font-display focus:outline-none"
          >
            {isLogin ? "新規登録" : "ログイン"}
          </button>
        </p>
      </div>
    </div>
  );
}
