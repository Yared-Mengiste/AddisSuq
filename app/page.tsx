"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, MapPin, Search, ShieldCheck, Sparkles, Store, Truck } from "lucide-react";
import { CategoryChips } from "@/components/category-chips";
import { ProductCard } from "@/components/product-card";
import { ShopCard } from "@/components/shop-card";
import { useAuth } from "@/components/providers/auth-context";
import { useLang } from "@/components/providers/lang-context";
import { GridSkeleton, SectionHeading } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { Category, ProductWithShop, ShopWithDistance } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const { customer } = useAuth();
  const { lang } = useLang();

  const shops = useApi<ShopWithDistance[]>("/api/shops");
  const products = useApi<ProductWithShop[]>("/api/products?limit=8&sort=distance");
  const categories = useApi<Category[]>("/api/categories");

  const location = customer?.savedAddresses.find((a) => a.id === customer.defaultAddressId) ?? customer?.savedAddresses[0];
  const locationLabel = location ? `${location.subCity}, Addis Ababa` : "Bole, Addis Ababa";

  return (
    <div>
      {/* ---------------- Hero ---------------- */}
      <section className="border-b border-sand bg-brand text-cream">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:pt-16 lg:px-8 lg:pb-16">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-cream/90">
            <Sparkles size={13} aria-hidden /> Your city, your market
          </p>
          <h1 className="mt-5 max-w-xl font-serif text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Good things are <em className="not-italic text-gold">closer</em> than you think.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-cream/75">
            Shop from independent stores across Addis Ababa — order for delivery or pickup, and pay with Telebirr,
            CBE Birr, Chapa or cash.
          </p>

          <form
            className="mt-7 flex max-w-lg items-center gap-2 rounded-2xl border border-white/15 bg-white p-2 shadow-lift"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              router.push(`/search${q ? `?q=${encodeURIComponent(String(q))}` : ""}`);
            }}
            role="search"
          >
            <Search size={19} className="ml-3 shrink-0 text-ink-faint" aria-hidden />
            <input
              name="q"
              type="search"
              placeholder="What are you looking for today?"
              aria-label="Search products"
              className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <button type="submit" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-deep">
              Search
            </button>
          </form>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-cream/70">
            <MapPin size={14} className="text-gold" aria-hidden />
            Shopping in <strong className="font-semibold text-cream">{locationLabel}</strong>
            <Link href="/account" className="ml-1 underline underline-offset-2 hover:text-gold">
              Change
            </Link>
          </p>
        </div>
      </section>

      {/* ---------------- Categories ---------------- */}
      <section className="border-b border-sand bg-parchment py-7">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          {categories.loading ? (
            <div className="flex gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-11 w-32 shrink-0 rounded-full" />
              ))}
            </div>
          ) : (
            <CategoryChips categories={categories.data ?? []} />
          )}
        </div>
      </section>

      {/* ---------------- Shops near you ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-12 lg:px-8 lg:py-14">
        <SectionHeading
          eyebrow="Module B · Discovery"
          title="Shops near you"
          action={
            <Link href="/search" className="flex items-center gap-1.5 text-sm font-bold text-moss transition hover:text-accent">
              See all <ArrowRight size={15} aria-hidden />
            </Link>
          }
        />
        {shops.loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-sand">
                <div className="skeleton aspect-[16/9]" />
                <div className="space-y-2.5 p-4">
                  <div className="skeleton h-5 w-2/3 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : shops.error ? (
          <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{shops.error}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(shops.data ?? []).slice(0, 3).map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </section>

      {/* ---------------- Featured products ---------------- */}
      <section className="border-y border-sand bg-parchment py-12 lg:py-14">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <SectionHeading
            eyebrow="Popular right now"
            title="Find your next favourite"
            action={
              <Link href="/search?sort=newest" className="flex items-center gap-1.5 text-sm font-bold text-moss transition hover:text-accent">
                Browse all <ArrowRight size={15} aria-hidden />
              </Link>
            }
          />
          {products.loading ? (
            <GridSkeleton count={8} />
          ) : products.error ? (
            <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{products.error}</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {(products.data ?? []).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="mx-auto max-w-6xl px-4 py-12 lg:px-8 lg:py-14">
        <SectionHeading eyebrow="How AddisSuq works" title="Three steps to your doorstep" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Store,
              title: "Discover nearby shops",
              body: "Browse catalogues from real neighbourhood stores, ranked by distance from where you are.",
            },
            {
              icon: ShieldCheck,
              title: "Order and pay your way",
              body: "Pay with Telebirr, CBE Birr or Chapa — or in cash when your order arrives. All simulated in this demo.",
            },
            {
              icon: Truck,
              title: "Track to your door",
              body: "Follow every step — confirmed, packed, out for delivery — with SMS-style updates in the app.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-sand bg-card p-6 shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-moss">
                <Icon size={21} aria-hidden />
              </span>
              <h3 className="mt-4 font-serif text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-mint px-5 py-4 text-sm text-ink">
          <Bell size={17} className="shrink-0 text-moss" aria-hidden />
          <p>
            <strong>Vendors confirm within 10 seconds</strong> in this prototype, so you can watch the order
            timeline move live during the demo.{" "}
            <span className={lang === "am" ? "font-am" : undefined} aria-hidden>
              · መልእክቶች በአማርኛም ይመለከታሉ
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
