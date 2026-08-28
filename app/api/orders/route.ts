import { fail, mutateTable, nextId, ok, readTable } from "@/lib/db";
import { sortOrdersDesc } from "@/lib/enrich";
import { pushNotification } from "@/lib/notifications";
import { deliveryFeeFor } from "@/lib/rules";
import type { Order } from "@/types";

/**
 * GET /api/orders
 * Query: customerId, shopId, status, limit — newest first.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orders = await readTable("orders");
  let list = orders;

  const customerId = url.searchParams.get("customerId");
  if (customerId) list = list.filter((o) => o.customerId === customerId);

  const shopId = url.searchParams.get("shopId");
  if (shopId) list = list.filter((o) => o.shopId === shopId);

  const status = url.searchParams.get("status");
  if (status && status !== "all") list = list.filter((o) => o.status === status);

  list = sortOrdersDesc(list);

  const limit = Number(url.searchParams.get("limit"));
  if (Number.isFinite(limit) && limit > 0) list = list.slice(0, limit);

  return ok(list);
}

/* ------------------------------------------------------------------ */
/* POST /api/orders — Module C checkout.                               */
/* The cart is grouped by shop client-side; each group becomes one     */
/* order. Accepts a single draft or an array of drafts and places      */
/* them atomically: validate stock, decrement it, simulate payment,    */
/* write order + notifications.                                        */
/* ------------------------------------------------------------------ */

interface OrderDraft {
  shopId: string;
  customerId: string;
  items: { productId: string; qty: number }[];
  fulfilmentType: "delivery" | "pickup";
  paymentMethod: "telebirr" | "cbebirr" | "chapa" | "cod";
  slot: { date: string; window: string; label: string } | null;
  deliveryAddress: Order["deliveryAddress"];
  customerNote?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as OrderDraft | { orders: OrderDraft[] };
  const drafts: OrderDraft[] = Array.isArray((body as { orders: OrderDraft[] }).orders)
    ? (body as { orders: OrderDraft[] }).orders
    : [body as OrderDraft];

  if (drafts.length === 0) return fail("No orders to place");

  const placed: Order[] = [];
  const problems: { shopId: string; error: string }[] = [];

  for (const draft of drafts) {
    const result = await placeOne(draft);
    if ("error" in result) {
      problems.push({ shopId: draft.shopId, error: result.error });
    } else {
      placed.push(result.order);
    }
  }

  if (placed.length === 0) {
    return fail(problems[0]?.error ?? "Could not place the order(s)");
  }
  return Response.json({ orders: placed, problems }, { status: 201 });
}

async function placeOne(draft: OrderDraft): Promise<{ order: Order } | { error: string }> {
  if (!draft.customerId) return { error: "Missing field: customerId" };
  if (!draft.shopId) return { error: "Missing field: shopId" };
  if (!draft.items?.length) return { error: "Missing field: items" };

  // Validation + stock decrement + write happen inside one mutateTable call
  // so they are a single atomic step.
  const orderPrep = await mutateTable("products", (products) => {
    const items: Order["items"] = [];
    const missing: string[] = [];
    const outOfStock: string[] = [];

    for (const line of draft.items) {
      const product = products.find((p) => p.id === line.productId);
      if (!product || product.shopId !== draft.shopId) {
        missing.push(line.productId);
        continue;
      }
      if (product.quantity < line.qty) {
        outOfStock.push(`${product.nameEn} (only ${product.quantity} left)`);
        continue;
      }
      items.push({
        productId: product.id,
        nameEn: product.nameEn,
        nameAm: product.nameAm,
        qty: line.qty,
        price: product.price,
      });
    }

    if (missing.length) return { ok: false as const, error: `Unknown product: ${missing.join(", ")}` };
    if (outOfStock.length) return { ok: false as const, error: `Not enough stock: ${outOfStock.join(", ")}` };
    if (!items.length) return { ok: false as const, error: "No valid items in this order" };

    // Stock decrements on placement (Module C rule).
    for (const line of draft.items) {
      const product = products.find((p) => p.id === line.productId);
      if (product) {
        product.quantity -= line.qty;
        product.updatedAt = new Date().toISOString();
      }
    }

    return { ok: true as const, items };
  });

  if (!orderPrep.ok) return { error: orderPrep.error };

  const [orders, shops, customers] = await Promise.all([
    readTable("orders"),
    readTable("shops"),
    readTable("customers"),
  ]);
  const shop = shops.find((s) => s.id === draft.shopId);
  const customer = customers.find((c) => c.id === draft.customerId);
  if (!shop) return { error: "Shop not found" };
  if (shop.status !== "approved") return { error: "This shop is not accepting orders yet" };
  if (!customer) return { error: "Customer not found" };

  const subtotal = orderPrep.items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const lat = draft.deliveryAddress?.lat ?? customer.savedAddresses[0]?.lat ?? 8.9945;
  const lng = draft.deliveryAddress?.lng ?? customer.savedAddresses[0]?.lng ?? 38.7896;
  const dx = lat - shop.lat;
  const dy = lng - shop.lng;
  const distanceKm = Math.round(Math.sqrt(dx * dx + dy * dy) * 111 * 10) / 10;

  const deliveryFee = deliveryFeeFor(distanceKm, draft.fulfilmentType, subtotal);
  const total = subtotal + deliveryFee;

  // Payment simulation: online methods succeed instantly in the demo
  // (the client shows a fake "processing" delay), COD is paid on handover.
  const online = draft.paymentMethod !== "cod";
  const paymentStatus: Order["paymentStatus"] = online ? "paid" : "pending";

  const id = nextId("ord", orders, 3);
  const now = new Date().toISOString();

  const order: Order = {
    id,
    customerId: draft.customerId,
    shopId: draft.shopId,
    items: orderPrep.items,
    subtotal,
    deliveryFee,
    total,
    fulfilmentType: draft.fulfilmentType,
    slot: draft.slot,
    deliveryAddress: draft.deliveryAddress ?? null,
    distanceKm,
    paymentMethod: draft.paymentMethod,
    paymentStatus,
    paymentRef: online ? `PAY-${id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}` : null,
    status: "placed",
    statusHistory: [{ status: "placed", at: now, by: "customer" }],
    cancellationReason: null,
    customerNote: draft.customerNote ?? "",
    confirmationMs: null,
    createdAt: now,
  };

  await mutateTable("orders", (rows) => {
    rows.push(order);
  });

  /* Simulated notifications (Module D) — vendor gets a new-order alert,
     customer gets a placement receipt and (for online payment) a receipt. */
  const methodLabel =
    draft.paymentMethod === "telebirr"
      ? "Telebirr"
      : draft.paymentMethod === "cbebirr"
        ? "CBE Birr"
        : draft.paymentMethod === "chapa"
          ? "Chapa"
          : "cash on delivery";

  await pushNotification({
    userId: shop.id,
    userType: "vendor",
    channel: "sms",
    subject: "New order",
    message: `New order ${order.id} from ${customer.name.split(" ")[0]} — ${total.toLocaleString("en-US")} ETB (${order.items.length} item${order.items.length > 1 ? "s" : ""}, ${order.fulfilmentType}).`,
    orderId: order.id,
  });
  await pushNotification({
    userId: customer.id,
    userType: "customer",
    channel: online ? "sms" : "email",
    subject: "Order placed",
    message: `We sent your order ${order.id} to ${shop.name}. You'll get an update as soon as they confirm (usually within 10 seconds in this demo).`,
    orderId: order.id,
  });
  if (online) {
    await pushNotification({
      userId: customer.id,
      userType: "customer",
      channel: "sms",
      subject: "Payment received",
      message: `Payment of ${total.toLocaleString("en-US")} ETB for order ${order.id} was received via ${methodLabel}. Ref: ${order.paymentRef}.`,
      orderId: order.id,
    });
  }

  return { order };
}
