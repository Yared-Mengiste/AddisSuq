"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Boxes, Clock, PackageSearch, Store, Timer, TrendingUp, Truck } from "lucide-react";
import { NotificationFeed } from "@/components/notification-feed";
import { useAuth } from "@/components/providers/auth-context";
import { ButtonLink, EmptyState, ErrorNote, ListSkeleton, PaymentBadge, StatusBadge } from "@/components/ui";
import { useApi } from "@/lib/client";
import { etb, formatDateTime } from "@/lib/geo";
import type { AppNotification, Order, Shop } from "@/types";

interface Summary {
  shop: Shop;
  status: Shop["status"];
  stats: {
    ordersToday: number;
    totalOrders: number;
    activeOrders: number;
    products: number;
    publishedProducts: number;
    outOfStock: number;
    lowStock: number;
    revenue: number;
    avgConfirmationMs: number | null;
  };
  trend: { date: string; label: string; revenue: number; orders: number }[];
  statusCounts: Record<string, number>;
  recentOrders: {
    id: string;
    customerId: string;
    itemCount: number;
    total: number;
    status: Order["status"];
    fulfilmentType: Order["fulfilmentType"];
    createdAt: string;
  }[];
}

export default function VendorDashboardPage() {
  const { vendorShopId, vendorShop } = useAuth();
  const summary = useApi<Summary>(vendorShopId ? `/api/vendor/${vendorShopId}/summary` : null);
  const orders = useApi<Order[]>(vendorShopId ? `/api/orders?shopId=${vendorShopId}` : null);
  const notifications = useApi<AppNotification[]>(
    vendorShopId ? `/api/notifications?userId=${vendorShopId}&userType=vendor&limit=8` : null
  );

  /* ---------- Not yet submitted / pending review ---------- */
  if (vendorShop && vendorShop.status === "pending") {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 lg:px-8 lg:py-20">
        <div className="rounded-2xl border border-sand bg-card p-7 text-center shadow-card sm:p-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-warn-soft text-warn">
            <Clock size={30} aria-hidden />
          </span>
          <h1 className="mt-5 font-serif text-2xl font-semibold sm:text-3xl">Waiting for approval</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            <strong className="text-ink">{vendorShop.name}</strong> was submitted on{" "}
            {new Date(vendorShop.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} and is
            pending admin review. You&apos;ll get a simulated SMS the moment it&apos;s approved — switch to the{" "}
            <strong className="text-ink">Admin</strong> role in the header to see the application queue.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/admin/vendors" variant="accent">Open admin approvals</ButtonLink>
            <ButtonLink href="/vendor/onboarding" variant="outline">Register another shop</ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  if (vendorShop && vendorShop.status === "rejected") {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 lg:px-8 lg:py-20">
        <div className="rounded-2xl border border-sand bg-card p-7 text-center shadow-card sm:p-10">
          <h1 className="font-serif text-2xl font-semibold sm:text-3xl">Application not approved</h1>
          <p className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-sm leading-6 text-danger">
            {vendorShop.rejectionReason ?? "The application did not meet the requirements."}
          </p>
          <p className="mt-3 text-sm text-ink-soft">You can correct the details and register again.</p>
          <div className="mt-6">
            <ButtonLink href="/vendor/onboarding" variant="accent">Register again</ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  const stats = summary.data?.stats;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">
            <Store size={14} aria-hidden /> Vendor dashboard
          </p>
          <h1 className="mt-1.5 font-serif text-3xl font-semibold tracking-tight">
            {vendorShop?.name ?? "Your shop"}
          </h1>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-ink-soft">
            <BadgeCheck size={14} className="text-ok" aria-hidden /> Approved · {vendorShop?.subCity} ·{" "}
            {vendorShop?.tradingHours.open}–{vendorShop?.tradingHours.close}
          </p>
        </div>
        <div className="flex gap-2.5">
          <ButtonLink href="/vendor/products" variant="outline">
            <Boxes size={15} aria-hidden /> Catalogue
          </ButtonLink>
          <ButtonLink href="/vendor/onboarding" variant="ghost">
            Register shop
          </ButtonLink>
        </div>
      </header>

      {/* Stat cards */}
      {summary.loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : summary.error ? (
        <ErrorNote message={summary.error} onRetry={summary.refetch} />
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Orders today", value: String(stats.ordersToday), sub: `${stats.totalOrders} all time`, icon: Truck },
            { label: "Active orders", value: String(stats.activeOrders), sub: "awaiting your action", icon: Clock },
            { label: "Revenue", value: etb(stats.revenue), sub: "excl. cancelled", icon: TrendingUp },
            {
              label: "Products",
              value: `${stats.publishedProducts}/${stats.products}`,
              sub: `${stats.outOfStock} out of stock · ${stats.lowStock} low`,
              icon: Boxes,
            },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-sand bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{label}</p>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-mint text-moss">
                  <Icon size={15} aria-hidden />
                </span>
              </div>
              <p className="mt-2.5 font-serif text-2xl font-semibold">{value}</p>
              <p className="mt-1 text-[11px] text-ink-faint">{sub}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        {/* Incoming orders */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold">Incoming orders</h2>
            <span className="rounded-full bg-parchment px-3 py-1 text-[11px] font-bold text-ink-soft">
              newest first
            </span>
          </div>
          {orders.loading ? (
            <ListSkeleton count={4} height="h-24" />
          ) : orders.error ? (
            <ErrorNote message={orders.error} onRetry={orders.refetch} />
          ) : (orders.data ?? []).filter((o) => !["delivered", "collected", "cancelled"].includes(o.status)).length ===
            0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No open orders right now"
              description="When a customer checks out, their order lands here for you to confirm — target is 10 seconds in this demo."
              action={<ButtonLink href="/vendor/products" variant="accent">Add products</ButtonLink>}
            />
          ) : (
            <ul className="space-y-3">
              {(orders.data ?? [])
                .filter((o) => !["delivered", "collected", "cancelled"].includes(o.status))
                .map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/vendor/orders/${order.id}`}
                      className="group flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-sand bg-card p-4 shadow-card transition hover:border-brand hover:shadow-lift sm:p-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">
                          {order.id}
                          <span className="ml-2 text-[11px] font-medium text-ink-faint">
                            {order.items.reduce((s, it) => s + it.qty, 0)} items · {etb(order.total)}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-ink-soft">
                          {order.fulfilmentType === "delivery" ? "Delivery" : "Pickup"} · placed{" "}
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <PaymentBadge method={order.paymentMethod} status={order.paymentStatus} />
                        <StatusBadge status={order.status} />
                        <ArrowRight size={16} className="text-ink-faint transition group-hover:translate-x-1 group-hover:text-accent" aria-hidden />
                      </div>
                    </Link>
                  </li>
                ))}
            </ul>
          )}

          {/* Recent history */}
          {orders.data && orders.data.some((o) => ["delivered", "collected", "cancelled"].includes(o.status)) && (
            <details className="mt-5 rounded-2xl border border-sand bg-card p-5 shadow-card">
              <summary className="cursor-pointer text-sm font-bold text-ink-soft">
                Completed & cancelled ({orders.data.filter((o) => ["delivered", "collected", "cancelled"].includes(o.status)).length})
              </summary>
              <ul className="mt-4 space-y-2.5">
                {orders.data
                  .filter((o) => ["delivered", "collected", "cancelled"].includes(o.status))
                  .map((order) => (
                    <li key={order.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-cream px-4 py-3">
                      <Link href={`/vendor/orders/${order.id}`} className="text-xs font-bold hover:underline">
                        {order.id}
                      </Link>
                      <span className="text-xs text-ink-faint">{etb(order.total)}</span>
                      <StatusBadge status={order.status} />
                    </li>
                  ))}
              </ul>
            </details>
          )}
        </section>

        {/* Side: SLA + trend + notifications */}
        <aside className="space-y-5">
          {stats?.avgConfirmationMs !== null && stats?.avgConfirmationMs !== undefined && (
            <div className="rounded-2xl border border-sand bg-mint p-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-moss">
                <Timer size={14} aria-hidden /> Confirmation speed
              </p>
              <p className="mt-2 font-serif text-3xl font-semibold text-ink">
                {(stats.avgConfirmationMs / 1000).toFixed(1)}s
              </p>
              <p className="mt-1 text-xs leading-5 text-moss/80">
                Average time from order placed to confirmed. The assignment&apos;s target is 10 seconds.
              </p>
            </div>
          )}

          {/* 7-day bar chart, pure CSS */}
          <div className="rounded-2xl border border-sand bg-card p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">Revenue · last 7 days</p>
            <div className="mt-4 flex h-28 items-end gap-2" role="img" aria-label="Revenue for the last 7 days">
              {(summary.data?.trend ?? []).map((d) => {
                const max = Math.max(...(summary.data?.trend ?? []).map((x) => x.revenue), 1);
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-t-md bg-moss/80 transition-all hover:bg-accent"
                      style={{ height: `${Math.max((d.revenue / max) * 100, d.revenue > 0 ? 8 : 2)}%` }}
                      title={`${d.label}: ${etb(d.revenue)} (${d.orders} orders)`}
                    />
                    <span className="text-[9px] font-bold text-ink-faint">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <NotificationFeed notifications={notifications.data ?? []} title="Your alerts" compact />
        </aside>
      </div>
    </div>
  );
}
