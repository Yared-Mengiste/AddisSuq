import { ok, readTable } from "@/lib/db";

/** GET /api/categories — category chips for discovery screens. */
export async function GET() {
  const categories = await readTable("categories");
  return ok(categories);
}
