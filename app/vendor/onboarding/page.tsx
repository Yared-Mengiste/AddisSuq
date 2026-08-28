"use client";

/** Module A — multi-step vendor onboarding: shop info → category & hours →
 *  documents → review, ending in a "pending approval" state. */

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  FileCheck2,
  MapPin,
  Store,
  Upload,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-context";
import { buttonClasses, ErrorNote } from "@/components/ui";
import { api, useApi } from "@/lib/client";
import { SUB_CITIES } from "@/lib/rules";
import type { Category, Shop } from "@/types";

const STEPS = [
  { id: 0, label: "Shop info", icon: Store },
  { id: 1, label: "Category & hours", icon: Clock },
  { id: 2, label: "Documents", icon: FileCheck2 },
  { id: 3, label: "Review", icon: Check },
] as const;

const DEFAULT_DEMO_POINTS: Record<string, { lat: number; lng: number }> = {
  Bole: { lat: 9.01, lng: 38.795 },
  Kirkos: { lat: 8.983, lng: 38.765 },
  Arada: { lat: 9.04, lng: 38.753 },
  Yeka: { lat: 9.03, lng: 38.8 },
  "Nifas Silk-Lafto": { lat: 8.975, lng: 38.755 },
};

export default function VendorOnboardingPage() {
  const { refreshShops, setVendorShopId, vendorShopId, shops } = useAuth();
  const categories = useApi<Category[]>("/api/categories");

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Shop | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    nameAm: "",
    ownerName: "",
    phone: "",
    email: "",
    subCity: "Bole",
    address: "",
    category: "",
    tagline: "",
    open: "08:30",
    close: "20:00",
    days: "Mon – Sat",
    tradeLicenceNo: "",
    tinNumber: "",
    tradeLicenceFile: null as string | null,
    tinFile: null as string | null,
    offersDelivery: true,
    offersPickup: true,
    deliveryRadiusKm: 7,
  });

  const existing = useMemo(() => shops.find((s) => s.id === vendorShopId), [shops, vendorShopId]);

  const stepValid = (s: number): boolean => {
    if (s === 0) {
      return (
        form.name.trim().length >= 3 &&
        form.ownerName.trim().length >= 3 &&
        /^\+?\d{9,}$/.test(form.phone.replace(/\s/g, "")) &&
        form.address.trim().length >= 5
      );
    }
    if (s === 1) return form.category !== "" && form.open < form.close;
    if (s === 2) return form.tradeLicenceNo.trim().length >= 3 && form.tinNumber.trim().length >= 3;
    return true;
  };

  const allValid = stepValid(0) && stepValid(1) && stepValid(2);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const point = DEFAULT_DEMO_POINTS[form.subCity] ?? { lat: 9.0, lng: 38.78 };
      const shop = await api<Shop>("/api/shops", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          nameAm: form.nameAm.trim() || form.name.trim(),
          ownerName: form.ownerName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          subCity: form.subCity,
          address: form.address.trim(),
          lat: point.lat + (Math.random() - 0.5) * 0.008,
          lng: point.lng + (Math.random() - 0.5) * 0.008,
          category: form.category,
          tagline: form.tagline.trim(),
          tradingHours: { open: form.open, close: form.close, days: form.days },
          tradeLicenceNo: form.tradeLicenceNo.trim(),
          tinNumber: form.tinNumber.trim(),
          documents: {
            tradeLicence: form.tradeLicenceFile !== null,
            tinCertificate: form.tinFile !== null,
          },
          offersDelivery: form.offersDelivery,
          offersPickup: form.offersPickup,
          deliveryRadiusKm: form.deliveryRadiusKm,
        }),
      });
      setSubmitted(shop);
      refreshShops();
      setVendorShopId(shop.id);
      toast.success("Application submitted!", { description: `${shop.name} is now awaiting admin review.` });
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------- Success screen ---------------- */
  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 lg:px-8 lg:py-20">
        <div className="rounded-2xl border border-sand bg-card p-7 text-center shadow-card sm:p-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-warn-soft text-warn">
            <Clock size={30} aria-hidden />
          </span>
          <h1 className="mt-5 font-serif text-2xl font-semibold sm:text-3xl">Application submitted</h1>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            <strong className="text-ink">{submitted.name}</strong> has been registered and is now{" "}
            <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-bold text-warn">pending review</span>.
            An admin needs to approve it before you can receive orders. In this demo, switch to the{" "}
            <strong className="text-ink">Admin</strong> role in the header to approve it yourself.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/vendor/dashboard" className={buttonClasses("accent", "py-3")}>
              Go to vendor dashboard
            </Link>
            <Link href="/admin/vendors" className={buttonClasses("outline", "py-3")}>
              View admin approvals
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-sand-deep bg-cream px-4 py-3 text-sm outline-none transition focus:border-brand";
  const labelCls = "mb-1.5 block text-sm font-bold";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8 lg:py-12">
      <Link href="/vendor/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft transition hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> Back to dashboard
      </Link>

      <h1 className="font-serif text-3xl font-semibold tracking-tight">Register your shop</h1>
      <p className="mt-1.5 text-sm text-ink-soft">
        Module A — four short steps, then an admin reviews your application (usually same day).
      </p>

      {existing && (
        <p className="mt-5 rounded-xl bg-info-soft px-4 py-3 text-xs leading-5 text-info">
          You&apos;re currently managing <strong>{existing.name}</strong>. Submitting this form registers an additional
          shop application.
        </p>
      )}

      {/* Stepper */}
      <ol className="mt-7 flex items-center gap-1" aria-label="Onboarding steps">
        {STEPS.map(({ id, label, icon: Icon }, i) => {
          const done = step > id;
          const current = step === id;
          return (
            <li key={id} className="flex flex-1 items-center gap-1">
              <button
                type="button"
                onClick={() => id < step && setStep(id)}
                className={`flex items-center gap-2 rounded-xl px-2 py-2 text-[11px] font-bold transition sm:px-3 ${
                  current ? "bg-brand text-cream" : done ? "bg-mint text-moss" : "bg-parchment text-ink-faint"
                }`}
                aria-current={current ? "step" : undefined}
              >
                <span className={`grid h-6 w-6 place-items-center rounded-full ${current ? "bg-white/20" : done ? "bg-moss text-white" : "bg-sand"}`}>
                  {done ? <Check size={12} aria-hidden /> : <Icon size={12} aria-hidden />}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < STEPS.length - 1 && <span aria-hidden className="h-px flex-1 bg-sand-deep" />}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 rounded-2xl border border-sand bg-card p-6 shadow-card sm:p-7">
        {/* -------- Step 0: shop info -------- */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
              <Store size={18} className="text-accent" aria-hidden /> Tell us about the shop
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelCls}>Shop name (English) *</span>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Zema Boutique" className={inputCls} />
              </label>
              <label>
                <span className={labelCls}>የሱቅ ስም (አማርኛ)</span>
                <input value={form.nameAm} onChange={(e) => setForm((f) => ({ ...f, nameAm: e.target.value }))} placeholder="ለምሳሌ ዜማ ቦቲክ" className={`${inputCls} font-am`} />
              </label>
              <label>
                <span className={labelCls}>Owner full name *</span>
                <span className="relative block">
                  <UserRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
                  <input value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} placeholder="e.g. Hanna Girma" className={`${inputCls} pl-10`} />
                </span>
              </label>
              <label>
                <span className={labelCls}>Phone *</span>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} inputMode="tel" placeholder="+2519…" className={inputCls} />
              </label>
              <label>
                <span className={labelCls}>E-mail</span>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="shop@example.com" className={inputCls} />
              </label>
              <label>
                <span className={labelCls}>Sub-city *</span>
                <select value={form.subCity} onChange={(e) => setForm((f) => ({ ...f, subCity: e.target.value }))} className={inputCls}>
                  {SUB_CITIES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className={labelCls}>Street address *</span>
                <span className="relative block">
                  <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
                  <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Area, landmark, building…" className={`${inputCls} pl-10`} />
                </span>
              </label>
              <label className="sm:col-span-2">
                <span className={labelCls}>
                  One-line tagline <span className="font-normal text-ink-faint">(shown to customers)</span>
                </span>
                <input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="e.g. Handwoven Ethiopian textiles and modern everyday wear." className={inputCls} />
              </label>
            </div>
          </div>
        )}

        {/* -------- Step 1: category & hours -------- */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
              <Clock size={18} className="text-accent" aria-hidden /> Category & trading hours
            </h2>
            <fieldset>
              <legend className={labelCls}>Shop category *</legend>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {(categories.data ?? []).map((cat) => {
                  const selected = form.category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: cat.id }))}
                      aria-pressed={selected}
                      className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 text-left text-xs font-bold transition ${
                        selected ? "border-brand bg-mint text-ink" : "border-sand-deep bg-cream text-ink-soft hover:border-brand"
                      }`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.accent }} aria-hidden />
                      {cat.nameEn}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-3">
              <label>
                <span className={labelCls}>Opens *</span>
                <input type="time" value={form.open} onChange={(e) => setForm((f) => ({ ...f, open: e.target.value }))} className={inputCls} />
              </label>
              <label>
                <span className={labelCls}>Closes *</span>
                <input type="time" value={form.close} onChange={(e) => setForm((f) => ({ ...f, close: e.target.value }))} className={inputCls} />
              </label>
              <label>
                <span className={labelCls}>Days</span>
                <select value={form.days} onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))} className={inputCls}>
                  {["Mon – Sat", "Mon – Fri", "Mon – Sun", "Sat – Sun"].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="rounded-xl border border-sand-deep bg-parchment/50 p-4">
              <legend className="px-1 text-xs font-bold uppercase tracking-wider text-ink-faint">Fulfilment options</legend>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={form.offersDelivery} onChange={(e) => setForm((f) => ({ ...f, offersDelivery: e.target.checked }))} className="h-4 w-4 accent-[#1c3a32]" />
                  Offer delivery
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={form.offersPickup} onChange={(e) => setForm((f) => ({ ...f, offersPickup: e.target.checked }))} className="h-4 w-4 accent-[#1c3a32]" />
                  Offer pickup
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  Delivery radius
                  <select value={form.deliveryRadiusKm} onChange={(e) => setForm((f) => ({ ...f, deliveryRadiusKm: Number(e.target.value) }))} className="rounded-lg border border-sand-deep bg-card px-2 py-1.5 text-xs">
                    {[3, 4, 5, 6, 7].map((km) => (
                      <option key={km} value={km}>{km} km</option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>
          </div>
        )}

        {/* -------- Step 2: documents -------- */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
              <FileCheck2 size={18} className="text-accent" aria-hidden /> Licences & documents
            </h2>
            <p className="text-sm leading-6 text-ink-soft">
              Required for the admin review. Nothing is really uploaded in the prototype — attach a placeholder to
              mark the document as provided.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelCls}>Trade licence number *</span>
                <input value={form.tradeLicenceNo} onChange={(e) => setForm((f) => ({ ...f, tradeLicenceNo: e.target.value }))} placeholder="TL-2016-…" className={inputCls} />
              </label>
              <label>
                <span className={labelCls}>TIN number *</span>
                <input value={form.tinNumber} onChange={(e) => setForm((f) => ({ ...f, tinNumber: e.target.value }))} placeholder="00…" className={inputCls} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { key: "tradeLicenceFile" as const, title: "Trade licence (scan)", desc: "PDF or photo of the licence" },
                  { key: "tinFile" as const, title: "TIN certificate (scan)", desc: "PDF or photo of the certificate" },
                ]
              ).map(({ key, title, desc }) => {
                const attached = form[key] !== null;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, [key]: f[key] ? null : `placeholder-${key}` }))}
                    aria-pressed={attached}
                    className={`flex flex-col items-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition ${
                      attached ? "border-moss bg-ok-soft" : "border-sand-deep bg-cream hover:border-brand"
                    }`}
                  >
                    {attached ? (
                      <Check size={26} className="text-ok" aria-hidden />
                    ) : (
                      <Upload size={26} className="text-ink-faint" aria-hidden />
                    )}
                    <span className={`mt-2.5 text-sm font-bold ${attached ? "text-ok" : "text-ink"}`}>{attached ? "Attached (placeholder)" : title}</span>
                    <span className="mt-1 text-[11px] text-ink-faint">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* -------- Step 3: review -------- */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
              <Check size={18} className="text-accent" aria-hidden /> Review & submit
            </h2>
            <dl className="grid gap-x-6 gap-y-4 rounded-xl bg-parchment/60 p-5 text-sm sm:grid-cols-2">
              {[
                ["Shop name", form.name],
                ["Owner", form.ownerName],
                ["Phone", form.phone],
                ["E-mail", form.email || "—"],
                ["Sub-city", form.subCity],
                ["Address", form.address],
                ["Category", categories.data?.find((c) => c.id === form.category)?.nameEn ?? "—"],
                ["Trading hours", `${form.days}, ${form.open}–${form.close}`],
                ["Delivery", form.offersDelivery ? `Yes, within ${form.deliveryRadiusKm} km` : "No"],
                ["Pickup", form.offersPickup ? "Yes" : "No"],
                ["Trade licence", form.tradeLicenceNo],
                ["TIN", form.tinNumber],
              ].map(([term, value]) => (
                <div key={term}>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{term}</dt>
                  <dd className="mt-1 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="rounded-xl bg-mint px-4 py-3.5 text-xs leading-5 text-moss">
              By submitting you confirm the details are accurate. Your shop appears to customers only after an admin
              approves the application.
            </p>
            {error && <ErrorNote message={error} />}
          </div>
        )}

        {/* Nav buttons */}
        <div className="mt-7 flex items-center justify-between gap-3 border-t border-sand pt-5">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className={buttonClasses("ghost", "disabled:invisible")}>
            <ArrowLeft size={15} aria-hidden /> Back
          </button>
          {step < 3 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!stepValid(step)} className={buttonClasses("primary")}>
              Continue <ArrowRight size={15} aria-hidden />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={!allValid || submitting} className={buttonClasses("accent")}>
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
