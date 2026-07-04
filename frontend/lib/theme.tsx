"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "fantasy" | "simple";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "fantasy", toggle: () => {} });

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>("fantasy");

  useEffect(() => {
    const saved = localStorage.getItem("pq-theme") as Theme | null;
    if (saved === "simple" || saved === "fantasy") setTheme(saved);
  }, []);

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
