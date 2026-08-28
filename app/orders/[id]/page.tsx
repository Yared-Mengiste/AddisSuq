"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, ReceiptText, Store, Timer, Truck } from "lucide-react";
import { NotificationFeed } from "@/components/notification-feed";
import { OrderTimeline } from "@/components/order-timeline";
import { PaymentBadge, StatusBadge, buttonClasses, ErrorNote, ListSkeleton } from "@/components/ui";
import { useApi } from "@/lib/client";
import { etb, formatDate, formatDateTime } from "@/lib/geo";
import { CONFIRMATION_TARGET_SECONDS } from "@/lib/rules";
import type { AppNotification, Customer, Order, Shop } from "@/types";

interface OrderDetail {
  order: Order;
  shop: Shop | null;
  customer: Customer | null;
  notifications: AppNotification[];
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, refetch } = useApi<OrderDetail>(`/api/orders/${id}`);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
        <ListSkeleton count={3} height="h-40" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
        <ErrorNote message={error ?? "Order not found"} onRetry={refetch} />
      </div>
    );
  }

  const { order, shop, notifications } = data;
  const confirmedIn = order.confirmationMs !== null ? Math.round(order.confirmationMs / 1000) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 lg:py-12">
      <Link href="/orders" className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft transition hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> All orders
      </Link>

      {/* Header */}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Order {order.id}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
            {shop && (
              <Link href={`/shops/${shop.id}`} className="flex items-center gap-1.5 font-semibold text-ink hover:text-accent">
                <Store size={14} className="text-accent" aria-hidden /> {shop.name}
              </Link>
            )}
            <span>placed {formatDateTime(order.createdAt)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusBadge status={order.status} />
          <PaymentBadge method={order.paymentMethod} status={order.paymentStatus} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        {/* Timeline + items */}
        <div className="space-y-6">
          <OrderTimeline order={order} />

          {/* Confirmation SLA note */}
          {confirmedIn !== null && (
            <p className="flex items-center gap-2 rounded-2xl bg-mint px-5 py-4 text-sm text-moss">
              <Timer size={16} aria-hidden />
              The shop confirmed in <strong>{confirmedIn}s</strong> — target is {CONFIRMATION_TARGET_SECONDS}s.
            </p>
          )}

          {/* Items */}
          <section className="rounded-2xl border border-sand bg-card p-5 shadow-card">
            <h2 className="font-serif text-lg font-semibold">Items</h2>
            <ul className="mt-4 divide-y divide-sand">
              {order.items.map((item) => (
                <li key={item.productId} className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link href={`/products/${item.productId}`} className="line-clamp-1 text-sm font-semibold hover:underline">
                      {item.nameEn}
                    </Link>
                    <p className="font-am mt-0.5 text-xs text-ink-soft">{item.nameAm}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {item.qty} × {etb(item.price)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold">{etb(item.price * item.qty)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-1.5 border-t border-sand pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-semibold">{etb(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery fee</dt>
                <dd className="font-semibold">{order.deliveryFee === 0 ? "Free" : etb(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-sand pt-2.5 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-bold">{etb(order.total)}</dd>
              </div>
            </dl>
          </section>

          {/* Notification feed */}
          <NotificationFeed notifications={notifications} title={`Notifications for ${order.id}`} />
        </div>

        {/* Side panel */}
        <aside className="space-y-5 lg:sticky lg:top-32">
          <div className="rounded-2xl border border-sand bg-card p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
              {order.fulfilmentType === "delivery" ? <Truck size={17} className="text-accent" aria-hidden /> : <MapPin size={17} className="text-accent" aria-hidden />}
              {order.fulfilmentType === "delivery" ? "Delivery details" : "Pickup details"}
            </h2>
            <dl className="mt-4 space-y-3.5 text-sm">
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                  {order.fulfilmentType === "delivery" ? "Deliver to" : "Collect from"}
                </dt>
                <dd className="mt-1 font-semibold">
                  {order.fulfilmentType === "delivery" && order.deliveryAddress
                    ? `${order.deliveryAddress.label} — ${order.deliveryAddress.address}`
                    : shop?.address ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Scheduled</dt>
                <dd className="mt-1 font-semibold">
                  {order.slot ? `${formatDate(order.slot.date)} · ${order.slot.window}` : "—"}
                </dd>
              </div>
              {order.fulfilmentType === "delivery" && (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Distance</dt>
                  <dd className="mt-1 font-semibold">{order.distanceKm.toFixed(1)} km</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Payment</dt>
                <dd className="mt-1 flex items-center gap-2 font-semibold">
                  <ReceiptText size={14} aria-hidden />
                  {order.paymentRef ? `${order.paymentRef}` : "Due on handover"}
                </dd>
              </div>
            </dl>
          </div>

          {order.customerNote && (
            <div className="rounded-2xl border border-sand bg-parchment p-5 text-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Your note</p>
              <p className="mt-1.5 leading-6 text-ink-soft">“{order.customerNote}”</p>
            </div>
          )}

          <Link href="/search" className={buttonClasses("outline", "w-full")}>
            Order something else
          </Link>
        </aside>
      </div>
    </div>
  );
}
