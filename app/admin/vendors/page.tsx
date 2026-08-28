"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowRight, BadgeCheck, Check, Clock, FileCheck2, MapPin, Phone, Store, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-context";
import { ButtonLink, EmptyState, ErrorNote, ListSkeleton, buttonClasses } from "@/components/ui";
import { api, useApi } from "@/lib/client";
import { formatDate } from "@/lib/geo";
import type { Shop, ShopWithDistance } from "@/types";

export default function AdminVendorsPage() {
  const { refreshShops } = useAuth();
  const shops = useApi<ShopWithDistance[]>("/api/shops?status=all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = (shops.data ?? []).filter((s) => s.status === "pending");
  const reviewed = (shops.data ?? []).filter((s) => s.status !== "pending");

  async function review(shop: Shop, action: "approve" | "reject") {
    let reason: string | null = null;
    if (action === "reject") {
      reason = window.prompt(`Reason for rejecting ${shop.name} (sent to the vendor):`, "");
      if (reason === null) return;
    }
    setBusyId(shop.id);
    try {
      await api(`/api/shops/${shop.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, reason: reason || undefined }),
      });
      toast.success(
        action === "approve" ? "Shop approved" : "Shop rejected",
        { description: `${shop.name} — the vendor got a simulated SMS.` }
      );
      shops.refetch();
      refreshShops();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">
            <Store size={14} aria-hidden /> Module A · Admin
          </p>
          <h1 className="mt-1.5 font-serif text-3xl font-semibold tracking-tight">Vendor approvals</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {pending.length} application{pending.length === 1 ? "" : "s"} waiting · {reviewed.length} reviewed
          </p>
        </div>
        <ButtonLink href="/admin/overview" variant="outline">
          Platform overview <ArrowRight size={15} aria-hidden />
        </ButtonLink>
      </header>

      {shops.loading ? (
        <ListSkeleton count={3} height="h-36" />
      ) : shops.error ? (
        <ErrorNote message={shops.error} onRetry={shops.refetch} />
      ) : pending.length === 0 ? (
        <EmptyState
          icon={BadgeCheck}
          title="Queue is empty"
          description="No pending applications. Register a new shop from the vendor onboarding flow to see this queue in action."
          action={<ButtonLink href="/vendor/onboarding" variant="accent">Open vendor onboarding</ButtonLink>}
        />
      ) : (
        <ul className="space-y-4">
          {pending.map((shop) => (
            <li key={shop.id} className="rounded-2xl border border-warn/30 bg-card p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shop.logoUrl} alt="" className="h-14 w-14 rounded-xl border border-sand object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-serif text-xl font-semibold">{shop.name}</h2>
                    <span className="font-am text-sm text-ink-soft">{shop.nameAm}</span>
                    <span className="rounded-full bg-warn-soft px-2.5 py-1 text-[10px] font-bold uppercase text-warn">
                      Pending
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{shop.tagline}</p>
                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-soft">
                    <li className="flex items-center gap-1.5"><MapPin size={12} className="text-accent" aria-hidden /> {shop.subCity} — {shop.address}</li>
                    <li className="flex items-center gap-1.5"><Phone size={12} aria-hidden /> {shop.phone} · {shop.ownerName}</li>
                    <li className="flex items-center gap-1.5"><Clock size={12} aria-hidden /> submitted {formatDate(shop.createdAt)}</li>
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${shop.documents.tradeLicence ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
                      <FileCheck2 size={12} aria-hidden /> Trade licence {shop.documents.tradeLicence ? `✓ (${shop.tradeLicenceNo})` : "missing"}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${shop.documents.tinCertificate ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
                      <FileCheck2 size={12} aria-hidden /> TIN {shop.documents.tinCertificate ? `✓ (${shop.tinNumber})` : "not attached"}
                    </span>
                  </div>
                </div>
                <div className="flex w-full gap-2.5 sm:w-auto sm:flex-col">
                  <button
                    onClick={() => review(shop, "approve")}
                    disabled={busyId === shop.id}
                    className={buttonClasses("primary", "flex-1")}
                  >
                    <Check size={15} aria-hidden /> Approve
                  </button>
                  <button
                    onClick={() => review(shop, "reject")}
                    disabled={busyId === shop.id}
                    className={buttonClasses("danger", "flex-1")}
                  >
                    <X size={15} aria-hidden /> Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Reviewed shops */}
      {reviewed.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">Reviewed applications</h2>
          <div className="overflow-x-auto rounded-2xl border border-sand bg-card shadow-card">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-sand bg-parchment/70 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                  <th className="px-4 py-3.5">Shop</th>
                  <th className="px-4 py-3.5">Sub-city</th>
                  <th className="px-4 py-3.5">Products</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Reviewed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {reviewed.map((shop) => (
                  <tr key={shop.id} className="transition hover:bg-cream/60">
                    <td className="px-4 py-3.5">
                      <Link href={`/shops/${shop.id}`} className="font-semibold hover:underline">{shop.name}</Link>
                      <p className="text-[11px] text-ink-faint">{shop.ownerName}</p>
                    </td>
                    <td className="px-4 py-3.5 text-ink-soft">{shop.subCity}</td>
                    <td className="px-4 py-3.5 text-ink-soft">{shop.productCount}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${shop.status === "approved" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
                        {shop.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-ink-faint">{shop.reviewedAt ? formatDate(shop.reviewedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
