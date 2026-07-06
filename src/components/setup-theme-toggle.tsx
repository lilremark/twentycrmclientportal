"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type SetupTheme = "light" | "dark";

function applySetupTheme(theme: SetupTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function SetupThemeToggle() {
  const [theme, setTheme] = useState<SetupTheme>("light");

  useEffect(() => {
    const storedTheme = localStorage.getItem("setup-theme");
    const initialTheme: SetupTheme = storedTheme === "dark" ? "dark" : "light";
    applySetupTheme(initialTheme);
    setTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: SetupTheme = theme === "dark" ? "light" : "dark";
    applySetupTheme(nextTheme);
    localStorage.setItem("setup-theme", nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      aria-label={`Switch setup to ${theme === "dark" ? "light" : "dark"} mode`}
      className="setup-theme-toggle"
      onClick={toggleTheme}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      type="button"
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
