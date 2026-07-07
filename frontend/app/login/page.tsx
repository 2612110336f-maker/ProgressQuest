// --- ログイン/新規登録ページ ---
// 1つのフォームで「ログイン」と「新規登録」を兼用する。
// URLクエリ ?mode=register の有無だけでモードを切り替える(状態をURLに持たせる設計)。
"use client";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { login, register } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // mode=register以外(未指定含む)はすべてログインモード扱い
  const isLogin = useMemo(() => searchParams.get("mode") !== "register", [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // isLoginに応じてlib/api.tsのlogin()/register()を呼び分け、
  // 取得したJWTをlocalStorageに保存してからダッシュボードへ遷移する。
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      const data = isLogin
        ? await login(email, password)
        : await register(email, password);
          localStorage.setItem("token", data.access_token);
          router.push("/dashboard");
    } catch (e: any) {
      // backend/main.pyがHTTPException(detail=...)で返すエラーメッセージをそのまま表示する
      setError(e.response?.data?.detail || "エラーが発生しました");
    }
  };

  // ログイン/登録の切り替えはURLクエリを書き換えるだけ(ページ遷移扱いだがコンポーネントは同じ)
  const toggleMode = () => {
    const nextMode = isLogin ? "register" : "login";
    router.push(`/login?mode=${nextMode}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment p-4">
      <div className="bg-[#F5F0E8] shadow-neumorphism rounded-2xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-3 shadow-neumorphism-sm">
            <Image src="/icon-source.png" alt="ProgressQuest" width={56} height={56} className="w-full h-full object-cover" />
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

        <form onSubmit={handleSubmit}>
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
            type="submit"
            className="flex items-center justify-center h-12 w-full rounded-xl bg-[#2D6A4F] text-white font-bold hover:opacity-90 transition shadow-neumorphism-sm"
          >
            {isLogin ? "王国に入る ⚔️" : "冒険を始める ⚔️"}
          </button>

          <div className="border-t border-[#E8E0D0] my-5" />

          <p className="text-center text-sm text-[#888888]">
            {isLogin ? "まだ王国の住人ではない？" : "既に王国の住人？"}
            <button
              type="button"
              onClick={toggleMode}
              className="text-[#2D6A4F] font-bold ml-1 hover:underline"
            >
              {isLogin ? "新規登録" : "ログイン"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

// useSearchParams()を使うコンポーネントはNext.jsの要件でSuspenseに包む必要があるため、
// ページ本体はLoginFormをSuspenseでラップするだけの薄いラッパーにしている。
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
