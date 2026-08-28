"use client";

import { use, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Mail, MapPin, Package, ReceiptText, Store, Truck } from "lucide-react";
import { PaymentBadge, buttonClasses, ErrorNote, ListSkeleton } from "@/components/ui";
import { useApi } from "@/lib/client";
import { etb, formatDate } from "@/lib/geo";
import type { Order, Shop } from "@/types";

function ConfirmationInner({ orderId }: { orderId: string }) {
  const params = useSearchParams();
  const alsoIds = (params.get("also") ?? "").split(",").filter(Boolean);
  const { data, loading, error } = useApi<{ order: Order; shop: Shop | null }>(`/api/orders/${orderId}`);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 lg:px-8 lg:py-16">
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ok-soft text-ok">
          <CheckCircle2 size={34} aria-hidden />
        </span>
        <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight">Order placed!</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          The shop has been notified and should confirm{" "}
          <strong className="text-ink">within 10 seconds</strong>. You&apos;ll see simulated SMS updates on the tracking
          page.
        </p>
      </div>

      <div className="mt-8">
        {loading ? (
          <ListSkeleton count={2} height="h-28" />
        ) : error || !data ? (
          <ErrorNote message={error ?? "Order not found"} />
        ) : (
          <>
            <div className="rounded-2xl border border-sand bg-card p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-serif text-xl font-semibold">
                  <ReceiptText size={18} className="text-accent" aria-hidden /> {data.order.id}
                </p>
                <PaymentBadge method={data.order.paymentMethod} status={data.order.paymentStatus} />
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Shop</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-semibold">
                    <Store size={14} className="text-accent" aria-hidden /> {data.shop?.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Total</dt>
                  <dd className="mt-1 font-semibold">{etb(data.order.total)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                    {data.order.fulfilmentType === "delivery" ? "Delivery" : "Pickup"}
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-semibold">
                    {data.order.fulfilmentType === "delivery" ? (
                      <>
                        <Truck size={14} aria-hidden /> {data.order.distanceKm.toFixed(1)} km
                      </>
                    ) : (
                      <>
                        <MapPin size={14} aria-hidden /> in store
                      </>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Scheduled</dt>
                  <dd className="mt-1 font-semibold">
                    {data.order.slot ? `${formatDate(data.order.slot.date)} · ${data.order.slot.window}` : "—"}
                  </dd>
                </div>
              </dl>
              {data.order.paymentRef && (
                <p className="mt-5 flex items-center gap-2 rounded-xl bg-mint px-4 py-3 text-xs font-semibold text-moss">
                  <Mail size={14} aria-hidden /> Payment reference {data.order.paymentRef} (simulated receipt e-mail logged)
                </p>
              )}
              <p className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
                <Package size={13} aria-hidden /> {data.order.items.length} item{data.order.items.length === 1 ? "" : "s"} · stock reserved immediately
              </p>
            </div>

            {alsoIds.length > 0 && (
              <div className="mt-4 rounded-2xl border border-sand bg-card p-5">
                <p className="text-sm font-bold">Also placed from other shops</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {alsoIds.map((id) => (
                    <li key={id}>
                      <Link href={`/orders/${id}`} className={buttonClasses("outline", "text-xs")}>
                        Track {id}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={`/orders/${orderId}`} className={buttonClasses("accent", "py-3.5")}>
          Track this order <ArrowRight size={16} aria-hidden />
        </Link>
        <Link href="/search" className={buttonClasses("outline", "py-3.5")}>
          Keep shopping
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmationPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-16"><ListSkeleton count={2} /></div>}>
      <ConfirmationInner orderId={orderId} />
    </Suspense>
  );
}
