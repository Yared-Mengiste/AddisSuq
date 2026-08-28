import { mutateTable, nextId, ok, readTable } from "@/lib/db";
import { enrichShop, parseLatLng } from "@/lib/enrich";
import type { Shop } from "@/types";

/**
 * GET /api/shops
 * Query: lat, lng, category, subCity, q, status (default: approved), featured
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const [shops, products] = await Promise.all([readTable("shops"), readTable("products")]);
  const origin = parseLatLng(url);

  let list = shops;
  const status = url.searchParams.get("status");
  if (status && status !== "all") {
    list = list.filter((s) => s.status === status);
  } else if (!status) {
    list = list.filter((s) => s.status === "approved");
  }

  const category = url.searchParams.get("category");
  if (category) list = list.filter((s) => s.category === category);

  const subCity = url.searchParams.get("subCity");
  if (subCity) list = list.filter((s) => s.subCity === subCity);

  const q = url.searchParams.get("q")?.toLowerCase();
  if (q) {
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.nameAm.includes(q) ||
        s.tagline.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
    );
  }

  const enriched = list.map((s) => enrichShop(s, products, origin));
  enriched.sort((a, b) => a.distanceKm - b.distanceKm);
  return ok(enriched);
}

/**
 * POST /api/shops — Module A vendor onboarding.
 * Creates a shop with status "pending" for admin review.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Shop>;
  const required = ["name", "ownerName", "phone", "subCity", "address", "category"] as const;
  for (const field of required) {
    if (!body[field]) return Response.json({ error: `Missing field: ${field}` }, { status: 400 });
  }

  const shops = await readTable("shops");
  const id = nextId("shop", shops);
  const now = new Date().toISOString();

  const shop: Shop = {
    id,
    name: body.name!,
    nameAm: body.nameAm || body.name!,
    ownerName: body.ownerName!,
    phone: body.phone!,
    email: body.email || "",
    subCity: body.subCity!,
    address: body.address!,
    lat: body.lat ?? DEFAULT_DEMO.lat,
    lng: body.lng ?? DEFAULT_DEMO.lng,
    category: body.category!,
    tradingHours: body.tradingHours ?? { open: "08:30", close: "20:00", days: "Mon – Sat" },
    status: "pending",
    logoUrl: `/api/art/logo/${id}?c=${body.category}`,
    coverUrl: `/api/art/shop/${id}?c=${body.category}`,
    tagline: body.tagline || "",
    tradeLicenceNo: body.tradeLicenceNo || "",
    tinNumber: body.tinNumber || "",
    documents: body.documents ?? { tradeLicence: false, tinCertificate: false },
    deliveryRadiusKm: body.deliveryRadiusKm ?? 7,
    offersDelivery: body.offersDelivery ?? true,
    offersPickup: body.offersPickup ?? true,
    createdAt: now,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
  };

  await mutateTable("shops", (rows) => {
    rows.push(shop);
  });
  return ok(shop, { status: 201 });
}

const DEFAULT_DEMO = { lat: 9.005, lng: 38.76 };
