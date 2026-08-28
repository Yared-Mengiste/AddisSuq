"use client";

/**
 * Tiny client data layer: a fetch hook with loading/error state and
 * refetch, used by every screen instead of touching `fs` directly.
 */

import { useCallback, useEffect, useState } from "react";

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

type Result<T> = { url: string; data: T; error?: undefined } | { url: string; error: string; data?: undefined };

/**
 * Fetches `url` whenever it changes (or refetch is called). Loading is
 * derived from whether the stored result matches the current url, so the
 * effect itself never sets state synchronously.
 */
export function useApi<T>(url: string | null): ApiState<T> {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error((body as { error?: string })?.error ?? `Request failed (${res.status})`);
        return body as T;
      })
      .then((data) => {
        if (!cancelled) setResult({ url, data });
      })
      .catch((err: Error) => {
        if (!cancelled) setResult({ url, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [url, tick]);

  const current = result && result.url === url ? result : null;
  const loading = url !== null && current === null;

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return {
    data: current && "data" in current ? (current.data as T) : null,
    loading,
    error: current && "error" in current ? (current.error as string) : null,
    refetch,
  };
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string })?.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

/** Bilingual name picker: Amharic text gets the Ethiopic font automatically. */
export function pick(lang: "en" | "am", en: string, am: string): { text: string; amharic: boolean } {
  return lang === "am" && am ? { text: am, amharic: true } : { text: en, amharic: false };
}
