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
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md transition-all hover:scale-105 ${className}`}
      title={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label="Cambiar tema"
    >
      {/* ✅ ICON LOGIC CORRECTED: Shows the icon for the mode it WILL switch TO */}
      {/* If currently dark (dark is true), show Sun (☀️) to indicate switching to light */}
      {/* If currently light (dark is false), show Moon (🌙) to indicate switching to dark */}
      <span className="text-lg">{dark ? "☀️" : "🌙"}</span>
    </button>
  );
};

export default ThemeToggle;