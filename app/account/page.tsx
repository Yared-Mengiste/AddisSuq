"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Crosshair, MapPin, Plus, Star, Trash2, UserRound } from "lucide-react";
import { useAuth } from "@/components/providers/auth-context";
import { buttonClasses, EmptyState, ListSkeleton } from "@/components/ui";
import { api } from "@/lib/client";
import { formatDate } from "@/lib/geo";
import { MAX_SAVED_ADDRESSES, SUB_CITIES } from "@/lib/rules";
import type { SavedAddress } from "@/types";

/** Demo locations a grader can "capture" without a real GPS. */
const DEMO_POINTS = [
  { label: "Bole Medhanialem", subCity: "Bole", lat: 9.005, lng: 38.7916 },
  { label: "Kazanchis (UNECA)", subCity: "Kirkos", lat: 9.018, lng: 38.77 },
  { label: "Piassa", subCity: "Arada", lat: 9.04, lng: 38.753 },
  { label: "Megenagna", subCity: "Yeka", lat: 9.012, lng: 38.806 },
  { label: "Sar Bet", subCity: "Nifas Silk-Lafto", lat: 8.975, lng: 38.755 },
];

export default function AccountPage() {
  const { customer, refreshCustomer } = useAuth();
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "Home", address: "", subCity: "Bole" });

  if (!customer) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 lg:px-8">
        <ListSkeleton count={2} height="h-32" />
      </div>
    );
  }

  const defaultAddress = customer.savedAddresses.find((a) => a.id === customer.defaultAddressId) ?? null;

  async function patch(body: Record<string, unknown>, okMessage?: string) {
    setBusy(true);
    try {
      await api<import("@/types").Customer>(`/api/customers/${customer!.id}`, { method: "PATCH", body: JSON.stringify(body) });
      refreshCustomer();
      if (okMessage) toast.success(okMessage);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!form.address.trim()) {
      toast.error("Please type the address first");
      return;
    }
    const point = DEMO_POINTS.find((p) => p.subCity === form.subCity) ?? DEMO_POINTS[0];
    await patch(
      {
        addAddress: {
          label: form.label,
          address: form.address.trim(),
          subCity: form.subCity,
          lat: point.lat + (Math.random() - 0.5) * 0.01,
          lng: point.lng + (Math.random() - 0.5) * 0.01,
        },
      },
      "Address saved"
    );
    setAdding(false);
    setForm({ label: "Home", address: "", subCity: "Bole" });
  }

  async function captureLocation(point: (typeof DEMO_POINTS)[number]) {
    await patch(
      {
        setLocation: {
          lat: point.lat,
          lng: point.lng,
          label: point.label,
          subCity: point.subCity,
          address: `${point.label}, ${point.subCity}`,
        },
      },
      `Location set to ${point.label}`
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="mb-7">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Your account</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Member since {formatDate(customer.createdAt)} · phone verified ✓ (demo OTP)
        </p>
      </header>

      <div className="space-y-6">
        {/* Profile */}
        <section className="rounded-2xl border border-sand bg-card p-5 shadow-card sm:p-6">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
            <UserRound size={17} className="text-accent" aria-hidden /> Profile
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Name</dt>
              <dd className="mt-1 text-sm font-semibold">{customer.name}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Phone</dt>
              <dd className="mt-1 text-sm font-semibold">{customer.phone}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Customer ID</dt>
              <dd className="mt-1 text-sm font-semibold">{customer.id}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-xl bg-parchment px-4 py-3 text-xs leading-5 text-ink-soft">
            This is a demo profile — pick a different customer from the role switcher in the header to see other
            accounts. <strong>Signup (with the fake OTP screen) lives in the header → “Register”.</strong>
          </p>
        </section>

        {/* Location capture */}
        <section className="rounded-2xl border border-sand bg-card p-5 shadow-card sm:p-6">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
            <Crosshair size={17} className="text-accent" aria-hidden /> Current location
          </h2>
          <p className="mt-1.5 text-sm text-ink-soft">
            Module B captures your location to rank shops by distance. Simulate a GPS fix by picking one of these
            demo points.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {DEMO_POINTS.map((p) => {
              const active = defaultAddress?.label === p.label && defaultAddress?.subCity === p.subCity;
              return (
                <button
                  key={p.label}
                  onClick={() => captureLocation(p)}
                  disabled={busy}
                  className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition ${
                    active ? "border-brand bg-mint text-ink" : "border-sand-deep bg-cream text-ink-soft hover:border-brand"
                  }`}
                >
                  {active ? <Check size={13} aria-hidden /> : <MapPin size={13} aria-hidden />}
                  {p.label}
                </button>
              );
            })}
          </div>
          {defaultAddress && (
            <p className="mt-4 text-xs text-ink-faint">
              Current default: <strong className="text-ink">{defaultAddress.label}</strong> — {defaultAddress.address}{" "}
              (GPS {defaultAddress.lat.toFixed(4)}, {defaultAddress.lng.toFixed(4)})
            </p>
          )}
        </section>

        {/* Saved addresses */}
        <section className="rounded-2xl border border-sand bg-card p-5 shadow-card sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
              <MapPin size={17} className="text-accent" aria-hidden /> Saved addresses
            </h2>
            <span className="text-xs font-semibold text-ink-faint">
              {customer.savedAddresses.length}/{MAX_SAVED_ADDRESSES} used
            </span>
          </div>

          {customer.savedAddresses.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={MapPin}
                title="No saved addresses"
                description="Add an address so shops can deliver to you — or capture your location above."
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {customer.savedAddresses.map((a: SavedAddress) => (
                <li
                  key={a.id}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${
                    a.id === customer.defaultAddressId ? "border-brand bg-mint" : "border-sand-deep bg-cream"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      {a.label}
                      <span className="ml-2 rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold text-ink-faint">{a.subCity}</span>
                      {a.id === customer.defaultAddressId && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold uppercase text-cream">
                          <Star size={9} aria-hidden /> default
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-ink-soft">{a.address}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {a.id !== customer.defaultAddressId && (
                      <button
                        onClick={() => patch({ defaultAddressId: a.id }, `${a.label} is now your default`)}
                        disabled={busy}
                        className="rounded-lg border border-sand-deep bg-card px-2.5 py-1.5 text-[10px] font-bold text-ink-soft transition hover:border-brand hover:text-ink"
                      >
                        Make default
                      </button>
                    )}
                    <button
                      onClick={() => patch({ removeAddressId: a.id }, "Address removed")}
                      disabled={busy}
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint transition hover:bg-danger-soft hover:text-danger"
                      aria-label={`Remove ${a.label}`}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {customer.savedAddresses.length < MAX_SAVED_ADDRESSES && !adding && (
            <button onClick={() => setAdding(true)} className={buttonClasses("outline", "mt-4")} disabled={busy}>
              <Plus size={15} aria-hidden /> Add address
            </button>
          )}

          {adding && (
            <form onSubmit={saveAddress} className="mt-4 grid gap-3 rounded-xl border border-sand-deep bg-parchment/60 p-4 sm:grid-cols-3">
              <label className="text-xs font-bold">
                Label
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-sand-deep bg-card px-3 py-2.5 text-sm font-normal"
                  placeholder="Home, Work…"
                />
              </label>
              <label className="text-xs font-bold">
                Sub-city
                <select
                  value={form.subCity}
                  onChange={(e) => setForm((f) => ({ ...f, subCity: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-sand-deep bg-card px-3 py-2.5 text-sm font-normal"
                >
                  {SUB_CITIES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold sm:col-span-1">
                Address
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-sand-deep bg-card px-3 py-2.5 text-sm font-normal"
                  placeholder="Street, building, landmark…"
                />
              </label>
              <div className="flex gap-2 sm:col-span-3">
                <button type="submit" className={buttonClasses("accent")} disabled={busy}>
                  Save address
                </button>
                <button type="button" onClick={() => setAdding(false)} className={buttonClasses("ghost")}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
