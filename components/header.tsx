"use client";

/**
 * Site header with the three demo affordances the assignment asks for:
 * a role switcher (Customer / Vendor / Admin), a demo-user picker inside
 * each role, and the EN/አማ language toggle — plus cart and the
 * simulated notification bell.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Languages,
  LogIn,
  Menu,
  Package,
  PackageSearch,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-context";
import { useCart } from "@/components/providers/cart-context";
import { useLang } from "@/components/providers/lang-context";
import { api } from "@/lib/client";
import { relativeTime } from "@/lib/geo";
import type { AppNotification } from "@/types";

const CUSTOMER_LINKS = [
  { href: "/search", label: "Browse", icon: PackageSearch },
  { href: "/orders", label: "My orders", icon: Truck },
  { href: "/account", label: "Account", icon: User },
];

const VENDOR_LINKS = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: Settings },
  { href: "/vendor/products", label: "Products", icon: Package },
  { href: "/vendor/onboarding", label: "Register shop", icon: Store },
];

const ADMIN_LINKS = [
  { href: "/admin/overview", label: "Overview", icon: ShieldCheck },
  { href: "/admin/vendors", label: "Vendor approvals", icon: Store },
];

export function Header() {
  const { role, setRole, customer, customers, setCustomerId, shops, vendorShopId, setVendorShopId } = useAuth();
  const { lang, setLang } = useLang();
  const { count } = useCart();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [feed, setFeed] = useState<{ userId: string; list: AppNotification[] } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const links = role === "customer" ? CUSTOMER_LINKS : role === "vendor" ? VENDOR_LINKS : ADMIN_LINKS;

  // Close popovers on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Simulated notification feed for whoever is "logged in".
  const feedUserId = role === "customer" ? customer?.id : role === "vendor" ? vendorShopId : null;
  useEffect(() => {
    if (!feedUserId) return;
    let cancelled = false;
    api<AppNotification[]>(`/api/notifications?userId=${feedUserId}&userType=${role}&limit=12`)
      .then((list) => {
        if (cancelled) return;
         
        setFeed({ userId: feedUserId, list });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [feedUserId, role]);

  // Stale feeds from a previous user are ignored until their fetch lands.
  const notifications = feed && feed.userId === feedUserId ? feed.list : [];

  const unread = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    try {
      await api("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ all: true, userId: feedUserId }),
      });
      setFeed((prev) =>
        prev ? { ...prev, list: prev.list.map((n) => ({ ...n, read: true })) } : prev
      );
    } catch {
      // demo — ignore
    }
  }

  function switchRole(next: "customer" | "vendor" | "admin") {
    setRole(next);
    setMenuOpen(false);
    router.push(next === "customer" ? "/" : next === "vendor" ? "/vendor/dashboard" : "/admin/overview");
  }

  const roleLabel = role === "customer" ? customer?.name ?? "Customer" : role === "vendor" ? shops.find((s) => s.id === vendorShopId)?.name ?? "Vendor" : "Admin";

  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-cream/95 backdrop-blur">
      {/* Announcement strip */}
      <div className="bg-brand px-4 py-1.5 text-center text-[11px] font-medium tracking-[0.12em] text-cream">
        FREE DELIVERY ON ORDERS OVER 2,000 ETB · ADDIS ABABA
      </div>

      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 sm:py-3 lg:px-8">
        {/* Mobile menu button */}
        <button
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink lg:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white sm:h-9 sm:w-9 sm:rounded-xl">
            <Store size={17} aria-hidden />
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight sm:text-2xl">
            Addis<span className="text-accent">Suq</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-mint hover:text-ink"
            >
              <Icon size={16} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "am" : "en")}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-sand-deep bg-card px-2.5 text-xs font-bold text-ink transition hover:border-brand sm:py-2"
            aria-label="Toggle language"
            title="Toggle language"
          >
            <Languages size={15} aria-hidden />
            <span className={lang === "am" ? "font-am" : undefined}>{lang === "en" ? "EN" : "አማ"}</span>
          </button>

          {/* Notification bell (customer + vendor roles) */}
          {role !== "admin" && (
            <div className="relative shrink-0" ref={bellRef}>
              <button
                onClick={() => {
                  setBellOpen((o) => !o);
                  if (!bellOpen && unread > 0) markAllRead();
                }}
                className="relative grid h-9 w-9 place-items-center rounded-xl border border-sand-deep bg-card text-ink transition hover:border-brand"
                aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
                aria-expanded={bellOpen}
              >
                <Bell size={17} aria-hidden />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-12 w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-sand bg-card shadow-lift">
                  <p className="border-b border-sand px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-faint">
                    Simulated {role === "vendor" ? "SMS alerts" : "SMS & e-mail"}
                  </p>
                  <ul className="max-h-80 divide-y divide-sand overflow-y-auto">
                    {notifications.length === 0 && (
                      <li className="px-4 py-8 text-center text-sm text-ink-faint">No notifications yet.</li>
                    )}
                    {notifications.slice(0, 8).map((n) => (
                      <li key={n.id} className="px-4 py-3">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <span className="text-[10px] uppercase tracking-wide text-ink-faint">
                            {n.channel === "sms" ? "SMS" : "Email"}
                          </span>
                          {n.subject}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-soft">{n.message}</p>
                        <p className="mt-1 text-[10px] text-ink-faint">{relativeTime(n.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Cart (customer role only) */}
          {role === "customer" && (
            <Link
              href="/cart"
              className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-sand-deep bg-card text-ink transition hover:border-brand"
              aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
            >
              <ShoppingBag size={17} aria-hidden />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
          )}

          {/* Role switcher + demo user picker — its own full-width row on phones */}
          <div className="relative order-last w-full sm:order-none sm:w-auto" ref={pickerRef}>
            <button
              onClick={() => setPickerOpen((o) => !o)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-cream transition hover:bg-brand-deep sm:w-auto"
              aria-expanded={pickerOpen}
              aria-label="Switch demo role or user"
            >
              <LogIn size={14} aria-hidden />
              <span className="hidden max-w-28 truncate sm:inline">{roleLabel}</span>
              <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{role}</span>
              <span className="sm:hidden">Demo switcher</span>
              <ChevronDown size={13} aria-hidden />
            </button>
            {pickerOpen && (
              <div className="absolute right-0 top-12 w-[min(92vw,20rem)] overflow-hidden rounded-2xl border border-sand bg-card shadow-lift">
                <p className="border-b border-sand px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                  Demo role
                </p>
                <div className="grid grid-cols-3 gap-1 p-2">
                  {(["customer", "vendor", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => switchRole(r)}
                      className={`rounded-xl px-2 py-2 text-xs font-semibold capitalize transition ${
                        role === r ? "bg-brand text-cream" : "bg-parchment text-ink-soft hover:bg-mint"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {role === "customer" && (
                  <>
                    <p className="border-y border-sand px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                      Shop as customer
                    </p>
                    <ul className="max-h-56 overflow-y-auto py-1">
                      {customers.map((c) => (
                        <li key={c.id}>
                          <button
                            onClick={() => {
                              setCustomerId(c.id);
                              setPickerOpen(false);
                            }}
                            className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition hover:bg-mint ${
                              customer?.id === c.id ? "font-semibold text-ink" : "text-ink-soft"
                            }`}
                          >
                            <span>{c.name}</span>
                            <span className="text-[10px] text-ink-faint">{c.id}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {role === "vendor" && (
                  <>
                    <p className="border-y border-sand px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                      Manage as shop
                    </p>
                    <ul className="max-h-56 overflow-y-auto py-1">
                      {shops.map((s) => (
                        <li key={s.id}>
                          <button
                            onClick={() => {
                              setVendorShopId(s.id);
                              setPickerOpen(false);
                              router.push("/vendor/dashboard");
                            }}
                            className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition hover:bg-mint ${
                              vendorShopId === s.id ? "font-semibold text-ink" : "text-ink-soft"
                            }`}
                          >
                            <span>{s.name}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                                s.status === "approved"
                                  ? "bg-ok-soft text-ok"
                                  : s.status === "pending"
                                    ? "bg-warn-soft text-warn"
                                    : "bg-danger-soft text-danger"
                              }`}
                            >
                              {s.status}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {role === "admin" && (
                  <p className="border-t border-sand px-4 py-3 text-xs leading-5 text-ink-faint">
                    Admin reviews shop applications and watches platform totals.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search strip (customer role) */}
      {role === "customer" && (
        <div className="border-t border-sand bg-card/60">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 lg:px-8">
            <form
              className="flex flex-1 items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get("q");
                router.push(`/search${q ? `?q=${encodeURIComponent(String(q))}` : ""}`);
              }}
              role="search"
            >
              <Search size={16} className="ml-1 shrink-0 text-ink-faint" aria-hidden />
              <input
                name="q"
                type="search"
                placeholder="Search products and shops near you…"
                className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-ink-faint"
                aria-label="Search products"
              />
            </form>
          </div>
        </div>
      )}

      {/* Mobile nav */}
      {menuOpen && (
        <nav className="border-t border-sand bg-card px-4 py-3 lg:hidden" aria-label="Mobile">
          <ul className="grid gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-mint"
                >
                  <Icon size={17} aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
