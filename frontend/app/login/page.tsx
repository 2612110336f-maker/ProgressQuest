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
      <div className="bg-[#F5F0E8] shadow-neumorphism rounded-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#2D6A4F] flex items-center justify-center text-2xl mb-3 shadow-neumorphism-sm">
            📖
          </div>
          <h1 className="font-display text-2xl font-bold text-[#2D6A4F] tracking-wide">
            ProgressQuest
          </h1>
          <p className="text-xs text-[#888888] tracking-widest uppercase mt-1">
            A New Legend Awaits
          </p>
        </div>

        <h2 className="text-center font-bold text-[#2C2C2C] mb-4">
          {isLogin ? "ログイン" : "新規登録"}
        </h2>

        {error && (
          <p className="text-[#E05252] text-sm mb-4 text-center bg-[#E05252]/10 rounded-lg py-2">
            {error}
          </p>
        )}

        <div className="mb-4">
          <label className="block text-xs font-bold text-[#2D6A4F] tracking-widest uppercase mb-1">
            ✉️ 冒険者の証（メールアドレス）
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 rounded-xl px-4 bg-[#F5F0E8] shadow-neumorphism-inset focus:outline-none"
            placeholder="email@kingdom.com"
          />
        </div>
        <div className="mb-6">
          <label className="block text-xs font-bold text-[#2D6A4F] tracking-widest uppercase mb-1">
            🔑 合言葉（パスワード）
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 rounded-xl px-4 bg-[#F5F0E8] shadow-neumorphism-inset focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="flex items-center justify-center h-12 w-full rounded-xl bg-[#2D6A4F] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm"
        >
          {isLogin ? "王国に入る ⚔️" : "冒険を始める ⚔️"}
        </button>

        <div className="border-t border-[#E8E0D0] my-5" />

        <p className="text-center text-sm text-[#888888]">
          {isLogin ? "まだ王国の住人ではない？" : "既に王国の住人？"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#2D6A4F] font-bold ml-1 hover:underline"
          >
            {isLogin ? "新規登録" : "ログイン"}
          </button>
        </p>
      </div>
    </div>
  );
}
