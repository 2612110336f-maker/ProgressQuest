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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          {isLogin ? "ログイン" : "新規登録"}
        </h1>
        {error && (
          <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
        )}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="example@email.com"
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="••••••••"
          />
        </div>
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
        >
          {isLogin ? "ログイン" : "登録する"}
        </button>
        <p className="text-center text-sm mt-4 text-gray-500">
          {isLogin ? "アカウントをお持ちでない方は" : "既にアカウントをお持ちの方は"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-500 ml-1 hover:underline"
          >
            {isLogin ? "新規登録" : "ログイン"}
          </button>
        </p>
      </div>
    </div>
  );
}
