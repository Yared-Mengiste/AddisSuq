import { fail, mutateTable, ok, readTable } from "@/lib/db";
import { MAX_SAVED_ADDRESSES } from "@/lib/rules";
import type { SavedAddress } from "@/types";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/customers/[id] — customer profile with saved addresses. */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const customers = await readTable("customers");
  const customer = customers.find((c) => c.id === id);
  if (!customer) return fail("Customer not found", 404);
  return ok(customer);
}

/**
 * PATCH /api/customers/[id]
 * - { name?, email?, phone? }                 profile edit
 * - { addAddress: SavedAddress }              Module B: save an address (max 3)
 * - { removeAddressId }                       drop an address
 * - { defaultAddressId }                      set default
 * - { setLocation: {lat,lng,label,subCity,address} } quick location set
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    addAddress?: Omit<SavedAddress, "id">;
    removeAddressId?: string;
    defaultAddressId?: string;
    setLocation?: { lat: number; lng: number; label: string; subCity?: string; address?: string };
  };

  const result = await mutateTable("customers", (rows) => {
    const customer = rows.find((c) => c.id === id);
    if (!customer) return null;

    if (body.name) customer.name = body.name;
    if (body.email !== undefined) customer.email = body.email;
    if (body.phone) customer.phone = body.phone;

    if (body.addAddress) {
      if (customer.savedAddresses.length >= MAX_SAVED_ADDRESSES) {
        return { error: `You can keep at most ${MAX_SAVED_ADDRESSES} saved addresses.` } as const;
      }
      const addr: SavedAddress = {
        id: `${customer.id}_addr_${Date.now().toString(36)}`,
        label: body.addAddress.label || "Home",
        address: body.addAddress.address,
        subCity: body.addAddress.subCity || "Bole",
        lat: body.addAddress.lat,
        lng: body.addAddress.lng,
      };
      customer.savedAddresses.push(addr);
      if (!customer.defaultAddressId) customer.defaultAddressId = addr.id;
      return customer;
    }

    if (body.removeAddressId) {
      customer.savedAddresses = customer.savedAddresses.filter((a) => a.id !== body.removeAddressId);
      if (customer.defaultAddressId === body.removeAddressId) {
        customer.defaultAddressId = customer.savedAddresses[0]?.id ?? null;
      }
      return customer;
    }

    if (body.setLocation) {
      const { lat, lng, label, subCity, address } = body.setLocation;
      // Replace the "Current location" pseudo-address if it exists.
      customer.savedAddresses = customer.savedAddresses.filter((a) => a.label !== "Current location");
      const addr: SavedAddress = {
        id: `${customer.id}_loc_${Date.now().toString(36)}`,
        label: "Current location",
        address: address || `${label}${subCity ? `, ${subCity}` : ""}`,
        subCity: subCity || "Bole",
        lat,
        lng,
      };
      customer.savedAddresses.unshift(addr);
      customer.defaultAddressId = addr.id;
      return customer;
    }

    if (body.defaultAddressId) {
      if (customer.savedAddresses.some((a) => a.id === body.defaultAddressId)) {
        customer.defaultAddressId = body.defaultAddressId;
      }
    }
    return customer;
  });

  if (!result) return fail("Customer not found", 404);
  if ("error" in result) return fail(result.error, 400);
  return ok(result);
}
