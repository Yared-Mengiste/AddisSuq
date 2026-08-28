import { mutateTable, nextId, ok, readTable } from "@/lib/db";
import type { Customer } from "@/types";

/**
 * GET /api/customers — the demo user picker list (id, name, phone only).
 */
export async function GET() {
  const customers = await readTable("customers");
  return ok(
    customers
      .map(({ id, name, phone }) => ({ id, name, phone }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );
}

/**
 * POST /api/customers — Module B sign-up (after the fake OTP screen).
 * Body: { name, phone, email?, address: { label, address, subCity, lat?, lng? } }
 */
export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Customer> & {
    address?: { label: string; address: string; subCity: string; lat?: number; lng?: number };
  };
  if (!body.name) return Response.json({ error: "Missing field: name" }, { status: 400 });
  if (!body.phone) return Response.json({ error: "Missing field: phone" }, { status: 400 });

  const customers = await readTable("customers");
  if (customers.some((c) => c.phone === body.phone)) {
    return Response.json({ error: "A customer with this phone number already exists" }, { status: 409 });
  }

  const id = nextId("cust", customers);
  const firstAddress = body.address
    ? [{
        id: `${id}_addr_1`,
        label: body.address.label || "Home",
        address: body.address.address,
        subCity: body.address.subCity,
        lat: body.address.lat ?? 8.9945,
        lng: body.address.lng ?? 38.7896,
      }]
    : [];

  const customer: Customer = {
    id,
    name: body.name,
    phone: body.phone,
    email: body.email || "",
    savedAddresses: firstAddress,
    defaultAddressId: firstAddress[0]?.id ?? null,
    phoneVerified: true, // the demo OTP screen verified it
    createdAt: new Date().toISOString(),
  };

  await mutateTable("customers", (rows) => {
    rows.push(customer);
  });
  return ok(customer, { status: 201 });
}
