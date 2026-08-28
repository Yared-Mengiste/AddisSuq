import { mutateTable, ok, readTable } from "@/lib/db";

/**
 * GET /api/notifications — the simulated SMS/e-mail feed (Module D).
 * Query: userId, userType, orderId, unread=1
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const notifications = await readTable("notifications");
  let list = [...notifications];

  const userId = url.searchParams.get("userId");
  if (userId) list = list.filter((n) => n.userId === userId);

  const userType = url.searchParams.get("userType");
  if (userType) list = list.filter((n) => n.userType === userType);

  const orderId = url.searchParams.get("orderId");
  if (orderId) list = list.filter((n) => n.orderId === orderId);

  const onlyUnread = url.searchParams.get("unread") === "1";
  if (onlyUnread) list = list.filter((n) => !n.read);

  const limit = Number(url.searchParams.get("limit"));
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (Number.isFinite(limit) && limit > 0) list = list.slice(0, limit);

  return ok(list);
}

/**
 * PATCH /api/notifications — mark rows as read.
 * Body: { ids: string[] } or { all: true, userId }
 */
export async function PATCH(request: Request) {
  const body = (await request.json()) as { ids?: string[]; all?: boolean; userId?: string };

  const updated = await mutateTable("notifications", (rows) => {
    let count = 0;
    if (body.all && body.userId) {
      for (const n of rows) {
        if (n.userId === body.userId && !n.read) {
          n.read = true;
          count += 1;
        }
      }
    } else if (body.ids?.length) {
      const set = new Set(body.ids);
      for (const n of rows) {
        if (set.has(n.id) && !n.read) {
          n.read = true;
          count += 1;
        }
      }
    }
    return count;
  });

  return ok({ updated });
}
