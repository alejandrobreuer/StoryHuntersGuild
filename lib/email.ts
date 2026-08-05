import { Resend } from "resend";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://guild.cardstash.ar";
const FROM    = "Story Hunters Guild <guild@cardstash.ar>";

function wrapHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
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

export async function sendMagicLinkEmail(email: string, token: string, purpose: "public" | "admin"): Promise<void> {
  const path = purpose === "admin" ? "/auth/verify" : "/auth/verify";
  const link = `${APP_URL}${path}?token=${encodeURIComponent(token)}`;
  const subject = purpose === "admin" ? "Tu enlace de acceso — Panel de administración" : "Tu enlace de acceso — Story Hunters Guild";

  await send(email, subject, `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#2b1d0e;">Entrá con un click</p>
    <p style="margin:0 0 24px;font-size:14px;color:#4a3520;line-height:1.6;">
      Este enlace es válido por ${purpose === "admin" ? "10" : "15"} minutos y solo puede usarse una vez.
      Si vos no lo pediste, podés ignorar este correo.
    </p>
    <a href="${link}" style="display:inline-block;background:#8b3a0f;color:#f2e8d5;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:4px;">
      Entrar →
    </a>
  `);
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
