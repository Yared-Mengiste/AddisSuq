"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  Check,
  CreditCard,
  Loader2,
  MapPin,
  ShoppingBag,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-context";
import { useCart } from "@/components/providers/cart-context";
import { useLang } from "@/components/providers/lang-context";
import { buttonClasses, EmptyState, ErrorNote } from "@/components/ui";
import { api } from "@/lib/client";
import { distanceKm, etb } from "@/lib/geo";
import { DELIVERY_FEE_BANDS, FREE_DELIVERY_THRESHOLD, MAX_DELIVERY_RADIUS_KM, PAYMENT_METHODS, deliveryFeeFor, feeBandLabel } from "@/lib/rules";
import type { Order, Shop } from "@/types";

const WINDOWS = ["Morning (9 – 12)", "Midday (12 – 3)", "Afternoon (3 – 6)", "Evening (6 – 8)"];

function nextDays(count: number): { value: string; label: string }[] {
  const days: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    days.push({
      value: d.toISOString().slice(0, 10),
      label:
        i === 0
          ? "Today"
          : i === 1
            ? "Tomorrow"
            : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
    });
  }
  return days;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { groups, clear, count } = useCart();
  const { customer } = useAuth();
  const { lang } = useLang();
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [shopsError, setShopsError] = useState<string | null>(null);
  const [fulfilment, setFulfilment] = useState<Record<string, "delivery" | "pickup">>({});
  const [addressId, setAddressId] = useState<string>("");
  const [dateByShop, setDateByShop] = useState<Record<string, string>>({});
  const [windowByShop, setWindowByShop] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<"telebirr" | "cbebirr" | "chapa" | "cod">("telebirr");
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [payStep, setPayStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch shops once for coordinates + delivery radius.
  const [shopsFetched, setShopsFetched] = useState(false);
  useEffect(() => {
    if (shopsFetched) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShopsFetched(true);
    api<Shop[]>("/api/shops")
      .then((list) => {
        setShops(list);
        // Default fulfilment: delivery when the shop offers it.
        const defaults: Record<string, "delivery" | "pickup"> = {};
        for (const g of groups) {
          const shop = list.find((s) => s.id === g.shopId);
          defaults[g.shopId] = shop?.offersDelivery ? "delivery" : "pickup";
        }
        setFulfilment((prev) => ({ ...defaults, ...prev }));
      })
      .catch((e: Error) => setShopsError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopsFetched]);

  const days = nextDays(3);
  const address = useMemo(() => {
    if (!customer) return null;
    return (
      customer.savedAddresses.find((a) => a.id === (addressId || customer.defaultAddressId)) ??
      customer.savedAddresses[0] ??
      null
    );
  }, [customer, addressId]);

  /** Per-group computed summary: distance, fee, slot. */
  const summaries = useMemo(() => {
    return groups.map((g) => {
      const shop = shops?.find((s) => s.id === g.shopId) ?? null;
      const mode = fulfilment[g.shopId] ?? "delivery";
      const dist = shop && address ? distanceKm({ lat: address.lat, lng: address.lng }, { lat: shop.lat, lng: shop.lng }) : 0;
      const tooFar = mode === "delivery" && dist > MAX_DELIVERY_RADIUS_KM;
      const fee = deliveryFeeFor(dist, mode, g.subtotal);
      return { group: g, shop, mode, dist, fee, tooFar };
    });
  }, [groups, shops, fulfilment, address]);

  const anyDelivery = summaries.some((s) => s.mode === "delivery");
  const grandTotal = summaries.reduce((sum, s) => sum + s.group.subtotal + s.fee, 0);
  const allFees = summaries.reduce((sum, s) => sum + s.fee, 0);
  const online = paymentMethod !== "cod";

  const canPlace =
    groups.length > 0 &&
    customer !== null &&
    (!anyDelivery || address !== null) &&
    summaries.every((s) => !s.tooFar) &&
    !placing;

  async function placeOrders() {
    if (!customer) return;
    setError(null);
    setPlacing(true);

    try {
      // Simulated payment: fake delay while the "gateway" processes.
      if (online) {
        const label = PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label ?? "Payment";
        setPayStep(`Contacting ${label}…`);
        await new Promise((r) => setTimeout(r, 1500));
        setPayStep("Verifying payment…");
        await new Promise((r) => setTimeout(r, 900));
      }

      const orders = summaries.map((s) => ({
        shopId: s.group.shopId,
        customerId: customer.id,
        items: s.group.lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        fulfilmentType: s.mode,
        paymentMethod,
        slot: {
          date: dateByShop[s.group.shopId] ?? days[0].value,
          window: s.mode === "pickup" ? "Any time during trading hours" : windowByShop[s.group.shopId] ?? WINDOWS[0],
          label: s.mode === "delivery" ? "Delivery" : "Pickup",
        },
        deliveryAddress: s.mode === "delivery" && address ? address : null,
        customerNote: note.trim() || undefined,
      }));

      const res = await api<{ orders: Order[]; problems: { shopId: string; error: string }[] }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ orders }),
      });

      if (res.problems.length > 0) {
        setError(res.problems.map((p) => p.error).join(" · "));
        if (res.orders.length === 0) {
          setPlacing(false);
          setPayStep(null);
          return;
        }
      }

      clear();
      const ids = res.orders.map((o) => o.id);
      router.push(`/checkout/confirmation/${ids[0]}${ids.length > 1 ? `?also=${ids.slice(1).join(",")}` : ""}`);
    } catch (e) {
      setError((e as Error).message);
      setPlacing(false);
      setPayStep(null);
    }
  }

  if (count === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14 lg:px-8">
        <EmptyState
          icon={ShoppingBag}
          title="Nothing to check out"
          description="Your cart is empty — add a few items first and come back."
          action={
            <Link href="/search" className={buttonClasses("accent")}>
              Browse products <ArrowRight size={15} aria-hidden />
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8 lg:py-12">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Checkout</h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        {groups.length} order{groups.length === 1 ? "" : "s"} · one per shop · pay once
      </p>

      {shopsError && (
        <div className="mt-5">
          <ErrorNote message={shopsError} />
        </div>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-6">
          {/* ---- Fulfilment per shop ---- */}
          {summaries.map(({ group, shop, mode, dist, fee, tooFar }) => (
            <section key={group.shopId} className="rounded-2xl border border-sand bg-card p-5 shadow-card">
              <header className="mb-4 flex items-center gap-2">
                <Store size={16} className="text-accent" aria-hidden />
                <h2 className="font-serif text-lg font-semibold">{group.shopName || "Shop"}</h2>
                <span className="ml-auto text-xs text-ink-faint">{group.lines.length} item{group.lines.length === 1 ? "" : "s"} · {etb(group.subtotal)}</span>
              </header>

              {/* Delivery vs pickup */}
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Fulfilment type">
                {(
                  [
                    { value: "delivery", label: "Delivery", icon: Truck, disabled: !shop?.offersDelivery },
                    { value: "pickup", label: "Pickup", icon: Store, disabled: !shop?.offersPickup },
                  ] as const
                ).map(({ value, label, icon: Icon, disabled }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={mode === value}
                    disabled={disabled}
                    onClick={() => setFulfilment((prev) => ({ ...prev, [group.shopId]: value }))}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                      mode === value
                        ? "border-brand bg-mint text-ink"
                        : "border-sand-deep bg-cream text-ink-soft hover:border-brand disabled:opacity-40"
                    }`}
                  >
                    <Icon size={16} aria-hidden /> {label}
                  </button>
                ))}
              </div>

              {mode === "delivery" ? (
                <div className="mt-4 space-y-3 rounded-xl bg-parchment/70 p-4 text-sm">
                  <p className="flex items-center gap-2 text-ink-soft">
                    <MapPin size={14} className="text-accent" aria-hidden />
                    {dist.toFixed(1)} km away · band {feeBandLabel(dist)} ·{" "}
                    <strong className="text-ink">{fee === 0 ? "free" : etb(fee)}</strong>
                  </p>
                  {tooFar && (
                    <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs font-semibold text-warn">
                      Beyond {MAX_DELIVERY_RADIUS_KM} km — this shop can only offer pickup.{" "}
                      <button className="underline" onClick={() => setFulfilment((prev) => ({ ...prev, [group.shopId]: "pickup" }))}>
                        Switch to pickup
                      </button>
                    </p>
                  )}
                  {fee === 0 && !tooFar && (
                    <p className="text-xs text-moss">
                      {group.subtotal >= FREE_DELIVERY_THRESHOLD
                        ? "Free delivery — order over " + etb(FREE_DELIVERY_THRESHOLD)
                        : "No delivery fee for this order"}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-parchment/70 px-4 py-3 text-xs leading-5 text-ink-soft">
                  Collect from <strong className="text-ink">{shop?.address ?? group.shopName}</strong> during trading
                  hours ({shop?.tradingHours.open}–{shop?.tradingHours.close}). No delivery fee.
                </p>
              )}

              {/* Scheduling */}
              <div className="mt-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-faint">
                  <CalendarClock size={13} aria-hidden /> {mode === "delivery" ? "Delivery" : "Pickup"} day
                </p>
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => {
                    const active = (dateByShop[group.shopId] ?? days[0].value) === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDateByShop((prev) => ({ ...prev, [group.shopId]: d.value }))}
                        className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                          active ? "border-accent bg-peach text-accent-deep" : "border-sand-deep bg-cream text-ink-soft hover:border-brand"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                {mode === "delivery" && (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {WINDOWS.map((w) => {
                      const active = (windowByShop[group.shopId] ?? WINDOWS[0]) === w;
                      return (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setWindowByShop((prev) => ({ ...prev, [group.shopId]: w }))}
                          className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                            active ? "border-accent bg-peach text-accent-deep" : "border-sand-deep bg-cream text-ink-soft hover:border-brand"
                          }`}
                        >
                          {w}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          ))}

          {/* ---- Address ---- */}
          {anyDelivery && customer && (
            <section className="rounded-2xl border border-sand bg-card p-5 shadow-card">
              <h2 className="font-serif text-lg font-semibold">Deliver to</h2>
              {customer.savedAddresses.length === 0 ? (
                <p className="mt-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
                  No saved address yet — add one in <Link href="/account" className="underline">your account</Link> before ordering delivery.
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5" role="radiogroup" aria-label="Delivery address">
                  {customer.savedAddresses.map((a) => {
                    const selected = (address?.id) === a.id;
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setAddressId(a.id)}
                          className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
                            selected ? "border-brand bg-mint" : "border-sand-deep bg-cream hover:border-brand"
                          }`}
                        >
                          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-brand bg-brand text-white" : "border-sand-deep"}`}>
                            {selected && <Check size={12} aria-hidden />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-bold">
                              {a.label} <span className="ml-1 rounded-full bg-card px-2 py-0.5 text-[10px] text-ink-faint">{a.subCity}</span>
                            </span>
                            <span className="mt-0.5 block text-xs leading-5 text-ink-soft">{a.address}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {address && (
                <p className="mt-3 text-[11px] text-ink-faint">
                  Simulated GPS: {address.lat.toFixed(4)}, {address.lng.toFixed(4)} — distances and delivery bands are computed from this point.
                </p>
              )}
            </section>
          )}

          {/* ---- Payment ---- */}
          <section className="rounded-2xl border border-sand bg-card p-5 shadow-card">
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
              <CreditCard size={17} className="text-accent" aria-hidden /> Payment method
            </h2>
            <p className="mt-1 text-xs text-ink-faint">
              Simulated in this prototype — no real gateway is contacted. Payment methods are explained in{" "}
              {lang === "am" ? <span className="font-am">አማርኛ</span> : "English"} on the buttons.
            </p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {PAYMENT_METHODS.map((m) => {
                const selected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
                      selected ? "border-brand bg-mint" : "border-sand-deep bg-cream hover:border-brand"
                    }`}
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${selected ? "bg-brand text-cream" : "bg-parchment text-ink-soft"}`}>
                      {m.glyph}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">
                        {m.label} <span className="font-am text-xs text-ink-soft">{m.labelAm}</span>
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-ink-soft">{m.blurb}</span>
                    </span>
                    {selected && (
                      <span className="ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-white">
                        <Check size={12} aria-hidden />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ---- Note ---- */}
          <section className="rounded-2xl border border-sand bg-card p-5 shadow-card">
            <label htmlFor="note" className="font-serif text-lg font-semibold">
              Note for the shops <span className="text-xs font-normal text-ink-faint">(optional)</span>
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Please call when you arrive at the gate"
              className="mt-3 w-full rounded-xl border border-sand-deep bg-cream px-4 py-3 text-sm outline-none placeholder:text-ink-faint focus:border-brand"
            />
          </section>
        </div>

        {/* ---- Summary ---- */}
        <aside className="lg:sticky lg:top-32">
          <div className="rounded-2xl border border-sand bg-card p-5 shadow-card">
            <h2 className="font-serif text-lg font-semibold">Order summary</h2>
            <ul className="mt-4 space-y-3 border-b border-sand pb-4">
              {summaries.map((s) => (
                <li key={s.group.shopId} className="text-sm">
                  <p className="flex justify-between gap-2">
                    <span className="min-w-0 truncate font-semibold">{s.group.shopName || "Shop"}</span>
                    <span className="shrink-0 font-bold">{etb(s.group.subtotal + s.fee)}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">
                    {s.mode === "delivery" ? `Delivery · ${s.dist.toFixed(1)} km` : "Pickup"}
                    {s.fee > 0 ? ` · fee ${etb(s.fee)}` : s.mode === "delivery" ? " · free" : ""}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-b border-sand py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-semibold">{etb(grandTotal - allFees)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery fees</dt>
                <dd className="font-semibold">{allFees === 0 ? "Free" : etb(allFees)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Payment</dt>
                <dd className="font-semibold">{PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label}</dd>
              </div>
            </dl>
            <div className="flex items-baseline justify-between pt-4">
              <span className="font-bold">Total</span>
              <span className="text-2xl font-bold">{etb(grandTotal)}</span>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-xs font-semibold text-danger" role="alert">
                {error}
              </p>
            )}

            <button
              onClick={placeOrders}
              disabled={!canPlace}
              className={buttonClasses("accent", "mt-5 w-full py-3.5 text-base")}
            >
              {placing ? (
                <>
                  <Loader2 size={17} className="animate-spin" aria-hidden />
                  {payStep ?? "Placing your order…"}
                </>
              ) : (
                <>
                  <Wallet size={17} aria-hidden />
                  {online ? "Pay & place order" : "Place order · pay cash"}
                </>
              )}
            </button>
            <p className="mt-3 text-center text-[11px] leading-4 text-ink-faint">
              {online
                ? "You'll see a short simulated gateway delay, then a confirmation screen."
                : "Pay the rider or shop on handover. Vendors confirm within 10 seconds in this demo."}
            </p>
            <p className="mt-2 text-center text-[11px] leading-4 text-ink-faint">
              Delivery bands: {DELIVERY_FEE_BANDS.map((b) => `${b.label} = ${b.fee}`).join(" · ")}
            </p>
          </div>
        </aside>
      </div>

      {/* Payment overlay */}
      {placing && payStep && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-brand-deep/70 p-4" role="alertdialog" aria-label="Processing payment">
          <div className="w-full max-w-sm rounded-2xl bg-card p-8 text-center shadow-lift">
            <Loader2 size={40} className="mx-auto animate-spin text-accent" aria-hidden />
            <p className="mt-5 font-serif text-xl font-semibold">Processing payment</p>
            <p className="mt-2 text-sm text-ink-soft">{payStep}</p>
            <p className="mt-4 text-[11px] text-ink-faint">Simulated — no real money moves in this demo.</p>
          </div>
        </div>
      )}
    </div>
  );
}
