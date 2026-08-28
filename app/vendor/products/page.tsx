"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Boxes, Eye, EyeOff, PackagePlus, Pencil, Plus, Search, Trash2, TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/providers/auth-context";
import { useLang } from "@/components/providers/lang-context";
import { EmptyState, ErrorNote, ListSkeleton, buttonClasses } from "@/components/ui";
import { api } from "@/lib/client";
import { etb } from "@/lib/geo";
import type { Product, Shop } from "@/types";

type VendorProduct = Product & { hidden: boolean };

export default function VendorProductsPage() {
  const { vendorShopId, vendorShop } = useAuth();
  const { lang } = useLang();
  const [reloadTick, setReloadTick] = useState(0);
  const [result, setResult] = useState<{
    shopId: string;
    data: { shop: Shop; products: VendorProduct[] } | null;
    error: string | null;
  }>({ shopId: "", data: null, error: null });
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "published" | "hidden">("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const categories = useMemo(() => [
    { id: "cat_fashion", nameEn: "Fashion & Lifestyle" },
    { id: "cat_electronics", nameEn: "Electronics" },
    { id: "cat_beauty", nameEn: "Beauty & Personal Care" },
    { id: "cat_stationery", nameEn: "Stationery & Gifts" },
    { id: "cat_groceries", nameEn: "Mini-market" },
    { id: "cat_home", nameEn: "Home & Living" },
  ], []);

  useEffect(() => {
    let cancelled = false;
    api<{ shop: Shop; products: VendorProduct[] }>(`/api/shops/${vendorShopId}?all=1`)
      .then((data) => {
        if (!cancelled) setResult({ shopId: vendorShopId, data, error: null });
      })
      .catch((e: Error) => {
        if (!cancelled) setResult({ shopId: vendorShopId, data: null, error: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [vendorShopId, reloadTick]);

  async function load() {
    setReloadTick((t) => t + 1);
  }

  const current = result.shopId === vendorShopId ? result : null;
  const shopData = current?.data ?? null;
  const loading = current === null;
  const error = current?.error ?? null;

  const visible = (shopData?.products ?? []).filter((p) => {
    if (tab === "published") return !p.hidden;
    if (tab === "hidden") return p.hidden;
    return true;
  }).filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return p.nameEn.toLowerCase().includes(q) || p.nameAm.includes(query) || p.sku.toLowerCase().includes(q);
  });

  async function togglePublish(product: Product) {
    try {
      const updated = await api<Product>(`/api/products/${product.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "togglePublish" }),
      });
      toast.success(updated.isPublished ? "Product published" : "Product unpublished", { description: product.nameEn });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Delete "${product.nameEn}" from the catalogue?`)) return;
    try {
      await api(`/api/products/${product.id}`, { method: "DELETE" });
      toast.success("Product deleted", { description: product.nameEn });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <ListSkeleton count={5} height="h-16" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
        <ErrorNote message={error} onRetry={load} />
      </div>
    );
  }

  const notApproved = Boolean(vendorShop && vendorShop.status !== "approved");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-accent">
            <Boxes size={14} aria-hidden /> Module A · Catalogue
          </p>
          <h1 className="mt-1.5 font-serif text-3xl font-semibold tracking-tight">{vendorShop?.name} catalogue</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            Products at 0 stock auto-hide from customers — restock to bring them back.
          </p>
        </div>
        <button onClick={() => { setCreating(true); setEditing(null); }} className={buttonClasses("accent")} disabled={notApproved}>
          <Plus size={16} aria-hidden /> Add product
        </button>
      </header>

      {notApproved && (
        <p className="mb-6 flex items-center gap-2 rounded-2xl bg-warn-soft px-5 py-4 text-sm font-semibold text-warn">
          <TriangleAlert size={17} aria-hidden />
          Your shop is {vendorShop?.status} — customers can&apos;t see this catalogue until an admin approves it.
        </p>
      )}

      {/* Tabs + search */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="flex rounded-xl border border-sand-deep bg-card p-1" role="tablist" aria-label="Filter products">
          {(
            [
              ["all", "All"],
              ["published", "Live"],
              ["hidden", "Hidden / out of stock"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${tab === id ? "bg-brand text-cream" : "text-ink-soft hover:bg-mint"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex min-w-52 flex-1 items-center gap-2 rounded-xl border border-sand-deep bg-card px-3.5 py-2.5">
          <Search size={15} className="text-ink-faint" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or SKU…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            aria-label="Search catalogue"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title={query ? "Nothing matched" : "No products yet"}
          description={query ? "Try a different keyword." : "Add your first product — name, price and stock are enough to start."}
          action={
            <button onClick={() => setCreating(true)} className={buttonClasses("accent")}>
              <Plus size={15} aria-hidden /> Add product
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-sand bg-card shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-sand bg-parchment/70 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-3.5">Product</th>
                <th className="px-4 py-3.5">Price</th>
                <th className="px-4 py-3.5">Stock</th>
                <th className="px-4 py-3.5">Visibility</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {visible.map((p) => {
                const name = lang === "am" && p.nameAm ? p.nameAm : p.nameEn;
                const out = p.quantity === 0;
                return (
                  <tr key={p.id} className="transition hover:bg-cream/60">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.photos[0]} alt="" className="h-11 w-11 rounded-lg border border-sand object-cover" />
                        <div className="min-w-0">
                          <p className="max-w-64 truncate font-semibold">
                            <span className={lang === "am" && p.nameAm ? "font-am" : undefined}>{name}</span>
                          </p>
                          <p className="text-[11px] text-ink-faint">{p.sku} · {p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold">{etb(p.price)}</td>
                    <td className="px-4 py-3.5">
                      {out ? (
                        <span className="rounded-full bg-danger-soft px-2.5 py-1 text-[11px] font-bold text-danger">0 · auto-hidden</span>
                      ) : p.quantity <= p.lowStockThreshold ? (
                        <span className="rounded-full bg-warn-soft px-2.5 py-1 text-[11px] font-bold text-warn">{p.quantity} · low</span>
                      ) : (
                        <span className="font-semibold">{p.quantity}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {p.isPublished && !out ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-1 text-[11px] font-bold text-ok">
                          <Eye size={12} aria-hidden /> Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-parchment px-2.5 py-1 text-[11px] font-bold text-ink-faint">
                          <EyeOff size={12} aria-hidden /> {out ? "Hidden (stock)" : "Unpublished"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => togglePublish(p)}
                          disabled={p.quantity === 0 && !p.isPublished}
                          title={p.quantity === 0 && !p.isPublished ? "Restock before publishing" : p.isPublished ? "Unpublish" : "Publish"}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-sand-deep bg-card text-ink-soft transition hover:border-brand hover:text-ink disabled:opacity-40"
                          aria-label={p.isPublished ? `Unpublish ${p.nameEn}` : `Publish ${p.nameEn}`}
                        >
                          {p.isPublished ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                        </button>
                        <button
                          onClick={() => { setEditing(p); setCreating(false); }}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-sand-deep bg-card text-ink-soft transition hover:border-brand hover:text-ink"
                          aria-label={`Edit ${p.nameEn}`}
                        >
                          <Pencil size={15} aria-hidden />
                        </button>
                        <button
                          onClick={() => removeProduct(p)}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-sand-deep bg-card text-ink-faint transition hover:border-danger hover:bg-danger-soft hover:text-danger"
                          aria-label={`Delete ${p.nameEn}`}
                        >
                          <Trash2 size={15} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-5 text-xs text-ink-faint">
        Tip: visit your public shop page at{" "}
        <Link href={`/shops/${vendorShopId}`} className="font-semibold underline">
          /shops/{vendorShopId}
        </Link>{" "}
        to see exactly what customers see.
      </p>

      {/* Editor / creator modal */}
      {(editing || creating) && (
        <ProductEditor
          shopId={vendorShopId!}
          product={editing}
          categories={categories}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product create/edit modal                                           */
/* ------------------------------------------------------------------ */

function ProductEditor({
  shopId,
  product,
  categories,
  onClose,
  onSaved,
}: {
  shopId: string;
  product: Product | null;
  categories: { id: string; nameEn: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    nameEn: product?.nameEn ?? "",
    nameAm: product?.nameAm ?? "",
    category: product?.category ?? categories[0]?.id ?? "cat_home",
    description: product?.description ?? "",
    price: product?.price?.toString() ?? "",
    compareAtPrice: product?.compareAtPrice?.toString() ?? "",
    unit: product?.unit ?? "each",
    quantity: product?.quantity?.toString() ?? "10",
    isPublished: product?.isPublished ?? true,
  });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    const quantity = Number(form.quantity);
    if (!form.nameEn.trim() || !Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity < 0) {
      toast.error("Please fill in a name, a positive price and a valid stock quantity.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        nameEn: form.nameEn.trim(),
        nameAm: form.nameAm.trim() || form.nameEn.trim(),
        category: form.category,
        description: form.description.trim(),
        price,
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        unit: form.unit,
        quantity,
        isPublished: form.isPublished,
      };
      if (product) {
        await api(`/api/products/${product.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Product updated", { description: payload.nameEn });
      } else {
        await api("/api/products", { method: "POST", body: JSON.stringify({ ...payload, shopId }) });
        toast.success("Product added", { description: payload.nameEn });
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-sand-deep bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-brand";
  const labelCls = "mb-1 block text-xs font-bold";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-brand-deep/60 p-4" role="dialog" aria-modal="true" aria-label={product ? "Edit product" : "Add product"}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-lift sm:p-7">
        <h2 className="font-serif text-xl font-semibold">{product ? "Edit product" : "Add product"}</h2>
        <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={labelCls}>Name (English) *</span>
            <input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} className={inputCls} placeholder="e.g. Handwoven cotton netela" autoFocus />
          </label>
          <label className="sm:col-span-2">
            <span className={labelCls}>ስም (አማርኛ)</span>
            <input value={form.nameAm} onChange={(e) => setForm((f) => ({ ...f, nameAm: e.target.value }))} className={`${inputCls} font-am`} placeholder="ለምሳሌ የእጅ ተሰራ ጥምብ ነጠላ" />
          </label>
          <label>
            <span className={labelCls}>Price (ETB) *</span>
            <input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} inputMode="numeric" className={inputCls} placeholder="950" />
          </label>
          <label>
            <span className={labelCls}>Compare-at price</span>
            <input value={form.compareAtPrice} onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))} inputMode="numeric" className={inputCls} placeholder="Optional — shows a discount" />
          </label>
          <label>
            <span className={labelCls}>Stock quantity *</span>
            <input value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} inputMode="numeric" className={inputCls} placeholder="20" />
          </label>
          <label>
            <span className={labelCls}>Unit</span>
            <select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className={inputCls}>
              {["each", "pack", "pair", "set", "bottle", "jar", "bag", "box", "ream", "tray", "loaf", "tube"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className={labelCls}>Category</span>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nameEn}</option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className={labelCls}>Description</span>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className={inputCls} placeholder="A sentence customers will see on the product page" />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="h-4 w-4 accent-[#1c3a32]" />
            Publish immediately (visible to customers)
          </label>
          <div className="flex justify-end gap-2 border-t border-sand pt-4 sm:col-span-2">
            <button type="button" onClick={onClose} className={buttonClasses("ghost")}>Cancel</button>
            <button type="submit" disabled={busy} className={buttonClasses("accent")}>
              {busy ? "Saving…" : product ? "Save changes" : "Add product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
