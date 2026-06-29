"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="google-switch opacity-50" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <label className="google-switch" title={isDark ? "Switch to day mode" : "Switch to night mode"}>
      <input
        type="checkbox"
        checked={isDark}
        onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
      />
      <div className="google-slider">
        <div className="google-sun" />
        <div className="google-moon" />
        <div className="google-cloud google-cloud1" />
        <div className="google-cloud google-cloud2" />
        <div className="google-star google-star1" />
        <div className="google-star google-star2" />
        <div className="google-star google-star3" />
        <div className="google-star google-star4" />
        <div className="google-star google-star5" />
      </div>
    </label>
  );
}
