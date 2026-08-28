/**
 * Business rules taken straight from the project scope statement (SPM §6.3).
 * They live in one file so the demo can point at where each rule is enforced.
 */

import type { FulfilmentType, OrderStatus, PaymentMethod } from "@/types";

/** Fallback location used before a customer sets their own (Bole, Addis Ababa). */
export const DEFAULT_LOCATION = { lat: 8.9945, lng: 38.7896, label: "Bole, Addis Ababa" };

export const SUB_CITIES = [
  "Bole",
  "Kirkos",
  "Yeka",
  "Arada",
  "Lideta",
  "Addis Ketema",
  "Nifas Silk-Lafto",
  "Gulele",
  "Kolfe Keranio",
  "Akaky Kaliti",
];

/** Module D: distance-band delivery fee, in ETB. */
export const DELIVERY_FEE_BANDS = [
  { maxKm: 3, fee: 40, label: "0 – 3 km" },
  { maxKm: 5, fee: 60, label: "3 – 5 km" },
  { maxKm: 7, fee: 90, label: "5 – 7 km" },
];

/** Same-day delivery is only offered inside this radius; beyond it, pickup only. */
export const MAX_DELIVERY_RADIUS_KM = 7;

/** Orders above this subtotal ship free. */
export const FREE_DELIVERY_THRESHOLD = 2000;

/** A vendor is expected to confirm an order within this many seconds. */
export const CONFIRMATION_TARGET_SECONDS = 10;

/** An unpaid online order expires after this long and releases its reserved stock. */
export const PAYMENT_EXPIRY_MINUTES = 30;

/** A customer may keep at most this many saved addresses. */
export const MAX_SAVED_ADDRESSES = 3;

/** The one-time password the demo always accepts. */
export const DEMO_OTP = "1234";

/** One-time passwords expire after five minutes. */
export const OTP_EXPIRY_MINUTES = 5;

export const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  labelAm: string;
  blurb: string;
  online: boolean;
  glyph: string;
}[] = [
  {
    id: "telebirr",
    label: "Telebirr",
    labelAm: "ቴሌብር",
    blurb: "Mobile money — you approve a push on your phone",
    online: true,
    glyph: "T",
  },
  {
    id: "cbebirr",
    label: "CBE Birr",
    labelAm: "ሲቢኢ ብር",
    blurb: "Pay from your CBE Birr wallet",
    online: true,
    glyph: "C",
  },
  {
    id: "chapa",
    label: "Chapa",
    labelAm: "ቻፓ",
    blurb: "Card and wallet checkout via Chapa",
    online: true,
    glyph: "Ch",
  },
  {
    id: "cod",
    label: "Cash on delivery",
    labelAm: "በእጅ ክፍያ",
    blurb: "Pay the rider or the shop when you receive the order",
    online: false,
    glyph: "ብር",
  },
];

export function paymentMethodMeta(id: PaymentMethod) {
  return PAYMENT_METHODS.find((m) => m.id === id) ?? PAYMENT_METHODS[0];
}

/** Delivery fee for a distance, honouring the free-delivery threshold. */
export function deliveryFeeFor(
  distanceKm: number,
  fulfilmentType: FulfilmentType,
  subtotal: number
): number {
  if (fulfilmentType === "pickup") return 0;
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  const band = DELIVERY_FEE_BANDS.find((b) => distanceKm <= b.maxKm);
  return band ? band.fee : DELIVERY_FEE_BANDS[DELIVERY_FEE_BANDS.length - 1].fee + 40;
}

export function feeBandLabel(distanceKm: number): string {
  const band = DELIVERY_FEE_BANDS.find((b) => distanceKm <= b.maxKm);
  return band ? band.label : `over ${MAX_DELIVERY_RADIUS_KM} km`;
}

/* ------------------------------------------------------------------ */
/* Order status machine (Module D)                                     */
/* ------------------------------------------------------------------ */

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; labelAm: string; tone: "info" | "ok" | "warn" | "bad"; blurb: string }
> = {
  placed: {
    label: "Placed",
    labelAm: "ተላልፏል",
    tone: "info",
    blurb: "Order received, waiting for the shop to confirm",
  },
  confirmed: {
    label: "Confirmed",
    labelAm: "ተረጋግጧል",
    tone: "info",
    blurb: "The shop accepted the order",
  },
  packed: { label: "Packed", labelAm: "ተዘጋጅቷል", tone: "info", blurb: "Items packed and ready" },
  out_for_delivery: {
    label: "Out for delivery",
    labelAm: "በመንገድ ላይ",
    tone: "warn",
    blurb: "A rider is on the way to you",
  },
  ready_for_pickup: {
    label: "Ready for pickup",
    labelAm: "ለመውሰድ ተዘጋጅቷል",
    tone: "warn",
    blurb: "Collect it from the shop during trading hours",
  },
  delivered: { label: "Delivered", labelAm: "ደርሷል", tone: "ok", blurb: "Handed to the customer" },
  collected: { label: "Collected", labelAm: "ተወስዷል", tone: "ok", blurb: "Picked up in store" },
  cancelled: { label: "Cancelled", labelAm: "ተሰርዟል", tone: "bad", blurb: "Order cancelled" },
};

/** The happy-path steps a customer sees, which differ for delivery vs pickup. */
export function timelineSteps(fulfilmentType: FulfilmentType): OrderStatus[] {
  return fulfilmentType === "delivery"
    ? ["placed", "confirmed", "packed", "out_for_delivery", "delivered"]
    : ["placed", "confirmed", "packed", "ready_for_pickup", "collected"];
}

/** Which statuses a vendor may move to from the current one. */
export function nextStatuses(current: OrderStatus, fulfilmentType: FulfilmentType): OrderStatus[] {
  const steps = timelineSteps(fulfilmentType);
  if (current === "cancelled") return [];
  const i = steps.indexOf(current);
  const terminal = fulfilmentType === "delivery" ? "delivered" : "collected";
  if (i === -1 || current === terminal) return [];
  const forward = steps[i + 1];
  return forward === terminal ? [forward] : [forward, "cancelled"];
}

export function isTerminal(status: OrderStatus): boolean {
  return status === "delivered" || status === "collected" || status === "cancelled";
}

export function statusProgress(order: { status: OrderStatus; fulfilmentType: FulfilmentType }) {
  const steps = timelineSteps(order.fulfilmentType);
  if (order.status === "cancelled") return { index: -1, total: steps.length };
  return { index: steps.indexOf(order.status), total: steps.length };
}
