"use client";

import Link from "next/link";
import { ArrowRight, PackageOpen, Store, Truck } from "lucide-react";
import { useAuth } from "@/components/providers/auth-context";
import { PaymentBadge, StatusBadge, buttonClasses, EmptyState, ErrorNote, ListSkeleton } from "@/components/ui";
import { useApi } from "@/lib/client";
import { etb, formatDate } from "@/lib/geo";
import type { Order } from "@/types";

export default function OrdersPage() {
  const { customer } = useAuth();
  const ordersApi = useApi<Order[]>(customer ? `/api/orders?customerId=${customer.id}` : null);
  const shopsApi = useApi<import("@/types").Shop[]>("/api/shops?status=all");
  const shopName = (id: string) => shopsApi.data?.find((s) => s.id === id)?.name ?? id;
  const { data, loading, error, refetch } = ordersApi;

  const active = (data ?? []).filter((o) => !["delivered", "collected", "cancelled"].includes(o.status));
  const past = (data ?? []).filter((o) => ["delivered", "collected", "cancelled"].includes(o.status));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="mb-7">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">My orders</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {customer ? <>Signed in as <strong className="text-ink">{customer.name}</strong> — switch users from the header.</> : "Loading your profile…"}
        </p>
      </header>

      {loading ? (
        <ListSkeleton count={4} height="h-24" />
      ) : error ? (
        <ErrorNote message={error} onRetry={refetch} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No orders yet"
          description="When you order from a shop, you'll be able to follow every step right here."
          action={
            <Link href="/search" className={buttonClasses("accent")}>
              Browse the market <ArrowRight size={15} aria-hidden />
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {[
            { title: "Active", orders: active },
            { title: "History", orders: past },
          ].map(({ title, orders }) =>
            orders.length === 0 ? null : (
              <section key={title} aria-label={`${title} orders`}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
                  {title} · {orders.length}
                </h2>
                <ul className="space-y-3">
                  {orders.map((order) => (
                    <li key={order.id}>
                      <Link
                        href={`/orders/${order.id}`}
                        className="group flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-sand bg-card p-4 shadow-card transition hover:border-brand hover:shadow-lift sm:p-5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-sm font-bold">
                            <Store size={14} className="text-accent" aria-hidden />
                            {shopName(order.shopId)}
                            <span className="text-[11px] font-medium text-ink-faint">{order.id}</span>
                          </p>
                          <p className="mt-1 text-xs text-ink-soft">
                            {order.items.length} item{order.items.length === 1 ? "" : "s"} · {etb(order.total)} ·{" "}
                            {formatDate(order.createdAt)}
                          </p>
                          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
                            {order.fulfilmentType === "delivery" ? (
                              <>
                                <Truck size={12} aria-hidden /> Delivery
                              </>
                            ) : (
                              <>
                                <Store size={12} aria-hidden /> Pickup
                              </>
                            )}
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
              </section>
            )
          )}
        </div>
      )}
    </div>
  );
}
