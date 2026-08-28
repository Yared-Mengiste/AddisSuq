import { ok, readTable } from "@/lib/db";

/**
 * GET /api/admin/stats — Module A admin overview:
 * counts + GMV computed live from the JSON files.
 */
export async function GET() {
  const [shops, products, orders, customers] = await Promise.all([
    readTable("shops"),
    readTable("products"),
    readTable("orders"),
    readTable("customers"),
  ]);

  const paidOrOwing = orders.filter((o) => o.status !== "cancelled");
  const gmv = paidOrOwing.reduce((sum, o) => sum + o.total, 0);
  const today = new Date().toISOString().slice(0, 10);

  return ok({
    shops: {
      total: shops.length,
      approved: shops.filter((s) => s.status === "approved").length,
      pending: shops.filter((s) => s.status === "pending").length,
      rejected: shops.filter((s) => s.status === "rejected").length,
    },
    products: {
      total: products.length,
      published: products.filter((p) => p.isPublished).length,
      outOfStock: products.filter((p) => p.quantity === 0).length,
    },
    orders: {
      total: orders.length,
      active: orders.filter((o) => !["delivered", "collected", "cancelled"].includes(o.status)).length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      today: orders.filter((o) => o.createdAt.slice(0, 10) === today).length,
      byStatus: Object.fromEntries(
        [...new Set(orders.map((o) => o.status))].map((s) => [s, orders.filter((o) => o.status === s).length])
      ),
    },
    customers: { total: customers.length },
    gmv,
    paidGmv: paidOrOwing.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0),
  });
}
