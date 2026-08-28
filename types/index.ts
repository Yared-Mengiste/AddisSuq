/**
 * Shared domain types for AddisSuq.
 * These mirror the JSON "database" files in /data one-to-one.
 */

export type Role = "customer" | "vendor" | "admin";

export type ShopStatus = "pending" | "approved" | "rejected";

export type FulfilmentType = "delivery" | "pickup";

export type PaymentMethod = "telebirr" | "cbebirr" | "chapa" | "cod";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "delivered"
  | "collected"
  | "cancelled";

export type NotificationChannel = "sms" | "email";

export type UserType = "customer" | "vendor" | "admin";

export interface Category {
  id: string;
  nameEn: string;
  nameAm: string;
  /** Single glyph used in chips so the UI needs no icon fetch. */
  icon: string;
  accent: string;
}

export interface TradingHours {
  open: string;
  close: string;
  days: string;
}

export interface Shop {
  id: string;
  name: string;
  nameAm: string;
  ownerName: string;
  phone: string;
  email: string;
  subCity: string;
  address: string;
  lat: number;
  lng: number;
  /** Category id, e.g. "cat_fashion". */
  category: string;
  tradingHours: TradingHours;
  status: ShopStatus;
  logoUrl: string;
  coverUrl: string;
  tagline: string;
  /** Module A: trade licence + TIN are captured at onboarding. */
  tradeLicenceNo: string;
  tinNumber: string;
  documents: { tradeLicence: boolean; tinCertificate: boolean };
  /** Module D: same-day delivery radius in km. */
  deliveryRadiusKm: number;
  offersDelivery: boolean;
  offersPickup: boolean;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  rejectionReason?: string | null;
}

export interface Product {
  id: string;
  shopId: string;
  nameEn: string;
  nameAm: string;
  category: string;
  description: string;
  descriptionAm: string;
  price: number;
  /** Optional "was" price so discounts can be shown. */
  compareAtPrice: number | null;
  unit: string;
  photos: string[];
  quantity: number;
  lowStockThreshold: number;
  isPublished: boolean;
  sku: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  subCity: string;
  lat: number;
  lng: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  /** Module B allows up to three saved addresses. */
  savedAddresses: SavedAddress[];
  defaultAddressId: string | null;
  phoneVerified: boolean;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  nameEn: string;
  nameAm: string;
  qty: number;
  price: number;
}

export interface StatusEvent {
  status: OrderStatus;
  at: string;
  note?: string;
  by?: string;
}

export interface Order {
  id: string;
  customerId: string;
  shopId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  fulfilmentType: FulfilmentType;
  /** Delivery or pickup window chosen at checkout. */
  slot: { date: string; window: string; label: string } | null;
  deliveryAddress: SavedAddress | null;
  distanceKm: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentRef: string | null;
  status: OrderStatus;
  statusHistory: StatusEvent[];
  cancellationReason?: string | null;
  customerNote: string;
  /** Milliseconds between placement and vendor confirmation (10s target). */
  confirmationMs: number | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  userType: UserType;
  channel: NotificationChannel;
  subject: string;
  message: string;
  orderId: string | null;
  read: boolean;
  createdAt: string;
}

/** Shape of a shop enriched with computed fields for the discovery screens. */
export interface ShopWithDistance extends Shop {
  distanceKm: number;
  productCount: number;
  inRadius: boolean;
  isOpenNow: boolean;
}

export interface ProductWithShop extends Product {
  shop: Pick<Shop, "id" | "name" | "nameAm" | "subCity" | "lat" | "lng" | "status">;
  distanceKm: number;
}
