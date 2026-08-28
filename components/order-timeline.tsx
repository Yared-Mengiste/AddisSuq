"use client";

/**
 * Order status timeline (Module D) — a real stepper: progress line,
 * icons, timestamps and the current position, with a cancelled variant.
 */

import { Check, Clock3, Home, Package, PackageCheck, PackageOpen, Store, Truck, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatDateTime } from "@/lib/geo";
import { ORDER_STATUS_META, timelineSteps } from "@/lib/rules";
import type { Order } from "@/types";

const ICONS: Record<string, LucideIcon> = {
  placed: PackageOpen,
  confirmed: Check,
  packed: Package,
  out_for_delivery: Truck,
  ready_for_pickup: Store,
  delivered: Home,
  collected: PackageCheck,
  cancelled: X,
};

export function OrderTimeline({ order }: { order: Order }) {
  const steps = timelineSteps(order.fulfilmentType);
  const cancelled = order.status === "cancelled";
  const currentIndex = steps.indexOf(order.status);
  const events = new Map(order.statusHistory.map((h) => [h.status, h]));

  return (
    <div className="rounded-2xl border border-sand bg-card p-5 shadow-card sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="font-serif text-lg font-semibold">Order progress</h3>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-faint">
          <Clock3 size={13} aria-hidden /> updates in real time (simulated)
        </span>
      </div>

      {cancelled ? (
        <div className="rounded-xl bg-danger-soft px-4 py-3.5 text-sm text-danger">
          <p className="font-bold">Order cancelled</p>
          <p className="mt-0.5 text-[13px]">{order.cancellationReason ?? "The order was cancelled."}</p>
        </div>
      ) : (
        <ol className="relative" aria-label="Order status timeline">
          {/* Progress line behind the dots */}
          <div
            aria-hidden
            className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-sand-deep sm:left-[17px]"
          />
          <div
            aria-hidden
            className="absolute left-[15px] top-3 w-0.5 bg-moss transition-all duration-500 sm:left-[17px]"
            style={{ height: `${(Math.max(currentIndex, 0) / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step, i) => {
            const done = i <= currentIndex;
            const isCurrent = i === currentIndex;
            const event = events.get(step);
            const meta = ORDER_STATUS_META[step];
            const Icon = ICONS[step] ?? Package;

            return (
              <li key={step} className="relative flex gap-4 pb-7 last:pb-1">
                <span
                  className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition sm:h-9 sm:w-9 ${
                    done
                      ? "border-moss bg-moss text-white"
                      : "border-sand-deep bg-card text-ink-faint"
                  } ${isCurrent ? "ring-4 ring-mint" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {done ? <Check size={15} aria-hidden /> : <Icon size={15} aria-hidden />}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className={`text-sm font-bold ${done ? "text-ink" : "text-ink-faint"}`}>{meta.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-ink-soft">
                    {event ? formatDateTime(event.at) : meta.blurb}
                  </p>
                  {isCurrent && i < steps.length - 1 && (
                    <span className="mt-1 inline-block rounded-full bg-peach px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-deep">
                      Current step
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
