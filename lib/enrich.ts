/**
 * Server-side enrichment shared by the API route handlers: attaches distance,
 * product counts and open-now flags to raw table rows.
 */

import { distanceKm, isOpenAt } from "@/lib/geo";
import { DEFAULT_LOCATION } from "@/lib/rules";
import type { Order, Product, Shop, ShopWithDistance } from "@/types";

export function parseLatLng(url: URL): { lat: number; lng: number } {
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return { lat, lng };
  }
  return { ...DEFAULT_LOCATION };
}

export function enrichShop(
  shop: Shop,
  products: Product[],
  origin: { lat: number; lng: number }
): ShopWithDistance {
  const published = products.filter((p) => p.shopId === shop.id && p.isPublished && p.quantity > 0);
  return {
    ...shop,
    distanceKm: distanceKm(origin, { lat: shop.lat, lng: shop.lng }),
    productCount: published.length,
    inRadius: distanceKm(origin, { lat: shop.lat, lng: shop.lng }) <= shop.deliveryRadiusKm,
    isOpenNow: isOpenAt(shop.tradingHours.open, shop.tradingHours.close),
  };
}

/** Sort orders newest-first, the way every list screen wants them. */
export function sortOrdersDesc(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
