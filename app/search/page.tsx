"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, PackageSearch, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { CategoryChips } from "@/components/category-chips";
import { ProductCard } from "@/components/product-card";
import { useAuth } from "@/components/providers/auth-context";
import { buttonClasses, EmptyState, ErrorNote, GridSkeleton } from "@/components/ui";
import { useApi } from "@/lib/client";
import { SUB_CITIES } from "@/lib/rules";
import type { Category, ProductWithShop } from "@/types";

function SearchPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { customer } = useAuth();

  // Re-key the inner component when the URL changes (landing-page chips,
  // header search) so state resets to match the new query without an effect.
  const urlKey = params.toString();
  return <SearchControls key={urlKey} initialQ={params.get("q") ?? ""} initialCategory={params.get("category") ?? "all"} initialSort={params.get("sort") ?? "distance"} customer={customer} router={router} />;
}

function SearchControls({
  initialQ,
  initialCategory,
  initialSort,
  customer,
  router,
}: {
  initialQ: string;
  initialCategory: string;
  initialSort: string;
  customer: import("@/types").Customer | null;
  router: ReturnType<typeof useRouter>;
}) {
  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState(initialCategory);
  const [subCity, setSubCity] = useState("all");
  const [priceBand, setPriceBand] = useState("all");
  const [sort, setSort] = useState(initialSort);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categories = useApi<Category[]>("/api/categories");

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (category !== "all") sp.set("category", category);
    if (subCity !== "all") sp.set("subCity", subCity);
    const [min, max] = priceBand === "all" ? ["", ""] : priceBand.split("-");
    if (min) sp.set("minPrice", min);
    if (max) sp.set("maxPrice", max);
    sp.set("sort", sort);
    return `/api/products?${sp.toString()}`;
  }, [q, category, subCity, priceBand, sort]);

  const results = useApi<ProductWithShop[]>(query);

  const location = customer?.savedAddresses.find((a) => a.id === customer.defaultAddressId) ?? customer?.savedAddresses[0];
  const locationLabel = location ? `${location.subCity}, Addis Ababa` : "Bole, Addis Ababa";

  const hasFilters = q.trim() !== "" || category !== "all" || subCity !== "all" || priceBand !== "all";

  function resetFilters() {
    setQ("");
    setCategory("all");
    setSubCity("all");
    setPriceBand("all");
    setSort("distance");
    router.replace("/search");
  }

  const PRICE_BANDS = [
    ["all", "Any price"],
    ["0-500", "Under 500 ETB"],
    ["500-1500", "500 – 1,500 ETB"],
    ["1500-3000", "1,500 – 3,000 ETB"],
    ["3000-999999", "Over 3,000 ETB"],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="mb-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Browse the market</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Distance-ranked from <strong className="text-ink">{locationLabel}</strong>
        </p>
      </header>

      {/* Search + filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-sand-deep bg-card px-3.5 py-1 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            router.replace(`/search?q=${encodeURIComponent(q)}`);
          }}
          role="search"
        >
          <Search size={17} className="shrink-0 text-ink-faint" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, shops…"
            aria-label="Search products"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-ink-faint"
          />
        </form>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort results"
          className="flex items-center gap-1.5 rounded-2xl border border-sand-deep bg-card px-3.5 py-2.5 text-sm font-semibold text-ink shadow-card"
        >
          <option value="distance">Nearest first</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
          <option value="newest">Newest</option>
        </select>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className={`${buttonClasses("outline", "rounded-2xl")} ${filtersOpen ? "border-brand bg-mint" : ""}`}
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={15} aria-hidden />
          <span className="hidden sm:inline">Filters</span>
          {hasFilters && <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] text-white">•</span>}
        </button>
      </div>

      {filtersOpen && (
        <div className="mb-6 grid gap-4 rounded-2xl border border-sand bg-card p-5 shadow-card sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-bold">Sub-city</span>
            <select
              value={subCity}
              onChange={(e) => setSubCity(e.target.value)}
              className="w-full rounded-xl border border-sand-deep bg-cream px-3 py-2.5"
            >
              <option value="all">All sub-cities</option>
              {SUB_CITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-bold">Price range</span>
            <select
              value={priceBand}
              onChange={(e) => setPriceBand(e.target.value)}
              className="w-full rounded-xl border border-sand-deep bg-cream px-3 py-2.5"
            >
              {PRICE_BANDS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button onClick={resetFilters} className={buttonClasses("ghost", "w-full border border-sand-deep")}>
              <RotateCcw size={15} aria-hidden /> Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Category chips */}
      <div className="mb-7">
        {categories.loading ? (
          <div className="flex gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-11 w-32 shrink-0 rounded-full" />
            ))}
          </div>
        ) : (
          <CategoryChips
            categories={categories.data ?? []}
            activeId={category}
            onSelect={setCategory}
          />
        )}
      </div>

      {/* Results */}
      {results.loading ? (
        <GridSkeleton count={8} />
      ) : results.error ? (
        <ErrorNote message={results.error} onRetry={results.refetch} />
      ) : (results.data ?? []).length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={hasFilters ? "Nothing matched those filters" : "No shops in this category yet"}
          description={
            hasFilters
              ? "Try widening the price band, choosing another sub-city, or clearing the keyword."
              : "New shops join AddisSuq every week — check back soon or browse another category."
          }
          action={
            <button onClick={resetFilters} className={buttonClasses("accent")}>
              <RotateCcw size={15} aria-hidden /> Reset filters
            </button>
          }
        />
      ) : (
        <>
          <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-ink-faint">
            <ArrowDownWideNarrow size={13} aria-hidden />
            {(results.data ?? []).length} product{(results.data ?? []).length === 1 ? "" : "s"} · sorted by{" "}
            {sort === "distance" ? "distance" : sort === "price_asc" ? "price" : sort === "price_desc" ? "price" : "newest"}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(results.data ?? []).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12"><GridSkeleton count={8} /></div>}>
      <SearchPageInner />
    </Suspense>
  );
}
