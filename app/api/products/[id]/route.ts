import { fail, mutateTable, ok, readTable } from "@/lib/db";
import { parseLatLng } from "@/lib/enrich";
import { distanceKm } from "@/lib/geo";
import type { Product } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/products/[id] — product detail + owning shop (approved shops only). */
export async function GET(request: Request, { params }: Ctx) {
  const { id } = await params;
  const [products, shops] = await Promise.all([readTable("products"), readTable("shops")]);
  const product = products.find((p) => p.id === id);
  if (!product) return fail("Product not found", 404);

  const shop = shops.find((s) => s.id === product.shopId);
  if (!shop || shop.status !== "approved") return fail("Product not found", 404);

  const origin = parseLatLng(new URL(request.url));
  return ok({
    product: {
      ...product,
      shop: { id: shop.id, name: shop.name, nameAm: shop.nameAm, subCity: shop.subCity, lat: shop.lat, lng: shop.lng, status: shop.status },
      distanceKm: distanceKm(origin, { lat: shop.lat, lng: shop.lng }),
    },
  });
}

/** PATCH /api/products/[id] — Module A: vendor edits / publishes / restocks. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await request.json()) as Partial<Product> & { action?: "togglePublish" };

  const result = await mutateTable("products", (rows) => {
    const product = rows.find((p) => p.id === id);
    if (!product) return null;

    if (body.action === "togglePublish") {
      product.isPublished = !product.isPublished;
    }
    const editable = [
      "nameEn", "nameAm", "category", "description", "descriptionAm", "price",
      "compareAtPrice", "unit", "quantity", "lowStockThreshold", "isPublished",
    ] as const;
    for (const key of editable) {
      if (body[key] !== undefined) {
        product[key] = key === "price" || key === "compareAtPrice" || key === "quantity" || key === "lowStockThreshold"
          ? (Math.round(body[key] as number) as never)
          : (body[key] as never);
      }
    }
    product.updatedAt = new Date().toISOString();
    return product;
  });

  if (!result) return fail("Product not found", 404);
  return ok(result);
}

/** DELETE /api/products/[id] — vendor removes a product from the catalogue. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const found = await mutateTable("products", (rows) => {
    const i = rows.findIndex((p) => p.id === id);
    if (i === -1) return false;
    rows.splice(i, 1);
    return true;
  });
  if (!found) return fail("Product not found", 404);
  return ok({ deleted: id });
}
