// src/components/ThemeToggle.jsx
import { useEffect, useState } from "react";

const ThemeToggle = ({ className = "" }) => {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <button
      type="button"
      onClick={() => setDark(v => !v)}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 bg-indigo-500 text-white shadow ${className}`}
      title={dark ? "Oscuro" : "Claro"}
      aria-label="Cambiar tema"
    >
      <span className="text-lg">{dark ? "🌙" : "☀️"}</span>
    </button>
  );
};

export default ThemeToggle;
