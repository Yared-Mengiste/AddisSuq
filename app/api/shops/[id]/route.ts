import { fail, mutateTable, ok, readTable } from "@/lib/db";
import { enrichShop, parseLatLng } from "@/lib/enrich";
import type { Shop, ShopStatus } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/shops/[id] — shop + its published catalogue. */
export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const [shops, products] = await Promise.all([readTable("shops"), readTable("products")]);
  const shop = shops.find((s) => s.id === id);
  if (!shop) return fail("Shop not found", 404);

  const url = new URL(request.url);
  const origin = parseLatLng(url);
  const includeAll = url.searchParams.get("all") === "1";
  const catalogue = products
    .filter((p) => p.shopId === id)
    .map((p) => ({
      ...p,
      // Auto-hide at 0 stock / unpublished for customers; vendors still see their own rows.
      hidden: p.quantity === 0 || !p.isPublished,
    }))
    .sort((a, b) => Number(b.isPublished) - Number(a.isPublished) || a.nameEn.localeCompare(b.nameEn));

  const visible = includeAll ? catalogue : catalogue.filter((p) => !p.hidden);

  return ok({ shop: enrichShop(shop, products, origin), products: visible });
}

/**
 * PATCH /api/shops/[id]
 * - Admin review: { action: "approve" | "reject", reason? }
 * - Vendor profile edit: partial shop fields
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await request.json()) as {
    action?: "approve" | "reject";
    reason?: string;
    shop?: Partial<Shop>;
  };

  const result = await mutateTable("shops", (rows) => {
    const shop = rows.find((s) => s.id === id);
    if (!shop) return null;

    const now = new Date().toISOString();
    if (body.action === "approve" || body.action === "reject") {
      const next: ShopStatus = body.action === "approve" ? "approved" : "rejected";
      shop.status = next;
      shop.reviewedAt = now;
      shop.reviewedBy = "admin";
      shop.rejectionReason = body.action === "reject" ? body.reason ?? "Application did not meet requirements." : null;
    }
    if (body.shop) {
      const editable = [
        "name", "nameAm", "ownerName", "phone", "email", "subCity", "address", "lat", "lng",
        "category", "tradingHours", "tagline", "tradeLicenceNo", "tinNumber",
        "deliveryRadiusKm", "offersDelivery", "offersPickup", "logoUrl", "coverUrl",
      ] as const;
      for (const key of editable) {
        if (body.shop?.[key] !== undefined) {
          shop[key] = body.shop[key] as never;
        }
      }
    }
    return shop;
  });

  if (!result) return fail("Shop not found", 404);

  // Admin decision notification to the vendor (Module A).
  if (body.action) {
    const notifications = await readTable("notifications");
    const last = notifications[notifications.length - 1];
    await mutateTable("notifications", (rows) => {
      rows.push({
        id: `notif_${String((last ? Number.parseInt(last.id.slice(6), 10) : 0) + 1).padStart(3, "0")}`,
        userId: id,
        userType: "vendor",
        channel: "sms",
        subject: body.action === "approve" ? "Shop approved" : "Shop application rejected",
        message:
          body.action === "approve"
            ? `Good news — ${result.name} is approved! You can now publish products and receive orders.`
            : `Your application for ${result.name} was rejected. ${result.rejectionReason ?? ""}`.trim(),
        orderId: null,
        read: false,
        createdAt: new Date().toISOString(),
      });
    });
  }

  return ok(result);
}
