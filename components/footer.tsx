import Link from "next/link";
import { Store } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-sand bg-parchment">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <p className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white">
              <Store size={15} aria-hidden />
            </span>
            <span className="font-serif text-xl font-semibold tracking-tight">
              Addis<span className="text-accent">Suq</span>
            </span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-6 text-ink-soft">
            A hyper-local marketplace for the small shops of Addis Ababa. SE341 course prototype — payments and
            notifications are simulated.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li><Link className="hover:text-ink hover:underline" href="/search">Browse products</Link></li>
            <li><Link className="hover:text-ink hover:underline" href="/search?sort=distance">Shops near you</Link></li>
            <li><Link className="hover:text-ink hover:underline" href="/cart">Your cart</Link></li>
            <li><Link className="hover:text-ink hover:underline" href="/orders">Track an order</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">Sell</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li><Link className="hover:text-ink hover:underline" href="/vendor/onboarding">Register your shop</Link></li>
            <li><Link className="hover:text-ink hover:underline" href="/vendor/dashboard">Vendor dashboard</Link></li>
            <li><Link className="hover:text-ink hover:underline" href="/admin/vendors">Admin approvals</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">Payment options</p>
          <ul className="mt-3 flex flex-wrap gap-2 text-xs text-ink-soft">
            {["Telebirr", "CBE Birr", "Chapa", "Cash on delivery"].map((m) => (
              <li key={m} className="rounded-full border border-sand-deep bg-card px-3 py-1.5">{m}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-5 text-ink-faint">
            Delivery fee by distance band · free over 2,000 ETB · same-day inside 7 km.
          </p>
        </div>
      </div>
      <div className="border-t border-sand px-4 py-5 text-center text-xs text-ink-faint">
        © 2026 AddisSuq · Your neighbourhood, online · Built for SE341
      </div>
    </footer>
  );
}
