// --- 見た目テーマ(ファンタジー風 / シンプル)の切り替えを全画面で共有するContext ---
// layout.tsxがProviderでアプリ全体をラップし、各コンポーネントはuseTheme()で参照する。
// data-theme属性をhtml要素に付与し、CSS側(globals.css等)がそれに応じてスタイルを出し分ける想定。
"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "fantasy" | "simple";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "fantasy", toggle: () => {} });

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("fantasy");

  // 初回マウント時のみ、前回保存したテーマをlocalStorageから復元する
  useEffect(() => {
    const saved = localStorage.getItem("pq-theme") as Theme | null;
    if (saved === "simple" || saved === "fantasy") setTheme(saved);
  }, []);

  // テーマが変わるたびに<html data-theme="...">へ反映し、localStorageにも保存する
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("pq-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "fantasy" ? "simple" : "fantasy"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
