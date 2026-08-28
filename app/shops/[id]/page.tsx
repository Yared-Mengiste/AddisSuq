"use client";

import { use } from "react";
import { Clock, MapPin, Phone, Store, Truck } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { buttonClasses, EmptyState, ErrorNote, GridSkeleton, ListSkeleton } from "@/components/ui";
import { useApi } from "@/lib/client";
import { formatDistance } from "@/lib/geo";
import { SUB_CITIES } from "@/lib/rules";

interface ShopResponse {
  shop: import("@/types").ShopWithDistance;
  products: (import("@/types").Product & { hidden: boolean })[];
}

export default function ShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, refetch } = useApi<ShopResponse>(`/api/shops/${id}`);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <div className="skeleton mb-6 h-44 w-full rounded-2xl sm:h-60" />
        <ListSkeleton count={1} height="h-20" />
        <div className="mt-8"><GridSkeleton count={8} /></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <ErrorNote message={error ?? "Shop not found"} onRetry={refetch} />
      </div>
    );
  }

  const { shop, products } = data;

  return (
    <div>
      {/* Cover */}
      <div className="relative h-44 overflow-hidden sm:h-60">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shop.coverUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/80 via-brand/25 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        {/* Shop header card */}
        <div className="relative z-10 -mt-14 rounded-2xl border border-sand bg-card p-5 shadow-lift sm:-mt-16 sm:p-7">
          <div className="flex flex-wrap items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shop.logoUrl}
              alt={`${shop.name} logo`}
              className="h-16 w-16 rounded-2xl border border-sand object-cover sm:h-20 sm:w-20"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{shop.name}</h1>
                <span className="font-am text-sm text-ink-soft">{shop.nameAm}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                    shop.status === "approved" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"
                  }`}
                >
                  {shop.status}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-ink-soft">{shop.tagline}</p>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft">
                <li className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-accent" aria-hidden />
                  {shop.subCity} · {formatDistance(shop.distanceKm)} away
                </li>
                <li className="flex items-center gap-1.5">
                  <Clock size={13} aria-hidden />
                  {shop.tradingHours.days}, {shop.tradingHours.open}–{shop.tradingHours.close}
                </li>
                <li className="flex items-center gap-1.5">
                  <Phone size={13} aria-hidden />
                  {shop.phone}
                </li>
                <li className="flex items-center gap-1.5">
                  <Truck size={13} aria-hidden />
                  Delivery within {shop.deliveryRadiusKm} km
                </li>
              </ul>
            </div>
            <p className="rounded-xl bg-mint px-3.5 py-2.5 text-xs font-bold text-moss">
              {shop.productCount} items in catalogue
            </p>
          </div>
          <p className="mt-4 border-t border-sand pt-3.5 text-xs leading-5 text-ink-faint">
            {shop.address}
            {shop.subCity && ` · ${SUB_CITIES.includes(shop.subCity) ? shop.subCity : ""}`} — owner {shop.ownerName}
          </p>
        </div>

        {/* Catalogue */}
        <section className="py-9">
          <h2 className="mb-5 font-serif text-xl font-semibold">Catalogue</h2>
          {products.length === 0 ? (
            <EmptyState
              icon={Store}
              title="Nothing on the shelves yet"
              description="This shop hasn't published any products — check back soon."
              action={<a href="/search" className={buttonClasses("accent")}>Browse other shops</a>}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{ ...p, shop: { id: shop.id, name: shop.name, nameAm: shop.nameAm, subCity: shop.subCity, lat: shop.lat, lng: shop.lng, status: shop.status }, distanceKm: shop.distanceKm }}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
