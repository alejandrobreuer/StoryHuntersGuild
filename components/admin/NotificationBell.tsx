"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, UserPlus, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AdminNotification {
  id: string;
  type: "task_assigned" | "task_comment";
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const POLL_MS = 60_000;

/** Sidebar bell for the admin panel — polls /api/admin/notifications, shows
 * the unread count, and opens a dropdown of recent notifications. Clicking
 * one marks it read and jumps to its link (e.g. the task's side panel). */
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<AdminNotification[]>([]);
  const [unread, setUnread] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = React.useState<{ top: number; left: number } | null>(null);

  // The sidebar scrolls (overflow-y-auto) and is narrower than the panel, so the
  // panel is portaled to <body> and fixed-positioned under the bell instead of
  // being absolutely positioned inside it — otherwise it gets clipped and drawn
  // beneath the page content.
  React.useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) setAnchor({ top: rect.bottom + 8, left: rect.left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.data ?? []);
      setUnread(json.unread ?? 0);
    } catch {
      // Transient network error — the next poll retries.
    }
  }, []);

  React.useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function markRead(ids?: string[]) {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (!ids || ids.includes(n.id)) && !n.read_at ? { ...n, read_at: now } : n));
    setUnread((prev) => (ids ? Math.max(0, prev - items.filter((n) => ids.includes(n.id) && !n.read_at).length) : 0));
    await fetch("/api/admin/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    }).catch(() => {});
  }

  function handleClick(n: AdminNotification) {
    if (!n.read_at) markRead([n.id]);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        aria-label={unread ? `Notificaciones (${unread} sin leer)` : "Notificaciones"}
        aria-expanded={open}
        className="relative p-2 text-parchment-dark hover:text-brass-light transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-crimson text-white font-label text-[10px] leading-[18px] text-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && anchor && createPortal(
        <div
          ref={panelRef}
          style={{ top: anchor.top, left: anchor.left }}
          className="fixed w-80 max-h-[70vh] flex flex-col bg-[#1c1810] border border-brass/30 shadow-parchment-lg z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-brass/20">
            <span className="font-label text-xs uppercase tracking-wide text-brass-light">Notificaciones</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead()}
                className="font-body text-xs text-parchment-dark hover:text-brass-light underline"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          <ul className="overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-6 text-center font-body text-sm text-parchment-dark">
                No tenés notificaciones.
              </li>
            )}
            {items.map((n) => {
              const Icon = n.type === "task_comment" ? MessageSquare : UserPlus;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={cn(
                      "w-full flex gap-3 px-4 py-3 text-left border-b border-brass/10 transition-colors hover:bg-brass/5",
                      !n.read_at && "bg-brass/10",
                    )}
                  >
                    <Icon size={15} className={cn("mt-0.5 shrink-0", n.read_at ? "text-parchment-dark" : "text-brass-bright")} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block font-body text-sm", n.read_at ? "text-parchment-dark" : "text-parchment")}>
                        {n.title}
                      </span>
                      {n.body && (
                        <span className="block font-body text-xs text-parchment-dark truncate">{n.body}</span>
                      )}
                      <span className="block font-body text-2xs text-parchment-dark/70 mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                      </span>
                    </span>
                    {!n.read_at && <span className="mt-1.5 w-2 h-2 rounded-full bg-brass-bright shrink-0" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
