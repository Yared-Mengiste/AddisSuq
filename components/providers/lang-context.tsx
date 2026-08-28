"use client";

/**
 * Language toggle (EN / አማ) — a client-side switch that swaps nameEn/nameAm.
 * Persisted to localStorage so it survives refreshes during the demo.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "am";

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue>({ lang: "en", setLang: () => {} });

const STORAGE_KEY = "addissuq.lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate the persisted language after mount (SSR renders the default).
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "am" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
