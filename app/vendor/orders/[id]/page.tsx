"use client";

import { use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCheck, MapPin, ReceiptText, Store, Timer, Truck, UserRound } from "lucide-react";
import { NotificationFeed } from "@/components/notification-feed";
import { OrderTimeline } from "@/components/order-timeline";
import { useAuth } from "@/components/providers/auth-context";
import { PaymentBadge, StatusBadge, buttonClasses, EmptyState, ErrorNote, ListSkeleton } from "@/components/ui";
import { api, useApi } from "@/lib/client";
import { etb, formatDate, formatDateTime } from "@/lib/geo";
import { CONFIRMATION_TARGET_SECONDS, ORDER_STATUS_META, isTerminal, nextStatuses } from "@/lib/rules";
import type { AppNotification, Customer, Order, OrderStatus, Shop } from "@/types";

interface OrderDetail {
  order: Order;
  shop: Shop | null;
  customer: Customer | null;
  notifications: AppNotification[];
}

export default function VendorOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { vendorShopId, vendorShop } = useAuth();
  const { data, loading, error, refetch } = useApi<OrderDetail>(`/api/orders/${id}`);
  const [busy, setBusy] = useState(false);

  async function advance(status: OrderStatus, note?: string) {
    setBusy(true);
    try {
      await api(`/api/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, note, by: "vendor" }),
      });
      toast.success(`Order ${ORDER_STATUS_META[status].label.toLowerCase()}`, {
        description: `The customer got a simulated ${ORDER_STATUS_META[status].label.toLowerCase()} SMS.`,
      });
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const [now] = useState(() => Date.now());

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

  const { order, shop, customer, notifications } = data;
  const isMyShop = order.shopId === vendorShopId;
  const moves = isTerminal(order.status) ? [] : nextStatuses(order.status, order.fulfilmentType);
  const confirmedIn = order.confirmationMs !== null ? Math.round(order.confirmationMs / 1000) : null;
  const slaBreached =
    order.status === "placed" &&
    now - new Date(order.createdAt).getTime() > CONFIRMATION_TARGET_SECONDS * 1000;

  if (!isMyShop) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
        <EmptyState
          icon={Store}
          title="Not your order"
          description={`This order belongs to another shop. You are managing ${vendorShop?.name ?? "no shop"} — switch the demo shop from the header if you want to act on it.`}
          action={<Link href="/vendor/dashboard" className={buttonClasses("outline")}>Back to dashboard</Link>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 lg:py-12">
      <Link href="/vendor/dashboard" className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft transition hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> Back to dashboard
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Order {order.id}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <UserRound size={14} className="text-accent" aria-hidden />
              {customer?.name ?? order.customerId}
            </span>
            <span>{customer?.phone}</span>
            <span>placed {formatDateTime(order.createdAt)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <PaymentBadge method={order.paymentMethod} status={order.paymentStatus} />
          <StatusBadge status={order.status} />
        </div>
      </header>

      {/* SLA banner while waiting for confirmation */}
      {order.status === "placed" && (
        <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 ${slaBreached ? "bg-danger-soft" : "bg-mint"}`}>
          <p className={`flex items-center gap-2 text-sm font-semibold ${slaBreached ? "text-danger" : "text-moss"}`}>
            <Timer size={16} aria-hidden />
            {slaBreached
              ? `Over ${CONFIRMATION_TARGET_SECONDS}s since placement — confirm now to keep the promise.`
              : `Confirm within ${CONFIRMATION_TARGET_SECONDS} seconds of placement (Module D rule).`}
          </p>
          <button onClick={() => advance("confirmed")} disabled={busy} className={buttonClasses("accent", "text-xs")}>
            <CheckCheck size={14} aria-hidden /> Confirm order
          </button>
        </div>
      )}

      {confirmedIn !== null && (
        <p className="mb-6 rounded-2xl bg-mint px-5 py-3.5 text-sm text-moss">
          <Timer size={15} className="mr-1.5 inline" aria-hidden />
          Confirmed in <strong>{confirmedIn}s</strong> · target {CONFIRMATION_TARGET_SECONDS}s
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-6">
          <OrderTimeline order={order} />

          {/* Items */}
          <section className="rounded-2xl border border-sand bg-card p-5 shadow-card">
            <h2 className="font-serif text-lg font-semibold">Items to pack</h2>
            <ul className="mt-4 divide-y divide-sand">
              {order.items.map((item) => (
                <li key={item.productId} className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold">{item.nameEn}</p>
                    <p className="font-am text-xs text-ink-soft">{item.nameAm}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {item.qty} × {etb(item.price)} · {item.productId}
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
                <dt className="text-ink-soft">Delivery fee {order.fulfilmentType === "delivery" ? `(${order.distanceKm.toFixed(1)} km)` : "(pickup)"}</dt>
                <dd className="font-semibold">{order.deliveryFee === 0 ? "Free" : etb(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-sand pt-2.5 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-bold">{etb(order.total)}</dd>
              </div>
            </dl>
          </section>

          <NotificationFeed notifications={notifications} title={`Customer messages for ${order.id}`} />
        </div>

        {/* Side: actions + delivery info */}
        <aside className="space-y-5 lg:sticky lg:top-32">
          {/* Next actions */}
          <div className="rounded-2xl border border-sand bg-card p-5 shadow-card">
            <h2 className="font-serif text-lg font-semibold">Next steps</h2>
            {isTerminal(order.status) ? (
              <p className="mt-3 rounded-xl bg-ok-soft px-4 py-3 text-sm font-semibold text-ok">
                This order is complete — no further action needed.
              </p>
            ) : moves.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">No moves available.</p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {moves.map((status) => {
                  const meta = ORDER_STATUS_META[status];
                  const primary = status !== "cancelled";
                  return (
                    <button
                      key={status}
                      onClick={() => (status === "cancelled" ? cancelFlow() : advance(status))}
                      disabled={busy}
                      className={buttonClasses(primary ? "accent" : "danger", "w-full")}
                    >
                      {status === "cancelled" ? "Cancel order…" : `Mark as ${meta.label}`}
                      {primary && <ArrowRight size={15} aria-hidden />}
                    </button>
                  );
                })}
                <p className="text-[11px] leading-4 text-ink-faint">
                  Each move follows the assignment&apos;s state machine and sends the customer a simulated SMS update.
                </p>
              </div>
            )}
          </div>

          {/* Fulfilment info */}
          <div className="rounded-2xl border border-sand bg-card p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
              {order.fulfilmentType === "delivery" ? <Truck size={17} className="text-accent" aria-hidden /> : <MapPin size={17} className="text-accent" aria-hidden />}
              {order.fulfilmentType === "delivery" ? "Deliver to" : "Pickup"}
            </h2>
            <dl className="mt-4 space-y-3.5 text-sm">
              {order.fulfilmentType === "delivery" && order.deliveryAddress ? (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Address</dt>
                  <dd className="mt-1 font-semibold">{order.deliveryAddress.address}</dd>
                  <dd className="text-xs text-ink-soft">
                    {order.deliveryAddress.label} · {order.deliveryAddress.subCity} · {order.distanceKm.toFixed(1)} km away
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Collect at</dt>
                  <dd className="mt-1 font-semibold">{shop?.address}</dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                  {order.fulfilmentType === "delivery" ? "Delivery window" : "Ready for"}
                </dt>
                <dd className="mt-1 font-semibold">{order.slot ? `${formatDate(order.slot.date)} · ${order.slot.window}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Payment</dt>
                <dd className="mt-1 flex items-center gap-2 font-semibold">
                  <ReceiptText size={14} aria-hidden />
                  {order.paymentStatus === "paid"
                    ? `Paid (${order.paymentRef ?? "receipt"})`
                    : order.paymentMethod === "cod"
                      ? `${etb(order.total)} — collect on handover`
                      : "Pending"}
                </dd>
              </div>
            </dl>
          </div>

          {order.customerNote && (
            <div className="rounded-2xl border border-sand bg-parchment p-5 text-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Customer note</p>
              <p className="mt-1.5 leading-6 text-ink-soft">“{order.customerNote}”</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );

  function cancelFlow() {
    const reason = window.prompt("Reason for cancelling (shown to the customer):", "");
    if (reason === null) return;
    advance("cancelled", reason.trim() || "Cancelled by the shop");
  }
}
