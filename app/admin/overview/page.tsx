"use client";

import { Boxes, Coins, ShoppingCart, Store, TrendingUp, Users } from "lucide-react";
import { ButtonLink, ErrorNote } from "@/components/ui";
import { useApi } from "@/lib/client";
import { etb } from "@/lib/geo";
import { ORDER_STATUS_META } from "@/lib/rules";

interface Stats {
  shops: { total: number; approved: number; pending: number; rejected: number };
  products: { total: number; published: number; outOfStock: number };
  orders: { total: number; active: number; cancelled: number; today: number; byStatus: Record<string, number> };
  customers: { total: number };
  gmv: number;
  paidGmv: number;
}

export default function AdminOverviewPage() {
  const { data, loading, error, refetch } = useApi<Stats>("/api/admin/stats");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">
            <TrendingUp size={14} aria-hidden /> Admin
          </p>
          <h1 className="mt-1.5 font-serif text-3xl font-semibold tracking-tight">Platform overview</h1>
          <p className="mt-1.5 text-sm text-ink-soft">Every figure below is computed live from the JSON database.</p>
        </div>
        <ButtonLink href="/admin/vendors" variant="outline">
          <Store size={15} aria-hidden /> Vendor approvals
        </ButtonLink>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : error || !data ? (
        <ErrorNote message={error ?? "Could not load stats"} onRetry={refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Shops", value: String(data.shops.total), sub: `${data.shops.approved} approved · ${data.shops.pending} pending · ${data.shops.rejected} rejected`, icon: Store },
              { label: "Products", value: String(data.products.total), sub: `${data.products.published} published · ${data.products.outOfStock} out of stock`, icon: Boxes },
              { label: "Orders", value: String(data.orders.total), sub: `${data.orders.active} active · ${data.orders.cancelled} cancelled · ${data.orders.today} today`, icon: ShoppingCart },
              { label: "Customers", value: String(data.customers.total), sub: "registered accounts", icon: Users },
            ].map(({ label, value, sub, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-sand bg-card p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{label}</p>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-mint text-moss">
                    <Icon size={15} aria-hidden />
                  </span>
                </div>
                <p className="mt-2.5 font-serif text-3xl font-semibold">{value}</p>
                <p className="mt-1 text-[11px] leading-4 text-ink-faint">{sub}</p>
              </div>
            ))}
          </div>

          {/* GMV hero */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-brand p-6 text-cream shadow-card sm:p-7">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-cream/70">
                <Coins size={14} aria-hidden /> Gross merchandise value
              </p>
              <p className="mt-3 font-serif text-4xl font-semibold">{etb(data.gmv)}</p>
              <p className="mt-2 text-xs text-cream/70">
                All non-cancelled orders · {etb(data.paidGmv)} already settled · rest on cash-on-delivery.
              </p>
            </div>

            {/* Orders by status */}
            <div className="rounded-2xl border border-sand bg-card p-6 shadow-card">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Orders by status</p>
              <ul className="mt-4 space-y-2">
                {Object.entries(data.orders.byStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => {
                    const meta = ORDER_STATUS_META[status as keyof typeof ORDER_STATUS_META];
                    const pct = Math.round((count / data.orders.total) * 100);
                    const barColor =
                      meta?.tone === "ok" ? "bg-ok" : meta?.tone === "bad" ? "bg-danger" : meta?.tone === "warn" ? "bg-gold" : "bg-moss";
                    return (
                      <li key={status} className="flex items-center gap-3 text-xs">
                        <span className="w-28 shrink-0 font-semibold">{meta?.label ?? status}</span>
                        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-parchment">
                          <span className={`block h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </span>
                        <span className="w-8 text-right font-bold">{count}</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>

          <p className="mt-6 rounded-2xl bg-mint px-5 py-4 text-xs leading-5 text-moss">
            This overview covers the four MVP modules only (A–D). Ratings, full analytics and a complete admin
            console are out of scope for the SE341 prototype.
          </p>
        </>
      )}
    </div>
  );
}
