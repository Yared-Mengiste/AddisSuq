"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, KeyRound, Phone, ShoppingBag, UserRound } from "lucide-react";
import { useAuth } from "@/components/providers/auth-context";
import { buttonClasses } from "@/components/ui";
import { api } from "@/lib/client";
import { DEMO_OTP, MAX_SAVED_ADDRESSES, SUB_CITIES } from "@/lib/rules";
import type { Customer } from "@/types";

/** Module B signup — two steps: details, then the fake OTP screen (code 1234). */
export default function SignupPage() {
  const router = useRouter();
  const { setCustomerId, setRole } = useAuth();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    addressLabel: "Home",
    address: "",
    subCity: "Bole",
  });

  function detailsValid() {
    return form.name.trim().length >= 2 && /^\+?\d{9,}$/.test(form.phone.replace(/\s/g, ""));
  }

  async function verifyAndCreate() {
    if (otp !== DEMO_OTP) {
      toast.error("Wrong code — in this demo the code is always 1234.");
      return;
    }
    setBusy(true);
    try {
      const created = await api<Customer>("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim()
            ? {
                label: form.addressLabel,
                address: form.address.trim(),
                subCity: form.subCity,
                lat: 9.0 + Math.random() * 0.04,
                lng: 38.75 + Math.random() * 0.05,
              }
            : undefined,
        }),
      });
      toast.success(`Welcome to AddisSuq, ${created.name.split(" ")[0]}!`);
      setCustomerId(created.id);
      setRole("customer");
      router.push("/");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 lg:py-16">
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft transition hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> Back to home
      </Link>

      <div className="rounded-2xl border border-sand bg-card p-6 shadow-card sm:p-8">
        {/* Step indicator */}
        <ol className="mb-7 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider" aria-label="Signup steps">
          {["Your details", "Verify phone"].map((label, i) => (
            <li key={label} className={`flex items-center gap-2 ${step === "details" && i === 1 ? "text-ink-faint" : "text-moss"}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full ${step === "details" && i === 1 ? "bg-parchment text-ink-faint" : "bg-moss text-white"}`}>
                {i + 1}
              </span>
              {label}
              {i === 0 && <span aria-hidden className="h-px w-6 bg-sand-deep" />}
            </li>
          ))}
        </ol>

        {step === "details" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (detailsValid()) setStep("otp");
            }}
            className="space-y-4"
          >
            <h1 className="font-serif text-2xl font-semibold">Create your account</h1>
            <p className="text-sm leading-6 text-ink-soft">
              Join to order from shops near you and track deliveries. You can keep up to {MAX_SAVED_ADDRESSES} saved
              addresses.
            </p>

            <label className="block text-sm">
              <span className="mb-1.5 block font-bold">Full name</span>
              <span className="relative block">
                <UserRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  minLength={2}
                  placeholder="e.g. Hanna Bekele"
                  className="w-full rounded-xl border border-sand-deep bg-cream py-3 pl-10 pr-4 text-sm outline-none focus:border-brand"
                />
              </span>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-bold">Phone number</span>
              <span className="relative block">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  required
                  inputMode="tel"
                  placeholder="+2519…"
                  className="w-full rounded-xl border border-sand-deep bg-cream py-3 pl-10 pr-4 text-sm outline-none focus:border-brand"
                />
              </span>
            </label>

            <label className="block text-sm">
              <span className="mb-1.5 block font-bold">
                E-mail <span className="font-normal text-ink-faint">(optional)</span>
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-sand-deep bg-cream px-4 py-3 text-sm outline-none focus:border-brand"
              />
            </label>

            <fieldset className="rounded-xl border border-sand-deep bg-parchment/50 p-4">
              <legend className="px-1 text-xs font-bold uppercase tracking-wider text-ink-faint">
                First delivery address (optional)
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Street, building, landmark…"
                  className="rounded-xl border border-sand-deep bg-card px-3.5 py-2.5 text-sm outline-none focus:border-brand sm:col-span-2"
                />
                <select
                  value={form.addressLabel}
                  onChange={(e) => setForm((f) => ({ ...f, addressLabel: e.target.value }))}
                  className="rounded-xl border border-sand-deep bg-card px-3.5 py-2.5 text-sm"
                  aria-label="Address label"
                >
                  {["Home", "Work", "Other"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <select
                  value={form.subCity}
                  onChange={(e) => setForm((f) => ({ ...f, subCity: e.target.value }))}
                  className="rounded-xl border border-sand-deep bg-card px-3.5 py-2.5 text-sm"
                  aria-label="Sub-city"
                >
                  {SUB_CITIES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </fieldset>

            <button type="submit" disabled={!detailsValid()} className={buttonClasses("accent", "w-full py-3.5")}>
              Send verification code
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <h1 className="flex items-center gap-2 font-serif text-2xl font-semibold">
              <KeyRound size={20} className="text-accent" aria-hidden /> Verify your phone
            </h1>
            <p className="text-sm leading-6 text-ink-soft">
              We “sent” a 4-digit code by SMS to <strong className="text-ink">{form.phone}</strong>. In this demo the
              code is always <strong className="text-accent">1234</strong>.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyAndCreate();
              }}
            >
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                autoFocus
                placeholder="1234"
                aria-label="4-digit verification code"
                className="w-full rounded-xl border border-sand-deep bg-cream px-4 py-4 text-center text-2xl font-bold tracking-[0.6em] outline-none focus:border-brand"
              />
              <div className="mt-4 flex gap-2">
                <button type="submit" disabled={otp.length !== 4 || busy} className={buttonClasses("accent", "flex-1 py-3.5")}>
                  <BadgeCheck size={16} aria-hidden /> Verify & create account
                </button>
                <button type="button" onClick={() => setStep("details")} className={buttonClasses("ghost")} disabled={busy}>
                  Back
                </button>
              </div>
            </form>
            <p className="rounded-xl bg-mint px-4 py-3 text-xs leading-5 text-moss">
              After signup you&apos;ll be signed in as this customer — the header&apos;s role switcher can jump between demo
              accounts.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-ink-faint">
        Already have a demo account? Switch users from the{" "}
        <ShoppingBag size={11} className="inline" aria-hidden /> header instead — no password needed.
      </p>
    </div>
  );
}
