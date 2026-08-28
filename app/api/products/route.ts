import { mutateTable, nextId, ok, readTable } from "@/lib/db";
import { parseLatLng } from "@/lib/enrich";
import { distanceKm } from "@/lib/geo";
import type { Product, ProductWithShop } from "@/types";

/**
 * GET /api/products — Module B discovery search.
 * Query: q, category, subCity, minPrice, maxPrice, shopId, sort
 *        (sort: distance | price_asc | price_desc | newest)
 * Only published, in-stock products from approved shops are returned.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = parseLatLng(url);
  const [products, shops] = await Promise.all([readTable("products"), readTable("shops")]);

  const approved = new Map(shops.filter((s) => s.status === "approved").map((s) => [s.id, s]));

  let list: ProductWithShop[] = products
    .filter((p) => p.isPublished && p.quantity > 0)
    .map((p) => {
      const shop = approved.get(p.shopId);
      if (!shop) return null;
      return {
        ...p,
        shop: { id: shop.id, name: shop.name, nameAm: shop.nameAm, subCity: shop.subCity, lat: shop.lat, lng: shop.lng, status: shop.status },
        distanceKm: distanceKm(origin, { lat: shop.lat, lng: shop.lng }),
      } satisfies ProductWithShop;
    })
    .filter((p): p is ProductWithShop => p !== null);

  const q = url.searchParams.get("q")?.toLowerCase().trim();
  if (q) {
    list = list.filter(
      (p) =>
        p.nameEn.toLowerCase().includes(q) ||
        p.nameAm.includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.shop.name.toLowerCase().includes(q)
    );
  }

  const category = url.searchParams.get("category");
  if (category && category !== "all") list = list.filter((p) => p.category === category);

  const subCity = url.searchParams.get("subCity");
  if (subCity && subCity !== "all") list = list.filter((p) => p.shop.subCity === subCity);

  const minPrice = Number(url.searchParams.get("minPrice"));
  if (Number.isFinite(minPrice) && minPrice > 0) list = list.filter((p) => p.price >= minPrice);

  const maxPrice = Number(url.searchParams.get("maxPrice"));
  if (Number.isFinite(maxPrice) && maxPrice > 0) list = list.filter((p) => p.price <= maxPrice);

  const shopId = url.searchParams.get("shopId");
  if (shopId) list = list.filter((p) => p.shopId === shopId);

  const sort = url.searchParams.get("sort") ?? "distance";
  switch (sort) {
    case "price_asc":
      list.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      list.sort((a, b) => b.price - a.price);
      break;
    case "newest":
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    default:
      list.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  const limit = Number(url.searchParams.get("limit"));
  if (Number.isFinite(limit) && limit > 0) list = list.slice(0, limit);

  return ok(list);
}

/** POST /api/products — Module A: vendor adds a product to their catalogue. */
export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Product>;
  if (!body.shopId) return Response.json({ error: "Missing field: shopId" }, { status: 400 });
  if (!body.nameEn) return Response.json({ error: "Missing field: nameEn" }, { status: 400 });
  if (!body.price || body.price <= 0) return Response.json({ error: "Price must be greater than 0" }, { status: 400 });

  const products = await readTable("products");
  const id = nextId("prod", products, 3);
  const now = new Date().toISOString();

  const product: Product = {
    id,
    shopId: body.shopId,
    nameEn: body.nameEn,
    nameAm: body.nameAm || body.nameEn,
    category: body.category || "cat_home",
    description: body.description || "",
    descriptionAm: body.descriptionAm || "",
    price: Math.round(body.price),
    compareAtPrice: body.compareAtPrice ?? null,
    unit: body.unit || "each",
    photos: [`/api/art/product/${id}?c=${body.category || "cat_home"}`],
    quantity: Math.max(0, Math.round(body.quantity ?? 0)),
    lowStockThreshold: body.lowStockThreshold ?? 5,
    isPublished: body.isPublished ?? true,
    sku: `NEW-${String(products.length + 1).padStart(3, "0")}`,
    createdAt: now,
    updatedAt: now,
  };

  await mutateTable("products", (rows) => {
    rows.push(product);
  });
  return ok(product, { status: 201 });
}
