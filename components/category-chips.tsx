"use client";

import Link from "next/link";
import { useLang } from "@/components/providers/lang-context";
import type { Category } from "@/types";

/** Scrollable category chip row. Links to /search?category= or, when
 *  onSelect is given (e.g. inside the search page), acts as a filter button. */
export function CategoryChips({
  categories,
  activeId,
  counts,
  onSelect,
}: {
  categories: Category[];
  activeId?: string;
  counts?: Record<string, number>;
  onSelect?: (id: string) => void;
}) {
  const { lang } = useLang();

  const chips = [
    { id: "all", nameEn: "All categories", nameAm: "ሁሉም ምድቦች", accent: "#77897f" },
    ...categories,
  ];

  return (
    <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Categories">
      {chips.map((cat) => {
        const active = activeId === cat.id;
        const name = lang === "am" ? cat.nameAm : cat.nameEn;
        const className = `flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
          active
            ? "border-accent bg-peach text-accent-deep"
            : "border-sand-deep bg-card text-ink-soft hover:border-brand hover:text-ink"
        }`;
        const content = (
          <>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.accent }} aria-hidden />
            <span className={lang === "am" ? "font-am" : undefined}>{name}</span>
            {counts?.[cat.id] !== undefined && (
              <span className="text-[10px] font-bold text-ink-faint">{counts[cat.id]}</span>
            )}
          </>
        );

        if (onSelect) {
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelect(cat.id)}
              aria-pressed={active}
              className={className}
            >
              {content}
            </button>
          );
        }
        return (
          <Link
            key={cat.id}
            href={`/search?category=${cat.id}`}
            aria-current={active ? "true" : undefined}
            className={className}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
