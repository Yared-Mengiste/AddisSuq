import { fail, mutateTable, ok, readTable } from "@/lib/db";
import { pushNotification } from "@/lib/notifications";
import { ORDER_STATUS_META, isTerminal, nextStatuses } from "@/lib/rules";
import type { OrderStatus } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/orders/[id] — order + shop + customer context + its notifications. */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const [orders, shops, customers, notifications] = await Promise.all([
    readTable("orders"),
    readTable("shops"),
    readTable("customers"),
    readTable("notifications"),
  ]);
  const order = orders.find((o) => o.id === id);
  if (!order) return fail("Order not found", 404);

  const shop = shops.find((s) => s.id === order.shopId) ?? null;
  const customer = customers.find((c) => c.id === order.customerId) ?? null;
  const feed = notifications
    .filter((n) => n.orderId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return ok({ order, shop, customer, notifications: feed });
}

/**
 * PATCH /api/orders/[id] — Module D: vendor advances the order state machine
 * (or the customer cancels while it is still new).
 * Body: { status, note?, by?: "vendor"|"customer" }
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await request.json()) as { status: OrderStatus; note?: string; by?: "vendor" | "customer" };

  if (!body?.status) return fail("Missing field: status");

  const result = await mutateTable("orders", (rows) => {
    const order = rows.find((o) => o.id === id);
    if (!order) return { kind: "notfound" as const };
    if (isTerminal(order.status)) return { kind: "error" as const, error: "This order is already completed." };

    const actor = body.by ?? "vendor";
    const allowed =
      actor === "customer"
        ? order.status === "placed" || order.status === "confirmed"
        : nextStatuses(order.status, order.fulfilmentType).includes(body.status);

    if (!allowed) {
      return {
        kind: "error" as const,
        error: `Cannot move order from "${ORDER_STATUS_META[order.status].label}" to "${ORDER_STATUS_META[body.status]?.label ?? body.status}".`,
      };
    }

    const now = new Date().toISOString();
    order.status = body.status;
    order.statusHistory.push({ status: body.status, at: now, by: actor, note: body.note });
    if (body.status === "cancelled") order.cancellationReason = body.note ?? "Order cancelled";
    if (body.status === "confirmed") {
      order.confirmationMs = new Date(now).getTime() - new Date(order.createdAt).getTime();
    }
    if (body.status === "delivered" || body.status === "collected") {
      // Cash on delivery is settled on handover.
      if (order.paymentMethod === "cod" && order.paymentStatus === "pending") {
        order.paymentStatus = "paid";
      }
    }
    return { kind: "ok" as const, order };
  });

  if (result.kind === "notfound") return fail("Order not found", 404);
  if (result.kind === "error") return fail(result.error, 409);
  const order = result.order;

  /* Simulated notification for the customer (Module D). */
  const meta = ORDER_STATUS_META[order.status];
  const [customers] = await Promise.all([readTable("customers")]);
  const customer = customers.find((c) => c.id === order.customerId);
  if (customer) {
    await pushNotification({
      userId: customer.id,
      userType: "customer",
      channel: order.status === "packed" ? "email" : "sms",
      subject: order.status === "cancelled" ? "Order cancelled" : "Order update",
      message:
        order.status === "cancelled"
          ? `Order ${order.id} was cancelled. ${body.note ?? ""}`.trim()
          : `Your order ${order.id} is ${meta.label.toLowerCase()} — ${meta.blurb.toLowerCase()}.`,
      orderId: order.id,
    });
  }

  return ok(order);
}
