import { Resend } from "resend";

const FROM = "Story Hunters Guild <guild@cardstash.ar>";

function wrapHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#3d3830;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#3d3830;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td style="background:#2b1d0e;border-top:3px solid #b8860b;padding:20px 32px;">
              <span style="font-size:18px;font-weight:700;color:#d4a843;letter-spacing:0.05em;">STORY HUNTERS GUILD</span>
            </td>
          </tr>
          <tr>
            <td style="background:#f2e8d5;padding:32px;border-left:1px solid #c9b07a;border-right:1px solid #c9b07a;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#e0cfa8;border:1px solid #c9b07a;border-top:none;padding:16px 32px;">
              <p style="margin:0;font-size:12px;color:#7a7065;line-height:1.5;">
                Story Hunters Guild — creado por Story Hunters.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function send(to: string, subject: string, bodyHtml: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email] RESEND_API_KEY not set — skipping send to ${to}: ${subject}`);
    return;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: FROM, to, subject, html: wrapHtml(subject, bodyHtml) });
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}

export async function sendBookingConfirmationEmail(params: {
  email: string; name: string; eventTitle: string; eventDate: string; guestCount: number; cost: string;
}): Promise<void> {
  await send(params.email, `Reserva recibida — ${params.eventTitle}`, `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#2b1d0e;">¡Recibimos tu reserva!</p>
    <p style="margin:0 0 16px;font-size:14px;color:#4a3520;line-height:1.6;">
      Hola ${params.name}, tu reserva para <strong>${params.eventTitle}</strong> (${params.eventDate})
      está pendiente de confirmación. Vamos a revisar tu comprobante y te avisamos por este mismo medio.
    </p>
    <p style="margin:0;font-size:14px;color:#4a3520;">
      Personas: ${params.guestCount}<br/>
      Total: ${params.cost}
    </p>
  `);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Planner notifications (see lib/notifications.ts). title/body carry
 * free-text task titles and comments typed by staff, so they're escaped. */
export async function sendAdminNotificationEmail(params: {
  email: string; name: string; title: string; body: string | null; url: string;
}): Promise<void> {
  await send(params.email, params.title, `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#2b1d0e;">${escapeHtml(params.title)}</p>
    ${params.body ? `
    <p style="margin:0 0 16px;font-size:14px;color:#4a3520;line-height:1.6;white-space:pre-wrap;border-left:3px solid #c9b07a;padding-left:12px;">${escapeHtml(params.body)}</p>
    ` : ""}
    <p style="margin:0;">
      <a href="${params.url}" style="display:inline-block;background:#2b1d0e;color:#d4a843;padding:10px 20px;text-decoration:none;font-size:14px;font-weight:600;">
        Ver en el panel
      </a>
    </p>
  `);
}

export async function sendPasswordResetEmail(params: {
  email: string; name: string | null; resetUrl: string; expiresInMinutes: number;
}): Promise<void> {
  await send(params.email, "Restablecé tu contraseña", `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#2b1d0e;">Restablecer contraseña</p>
    <p style="margin:0 0 16px;font-size:14px;color:#4a3520;line-height:1.6;">
      Hola${params.name ? ` ${params.name}` : ""}, recibimos un pedido para restablecer la contraseña de tu cuenta.
      Hacé clic en el botón para elegir una nueva. El enlace vence en ${params.expiresInMinutes} minutos y sirve una sola vez.
    </p>
    <p style="margin:0 0 16px;">
      <a href="${params.resetUrl}" style="display:inline-block;background:#2b1d0e;color:#d4a843;padding:10px 20px;text-decoration:none;font-size:14px;font-weight:600;">
        Elegir nueva contraseña
      </a>
    </p>
    <p style="margin:0;font-size:12px;color:#7a7065;line-height:1.5;">
      Si no lo pediste vos, ignorá este email: tu contraseña no cambia.
    </p>
  `);
}

export async function sendBookingStatusEmail(params: {
  email: string; name: string; eventTitle: string; status: "approved" | "rejected";
}): Promise<void> {
  const isApproved = params.status === "approved";
  await send(
    params.email,
    isApproved ? `¡Confirmada! — ${params.eventTitle}` : `Sobre tu reserva — ${params.eventTitle}`,
    `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#2b1d0e;">
      ${isApproved ? "¡Tu lugar está confirmado!" : "No pudimos confirmar tu reserva"}
    </p>
    <p style="margin:0;font-size:14px;color:#4a3520;line-height:1.6;">
      Hola ${params.name}, ${isApproved
        ? `tu reserva para <strong>${params.eventTitle}</strong> fue confirmada. ¡Te esperamos!`
        : `tu reserva para <strong>${params.eventTitle}</strong> no pudo ser confirmada. Si creés que es un error, escribinos.`}
    </p>
  `
  );
}
