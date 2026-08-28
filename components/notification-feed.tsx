"use client";

/**
 * The simulated notification feed (Module D): every SMS/e-mail the
 * "system" would have sent, rendered as a chat-style log.
 */

import { Mail, MessageSquare } from "lucide-react";
import { formatDateTime, relativeTime } from "@/lib/geo";
import type { AppNotification } from "@/types";

export function NotificationFeed({
  notifications,
  title = "Notification log",
  compact = false,
}: {
  notifications: AppNotification[];
  title?: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-sand bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold">{title}</h3>
        <span className="rounded-full bg-parchment px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
          Simulated · nothing sent
        </span>
      </div>
      {notifications.length === 0 ? (
        <p className="rounded-xl bg-parchment px-4 py-6 text-center text-sm text-ink-faint">
          No messages yet — updates appear here as the order moves.
        </p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li key={n.id} className="flex gap-3 rounded-xl border border-sand bg-cream/60 p-3.5">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                  n.channel === "sms" ? "bg-mint text-moss" : "bg-info-soft text-info"
                }`}
                aria-hidden
              >
                {n.channel === "sms" ? <MessageSquare size={16} /> : <Mail size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  {n.subject}
                  <span className="rounded-full bg-card px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-faint">
                    {n.channel === "sms" ? `to ${n.userId}` : `e-mail`}
                  </span>
                </p>
                <p className="mt-1 text-[13px] leading-5 text-ink-soft">{n.message}</p>
                <p className="mt-1 text-[10px] text-ink-faint" title={formatDateTime(n.createdAt)}>
                  {compact ? relativeTime(n.createdAt) : formatDateTime(n.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
