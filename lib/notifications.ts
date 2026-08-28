/**
 * Writes one simulated SMS/e-mail notification row (Module D).
 * Nothing is actually sent — the in-app feed reads these rows back.
 */

import { mutateTable } from "@/lib/db";

export interface NotificationDraft {
  userId: string;
  userType: "customer" | "vendor" | "admin";
  channel: "sms" | "email";
  subject: string;
  message: string;
  orderId: string | null;
  read?: boolean;
}

export async function pushNotification(draft: NotificationDraft) {
  await mutateTable("notifications", (rows) => {
    const last = rows[rows.length - 1];
    const n = Number.parseInt(last?.id.slice(6) ?? "0", 10);
    rows.push({
      id: `notif_${String((Number.isFinite(n) ? n : 0) + 1).padStart(3, "0")}`,
      userId: draft.userId,
      userType: draft.userType,
      channel: draft.channel,
      subject: draft.subject,
      message: draft.message,
      orderId: draft.orderId,
      read: draft.read ?? false,
      createdAt: new Date().toISOString(),
    });
  });
}
