"use client";

import { createContext, useContext, useEffect, useState } from "react";

const KEY = "chipless-theme";

export type ChiplessTheme = "light" | "dark";

/**
 * Chipless theme: light cream by default, user-toggleable, persisted.
 * Applies `data-chipless-theme` on <html>; restores dark (app default)
 * on unmount so other routes are unaffected.
 *
 * Mount this hook exactly ONCE per page visit (stable root) — internal
 * unmounts would otherwise reset the attribute mid-navigation.
 */
function getStoredTheme(): ChiplessTheme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* private mode */
  }
  return "light";
}

export function useChiplessTheme(): [ChiplessTheme, () => void] {
  const [theme, setTheme] = useState<ChiplessTheme>(() => getStoredTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-chipless-theme", theme);
    return () => {
      document.documentElement.setAttribute("data-chipless-theme", "dark");
    };
  }, [theme]);

  const toggle = () => {
    setTheme((t) => {
      const next: ChiplessTheme = t === "light" ? "dark" : "light";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* private mode */
      }
      return next;
    });
  };

  return [theme, toggle];
}

type ChiplessThemeCtx = { theme: ChiplessTheme; toggle: () => void };

const Ctx = createContext<ChiplessThemeCtx>({ theme: "light", toggle: () => {} });

export const ChiplessThemeProvider = Ctx.Provider;

/** Consume the theme from the stable root provider. */
export function useChiplessThemeValue(): ChiplessThemeCtx {
  return useContext(Ctx);
}

/** Inline script for the chipless page: applies the stored theme before first paint. */
export const CHIPLESS_THEME_BOOT = `try{var t=localStorage.getItem('${KEY}');document.documentElement.setAttribute('data-chipless-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-chipless-theme','light');}`;
