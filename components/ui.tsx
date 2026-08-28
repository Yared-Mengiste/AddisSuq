"use client";

/**
 * Small shared UI primitives: status badges, empty states, skeletons,
 * section headings and buttons — used across every screen.
 */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ORDER_STATUS_META } from "@/lib/rules";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/types";

/* ---------------------------------------------------------------- */
/* Badges                                                            */
/* ---------------------------------------------------------------- */

const TONES = {
  ok: "bg-ok-soft text-ok",
  info: "bg-info-soft text-info",
  warn: "bg-warn-soft text-warn",
  bad: "bg-danger-soft text-danger",
  neutral: "bg-parchment text-ink-soft",
  accent: "bg-peach text-accent-deep",
} as const;

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className = "" }: { status: OrderStatus; className?: string }) {
  const meta = ORDER_STATUS_META[status];
  const icon: Record<string, string> = {
    ok: "✓",
    info: "•",
    warn: "◔",
    bad: "×",
  };
  return (
    <Badge tone={meta.tone} className={className}>
      <span aria-hidden>{icon[meta.tone]}</span> {meta.label}
    </Badge>
  );
}

export function PaymentBadge({
  method,
  status,
  className = "",
}: {
  method: PaymentMethod;
  status: PaymentStatus;
  className?: string;
}) {
  const label =
    method === "telebirr" ? "Telebirr" : method === "cbebirr" ? "CBE Birr" : method === "chapa" ? "Chapa" : "Cash on delivery";
  const tone = status === "paid" ? "ok" : status === "failed" ? "bad" : status === "refunded" ? "info" : "warn";
  const mark = status === "paid" ? "✓" : status === "failed" ? "×" : status === "refunded" ? "↺" : "…";
  return (
    <Badge tone={tone} className={className}>
      <span aria-hidden>{mark}</span> {label}
    </Badge>
  );
}

/* ---------------------------------------------------------------- */
/* Buttons                                                          */
/* ---------------------------------------------------------------- */

type ButtonVariant = "primary" | "accent" | "ghost" | "outline" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-cream hover:bg-brand-deep disabled:bg-ink-faint",
  accent: "bg-accent text-white hover:bg-accent-deep disabled:bg-sand-deep disabled:text-ink-soft",
  ghost: "bg-transparent text-ink hover:bg-mint disabled:text-ink-faint",
  outline: "border border-sand-deep bg-card text-ink hover:border-brand hover:bg-mint disabled:text-ink-faint",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white",
};

export function buttonClasses(variant: ButtonVariant = "primary", extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-70 ${VARIANTS[variant]} ${extra}`;
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, className)}>
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------- */
/* Section heading                                                  */
/* ---------------------------------------------------------------- */

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">{eyebrow}</p>
        )}
        <h2 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Empty state                                                      */
/* ---------------------------------------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-sand-deep bg-parchment/60 px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mint text-moss">
        <Icon size={26} aria-hidden />
      </span>
      <h3 className="mt-4 font-serif text-xl font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-ink-soft">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Skeletons                                                        */
/* ---------------------------------------------------------------- */

export function CardSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-card">
      <div className={`skeleton ${tall ? "aspect-[4/3]" : "aspect-square"}`} />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-3 w-1/3 rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="skeleton h-4 w-2/5 rounded" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 8, tall = false }: { count?: number; tall?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} tall={tall} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 4, height = "h-24" }: { count?: number; height?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton rounded-2xl ${height}`} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Misc                                                             */
/* ---------------------------------------------------------------- */

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-danger/30 bg-danger-soft px-5 py-4 text-sm text-danger">
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold hover:bg-danger hover:text-white">
          Try again
        </button>
      )}
    </div>
  );
}

export function QtyStepper({
  value,
  min = 1,
  max = 99,
  onChange,
  size = "md",
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (qty: number) => void;
  size?: "sm" | "md";
}) {
  const btn =
    size === "sm"
      ? "h-7 w-7 text-sm"
      : "h-9 w-9 text-base";
  return (
    <div className="inline-flex items-center rounded-xl border border-sand-deep bg-card" role="group" aria-label="Quantity">
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-l-xl font-bold text-ink-soft transition hover:bg-parchment disabled:opacity-40`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className={`${size === "sm" ? "w-8 text-sm" : "w-10 text-sm"} text-center font-semibold`} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={`${btn} grid place-items-center rounded-r-xl font-bold text-ink-soft transition hover:bg-parchment disabled:opacity-40`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
