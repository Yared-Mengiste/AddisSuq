"use client";

import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { useCart } from "@/components/providers/cart-context";
import { useLang } from "@/components/providers/lang-context";
import { etb, formatDistance } from "@/lib/geo";
import type { ProductWithShop } from "@/types";

export function ProductCard({ product }: { product: ProductWithShop }) {
  const { lang } = useLang();
  const { add } = useCart();
  const name = lang === "am" && product.nameAm ? product.nameAm : product.nameEn;
  const discounted = product.compareAtPrice !== null && product.compareAtPrice > product.price;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-sand bg-card shadow-card transition-shadow hover:shadow-lift">
      <Link href={`/products/${product.id}`} className="relative block aspect-square overflow-hidden bg-parchment" aria-label={product.nameEn}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.photos[0]}
          alt={product.nameEn}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {discounted && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            −{Math.round((1 - product.price / (product.compareAtPrice ?? product.price)) * 100)}%
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{product.shop.name}</p>
        <Link href={`/products/${product.id}`} className="line-clamp-2 text-sm font-semibold leading-5 hover:underline">
          <span className={lang === "am" && product.nameAm ? "font-am" : undefined}>{name}</span>
        </Link>
        <p className="mt-auto flex items-center gap-1 text-[11px] text-ink-faint">
          <MapPin size={11} aria-hidden /> {formatDistance(product.distanceKm)} away
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold">{etb(product.price)}</span>
            {discounted && (
              <del className="text-[11px] text-ink-faint">{etb(product.compareAtPrice ?? 0)}</del>
            )}
          </p>
          <button
            onClick={() =>
              add(product, {
                shopName: product.shop.name,
                qty: 1,
              })
            }
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-cream transition hover:bg-accent disabled:bg-sand-deep disabled:text-ink-faint"
            aria-label={`Add ${product.nameEn} to cart`}
          >
            <Plus size={17} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
