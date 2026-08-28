"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, MapPin, PackageX, ShoppingBag, Store } from "lucide-react";
import { useCart } from "@/components/providers/cart-context";
import { useLang } from "@/components/providers/lang-context";
import { buttonClasses, ErrorNote, QtyStepper } from "@/components/ui";
import { useApi } from "@/lib/client";
import { etb, formatDistance } from "@/lib/geo";
import type { ProductWithShop } from "@/types";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, refetch } = useApi<{ product: ProductWithShop }>(`/api/products/${id}`);
  const { add } = useCart();
  const { lang } = useLang();
  const [qty, setQty] = useState(1);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="skeleton aspect-square rounded-2xl" />
          <div className="space-y-4">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-9 w-4/5 rounded" />
            <div className="skeleton h-6 w-32 rounded" />
            <div className="skeleton h-24 w-full rounded" />
            <div className="skeleton h-12 w-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <ErrorNote message={error ?? "Product not found"} onRetry={refetch} />
        <Link href="/search" className={`${buttonClasses("outline", "mt-4")} `}>
          <ArrowLeft size={15} aria-hidden /> Back to browse
        </Link>
      </div>
    );
  }

  const { product } = data;
  const name = lang === "am" && product.nameAm ? product.nameAm : product.nameEn;
  const description = lang === "am" && product.descriptionAm ? product.descriptionAm : product.description;
  const discounted = product.compareAtPrice !== null && product.compareAtPrice > product.price;
  const lowStock = product.quantity > 0 && product.quantity <= product.lowStockThreshold;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-10">
      <Link href="/search" className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft transition hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> Back to browse
      </Link>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Photo */}
        <div className="relative overflow-hidden rounded-2xl border border-sand bg-parchment shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.photos[0]} alt={product.nameEn} className="aspect-square w-full object-cover" />
          {discounted && (
            <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
              Save {etb((product.compareAtPrice ?? 0) - product.price)}
            </span>
          )}
        </div>

        {/* Details */}
        <div>
          <Link
            href={`/shops/${product.shopId}`}
            className="inline-flex items-center gap-2 rounded-full border border-sand-deep bg-card px-3.5 py-2 text-xs font-bold text-ink-soft transition hover:border-brand hover:text-ink"
          >
            <Store size={13} className="text-accent" aria-hidden />
            {product.shop.name}
            <span className="flex items-center gap-1 text-ink-faint">
              <MapPin size={11} aria-hidden /> {formatDistance(product.distanceKm)}
            </span>
          </Link>

          <h1 className="mt-4 font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            <span className={lang === "am" && product.nameAm ? "font-am" : undefined}>{name}</span>
          </h1>
          {lang === "en" && product.nameAm && (
            <p className="font-am mt-1.5 text-base text-ink-soft">{product.nameAm}</p>
          )}

          <div className="mt-5 flex items-baseline gap-3">
            <p className="text-2xl font-bold">{etb(product.price)}</p>
            {discounted && <del className="text-sm text-ink-faint">{etb(product.compareAtPrice ?? 0)}</del>}
            <span className="text-xs text-ink-faint">per {product.unit}</span>
          </div>

          <p className="mt-5 max-w-lg text-sm leading-7 text-ink-soft">{description}</p>

          {/* Stock */}
          <div className="mt-5">
            {product.quantity === 0 ? (
              <p className="inline-flex items-center gap-2 rounded-xl bg-warn-soft px-4 py-2.5 text-sm font-semibold text-warn">
                <PackageX size={16} aria-hidden /> Out of stock — check back soon
              </p>
            ) : (
              <p className="inline-flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-2.5 text-sm font-semibold text-ok">
                <BadgeCheck size={16} aria-hidden />
                {lowStock ? `Only ${product.quantity} left in stock` : `In stock · ${product.quantity} available`}
              </p>
            )}
          </div>

          {/* Add to cart */}
          {product.quantity > 0 && (
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <QtyStepper value={qty} max={product.quantity} onChange={setQty} />
              <button
                onClick={() => add(product, { qty, shopName: product.shop.name })}
                className={buttonClasses("accent", "flex-1 py-3 sm:flex-none sm:px-8")}
              >
                <ShoppingBag size={17} aria-hidden />
                Add to cart · {etb(product.price * qty)}
              </button>
            </div>
          )}

          <dl className="mt-8 grid grid-cols-2 gap-3 rounded-2xl border border-sand bg-card p-5 text-xs sm:max-w-md">
            <div>
              <dt className="font-bold uppercase tracking-wider text-ink-faint">SKU</dt>
              <dd className="mt-1 text-ink">{product.sku}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-ink-faint">Category</dt>
              <dd className="mt-1 capitalize text-ink">{product.category.replace("cat_", "")}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-ink-faint">Listed</dt>
              <dd className="mt-1 text-ink">{new Date(product.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</dd>
            </div>
            <div>
              <dt className="font-bold uppercase tracking-wider text-ink-faint">Fulfilment</dt>
              <dd className="mt-1 text-ink">Delivery or pickup</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
