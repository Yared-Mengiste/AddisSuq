import { fail, ok, readTable } from "@/lib/db";
import type { Order } from "@/types";

type Ctx = { params: Promise<{ shopId: string }> };

/**
 * GET /api/vendor/[shopId]/summary — Module A dashboard stats.
 * Orders today, total products, revenue (excluding cancelled), plus a
 * 7-day revenue sparkline and per-status order counts.
 */
export async function GET(_request: Request, { params }: Ctx) {
  const { shopId } = await params;
  const [shops, orders, products] = await Promise.all([
    readTable("shops"),
    readTable("orders"),
    readTable("products"),
  ]);

  const shop = shops.find((s) => s.id === shopId);
  if (!shop) return fail("Shop not found", 404);

  const shopOrders = orders.filter((o) => o.shopId === shopId);
  const valid = shopOrders.filter((o) => o.status !== "cancelled");
  const today = new Date().toISOString().slice(0, 10);

  // 7-day revenue trend.
  const days: { date: string; label: string; revenue: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayOrders = valid.filter((o) => o.createdAt.slice(0, 10) === key);
    days.push({
      date: key,
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      orders: dayOrders.length,
    });
  }

  const shopProducts = products.filter((p) => p.shopId === shopId);
  const avgConfirmationMs = (() => {
    const withMs = valid.map((o) => o.confirmationMs).filter((m): m is number => m !== null);
    if (!withMs.length) return null;
    return Math.round(withMs.reduce((s, m) => s + m, 0) / withMs.length);
  })();

  const statusCounts: Record<string, number> = {};
  for (const o of shopOrders) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  }

  return ok({
    shop,
    status: shop.status,
    stats: {
      ordersToday: shopOrders.filter((o) => o.createdAt.slice(0, 10) === today).length,
      totalOrders: shopOrders.length,
      activeOrders: shopOrders.filter((o) => !["delivered", "collected", "cancelled"].includes(o.status)).length,
      products: shopProducts.length,
      publishedProducts: shopProducts.filter((p) => p.isPublished).length,
      outOfStock: shopProducts.filter((p) => p.quantity === 0).length,
      lowStock: shopProducts.filter((p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold).length,
      revenue: valid.reduce((s, o) => s + o.total, 0),
      avgConfirmationMs,
    },
    trend: days,
    statusCounts,
    recentOrders: [...shopOrders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map(toSummary),
  });
}

function toSummary(o: Order) {
  return {
    id: o.id,
    customerId: o.customerId,
    itemCount: o.items.reduce((s, it) => s + it.qty, 0),
    total: o.total,
    status: o.status,
    fulfilmentType: o.fulfilmentType,
    createdAt: o.createdAt,
  };
}
