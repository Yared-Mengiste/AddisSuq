"use client";

import Link from "next/link";
import { ArrowRight, Clock, MapPin, Package } from "lucide-react";
import { useLang } from "@/components/providers/lang-context";
import { formatDistance } from "@/lib/geo";
import type { ShopWithDistance } from "@/types";

export function ShopCard({ shop }: { shop: ShopWithDistance }) {
  const { lang } = useLang();
  const name = lang === "am" && shop.nameAm ? shop.nameAm : shop.name;

  return (
    <article className="group overflow-hidden rounded-2xl border border-sand bg-card shadow-card transition-shadow hover:shadow-lift">
      <Link href={`/shops/${shop.id}`} className="block aspect-[16/9] overflow-hidden bg-parchment" aria-label={shop.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shop.coverUrl}
          alt={shop.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-lg font-semibold leading-snug">
              <Link href={`/shops/${shop.id}`} className="hover:underline">
                <span className={lang === "am" && shop.nameAm ? "font-am" : undefined}>{name}</span>
              </Link>
            </h3>
            <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{shop.tagline}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
              shop.isOpenNow ? "bg-ok-soft text-ok" : "bg-parchment text-ink-faint"
            }`}
          >
            {shop.isOpenNow ? "Open now" : "Closed"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-ink-soft">
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-accent" aria-hidden /> {shop.subCity} · {formatDistance(shop.distanceKm)}
          </span>
          <span className="flex items-center gap-1">
            <Package size={12} aria-hidden /> {shop.productCount} items
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} aria-hidden /> {shop.tradingHours.open}–{shop.tradingHours.close}
          </span>
        </div>
        <Link
          href={`/shops/${shop.id}`}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-moss transition hover:text-accent"
        >
          Visit shop <ArrowRight size={13} aria-hidden />
        </Link>
      </div>
    </article>
  );
}
