import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminNotificationEmail } from "@/lib/email";

// Admin-panel notifications (see 047_shg_admin_notifications.sql): one row
// per recipient for the sidebar bell, plus an email to each. Never throws —
// a failed notification must not fail the planner action that raised it.

export type AdminNotificationType = "task_assigned" | "task_comment";

interface NotifyParams {
  recipientIds: (string | null | undefined)[];
  /** The admin who caused it — never notified about their own action. */
  actorId: string;
  type: AdminNotificationType;
  /** Builds the title from the actor's display name. */
  title: (actorName: string) => string;
  body?: string | null;
  /** Path inside the app, e.g. /admin/planning/<epic>?task=<task>. */
  link: string;
  taskId?: string | null;
}

export async function notifyAdmins(params: NotifyParams): Promise<void> {
  const recipientIds = Array.from(new Set(params.recipientIds.filter((id): id is string => !!id)))
    .filter((id) => id !== params.actorId);
  if (recipientIds.length === 0) return;

  try {
    const admin = createAdminClient();

    const [{ data: actor }, { data: recipients }] = await Promise.all([
      admin.from("shg_admin_users").select("name").eq("id", params.actorId).maybeSingle(),
      admin.from("shg_admin_users").select("id, email, name").in("id", recipientIds).eq("is_active", true),
    ]);
    if (!recipients?.length) return;

    const title = params.title(actor?.name ?? "Alguien");

    const { error } = await admin.from("shg_admin_notifications").insert(
      recipients.map((r) => ({
        recipient_id: r.id,
        actor_id:     params.actorId,
        type:         params.type,
        title,
        body:         params.body ?? null,
        link:         params.link,
        task_id:      params.taskId ?? null,
      })),
    );
    if (error) console.error("[notifications] insert failed:", error);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await Promise.all(
      recipients.map((r) =>
        sendAdminNotificationEmail({
          email: r.email,
          name:  r.name,
          title,
          body:  params.body ?? null,
          url:   `${baseUrl}${params.link}`,
        }),
      ),
    );
  } catch (err) {
    console.error("[notifications] notifyAdmins failed:", err);
  }
}

export function taskLink(epicId: string, taskId: string): string {
  return `/admin/planning/${epicId}?task=${taskId}`;
}
