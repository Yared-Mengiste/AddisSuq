"use client";

import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Store, Trash2, Truck } from "lucide-react";
import { useAuth } from "@/components/providers/auth-context";
import { useCart } from "@/components/providers/cart-context";
import { useLang } from "@/components/providers/lang-context";
import { buttonClasses, EmptyState } from "@/components/ui";
import { etb } from "@/lib/geo";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/rules";

export default function CartPage() {
  const { groups, count, total, setQty, remove, removeShop } = useCart();
  const { lang } = useLang();
  const { role } = useAuth();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Your cart</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {count === 0 ? "Nothing here yet" : `${count} item${count === 1 ? "" : "s"} from ${groups.length} shop${groups.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {groups.length > 0 && (
          <p className="rounded-xl bg-mint px-3.5 py-2 text-xs font-semibold text-moss">
            Each shop is a separate order at checkout
          </p>
        )}
      </header>

      {groups.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse the market and add something you like — items from any shop in Addis Ababa land here."
          action={
            <Link href="/search" className={buttonClasses("accent")}>
              Start shopping <ArrowRight size={15} aria-hidden />
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.shopId} className="overflow-hidden rounded-2xl border border-sand bg-card shadow-card">
              <header className="flex items-center justify-between gap-3 border-b border-sand bg-parchment/70 px-4 py-3.5 sm:px-5">
                <Link href={`/shops/${group.shopId}`} className="flex items-center gap-2 font-serif text-base font-semibold hover:underline">
                  <Store size={16} className="text-accent" aria-hidden />
                  {group.shopName || "Shop"}
                </Link>
                <button
                  onClick={() => removeShop(group.shopId)}
                  className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint transition hover:bg-danger-soft hover:text-danger"
                >
                  Remove shop
                </button>
              </header>

              <ul className="divide-y divide-sand">
                {group.lines.map((line) => {
                  const name = lang === "am" && line.nameAm ? line.nameAm : line.nameEn;
                  return (
                    <li key={line.productId} className="flex gap-4 p-4 sm:px-5">
                      <Link href={`/products/${line.productId}`} className="shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={line.photo} alt={line.nameEn} className="h-20 w-20 rounded-xl border border-sand object-cover sm:h-24 sm:w-24" />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link href={`/products/${line.productId}`} className="line-clamp-2 text-sm font-semibold leading-5 hover:underline">
                          <span className={lang === "am" && line.nameAm ? "font-am" : undefined}>{name}</span>
                        </Link>
                        <p className="mt-1 text-xs text-ink-faint">{etb(line.price)} each</p>
                        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="inline-flex items-center rounded-xl border border-sand-deep bg-cream">
                            <button
                              onClick={() => setQty(line.productId, line.qty - 1)}
                              disabled={line.qty <= 1}
                              className="grid h-9 w-9 place-items-center rounded-l-xl font-bold text-ink-soft transition hover:bg-parchment disabled:opacity-40"
                              aria-label={`Decrease quantity of ${line.nameEn}`}
                            >
                              <Minus size={14} aria-hidden />
                            </button>
                            <span className="w-9 text-center text-sm font-semibold">{line.qty}</span>
                            <button
                              onClick={() => setQty(line.productId, line.qty + 1)}
                              disabled={line.qty >= line.maxQty}
                              className="grid h-9 w-9 place-items-center rounded-r-xl font-bold text-ink-soft transition hover:bg-parchment disabled:opacity-40"
                              aria-label={`Increase quantity of ${line.nameEn}`}
                            >
                              <Plus size={14} aria-hidden />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-bold">{etb(line.price * line.qty)}</p>
                            <button
                              onClick={() => remove(line.productId)}
                              className="grid h-9 w-9 place-items-center rounded-xl text-ink-faint transition hover:bg-danger-soft hover:text-danger"
                              aria-label={`Remove ${line.nameEn} from cart`}
                            >
                              <Trash2 size={15} aria-hidden />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <footer className="flex items-center justify-between border-t border-sand px-4 py-3 text-sm sm:px-5">
                <span className="text-ink-soft">Subtotal</span>
                <span className="font-bold">{etb(group.subtotal)}</span>
              </footer>
            </section>
          ))}

          {/* Summary */}
          <aside className="rounded-2xl border border-sand bg-card p-5 shadow-card">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">Items subtotal</span>
              <span className="font-semibold">{etb(total)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-ink-soft">
                <Truck size={14} aria-hidden /> Delivery
              </span>
              <span className="font-semibold text-moss">Calculated at checkout</span>
            </div>
            <p className="mt-4 rounded-xl bg-peach px-4 py-3 text-xs leading-5 text-accent-deep">
              {total >= FREE_DELIVERY_THRESHOLD
                ? "Great — your order qualifies for free delivery!"
                : `Orders over ${etb(FREE_DELIVERY_THRESHOLD)} ship free. You're ${etb(FREE_DELIVERY_THRESHOLD - total)} away.`}
            </p>
            {role === "customer" ? (
              <Link href="/checkout" className={buttonClasses("accent", "mt-5 w-full py-3.5 text-base")}>
                Continue to checkout <ArrowRight size={17} aria-hidden />
              </Link>
            ) : (
              <p className="mt-5 rounded-xl bg-warn-soft px-4 py-3 text-xs font-semibold text-warn">
                Switch to the Customer role in the header to check out.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
