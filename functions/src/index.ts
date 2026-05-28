import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { Resend } from "resend";
import { logger } from "firebase-functions";

// ─────────────────────────────────────────────
// Initialize Firebase Admin SDK
// ─────────────────────────────────────────────
initializeApp();
const db = getFirestore();

// ─────────────────────────────────────────────
// Secrets & Config
// ─────────────────────────────────────────────
const resendApiKey = defineSecret("RESEND_API_KEY");

// ─────────────────────────────────────────────
// Types (mirrored from client-side types.ts)
// ─────────────────────────────────────────────
interface Task {
  id: string;
  text: string;
  completed: boolean;
  missedDays?: number;
  failedYesterday?: boolean;
  shortcut?: string;
  notes?: string;
}

// ─────────────────────────────────────────────
// Email HTML Builder
// ─────────────────────────────────────────────
function buildEmailHtml(task: Task, magicLink: string): string {
  const emoji = extractEmoji(task.text);
  const missedDays = task.missedDays || 0;
  const urgencyColor = missedDays >= 7 ? "#ff4757" : missedDays >= 3 ? "#ffa502" : "#2ed573";
  const urgencyLabel = missedDays >= 7 ? "🔴 CRÍTICA" : missedDays >= 3 ? "🟠 ARRASTRADA" : "🟡 PENDIENTE";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>El Reino — Recordatorio Diario</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 50%,#16213e 100%);">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="max-width:480px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="font-size:14px;letter-spacing:3px;color:#ffffff60;text-transform:uppercase;">El Reino</div>
            </td>
          </tr>

          <!-- Emoji Hero -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="font-size:64px;line-height:1;">${emoji}</div>
            </td>
          </tr>

          <!-- Urgency Badge -->
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <span style="display:inline-block;background:${urgencyColor}20;color:${urgencyColor};font-size:12px;font-weight:700;letter-spacing:1.5px;padding:6px 16px;border-radius:20px;border:1px solid ${urgencyColor}40;">
                ${urgencyLabel} · ${missedDays} DÍA${missedDays !== 1 ? "S" : ""} ARRASTRADO${missedDays !== 1 ? "S" : ""}
              </span>
            </td>
          </tr>

          <!-- Task Name -->
          <tr>
            <td align="center" style="padding-bottom:8px;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                ${task.text}
              </div>
            </td>
          </tr>

          <!-- Subtitle -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="font-size:14px;color:#ffffff80;line-height:1.5;">
                Esta es tu tarea más arrastrada. Un clic para completarla.
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding-bottom:40px;">
              <a href="${magicLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:12px;letter-spacing:0.5px;box-shadow:0 4px 24px rgba(102,126,234,0.4);">
                ✅ Completar Tarea
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding-bottom:24px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#ffffff15,transparent);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center">
              <div style="font-size:12px;color:#ffffff30;line-height:1.6;">
                El Reino · Recordatorio automático diario<br>
                <span style="font-size:11px;">Enviado a las 07:00 · Zona horaria Europa/Madrid</span>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function extractEmoji(text: string): string {
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  const match = text.match(emojiRegex);
  return match ? match[0] : "📋";
}

// ─────────────────────────────────────────────
// Core Logic (shared by scheduled + test)
// ─────────────────────────────────────────────
async function sendHunoReminder(): Promise<string> {
  const userUid = process.env.USER_UID;
  const userEmail = process.env.USER_EMAIL;
  const appDomain = process.env.APP_DOMAIN;

  if (!userUid || !userEmail || !appDomain) {
    const msg = `Missing env vars — UID: ${userUid ? "set" : "MISSING"}, EMAIL: ${userEmail ? "set" : "MISSING"}, DOMAIN: ${appDomain ? "set" : "MISSING"}`;
    logger.error(msg);
    return `❌ ${msg}`;
  }

  const apiKey = resendApiKey.value();
  if (!apiKey) {
    const msg = "Missing secret: RESEND_API_KEY";
    logger.error(msg);
    return `❌ ${msg}`;
  }

  const hunosDocRef = db.doc(`users/${userUid}/habits/hunos`);
  const hunosSnap = await hunosDocRef.get();

  if (!hunosSnap.exists) {
    const msg = `No hunos document found for user ${userUid}`;
    logger.warn(msg);
    return `❌ ${msg}`;
  }

  const items: Task[] = hunosSnap.data()?.items || [];

  if (items.length === 0) {
    return "ℹ️ Hunos list is empty. No email sent.";
  }

  const missedTasks = items.filter(
    (t) => !t.completed && (t.missedDays ?? 0) > 0
  );

  if (missedTasks.length === 0) {
    return "✅ No missed tasks found. Great job! No email sent.";
  }

  const criticalTask = missedTasks.reduce((worst, current) =>
    (current.missedDays ?? 0) > (worst.missedDays ?? 0) ? current : worst
  );

  logger.info(
    `Critical task selected: "${criticalTask.text}" (ID: ${criticalTask.id}, missedDays: ${criticalTask.missedDays})`
  );

  const magicLink = `${appDomain}/?magicTask=${encodeURIComponent(criticalTask.id)}`;
  const resend = new Resend(apiKey);
  const html = buildEmailHtml(criticalTask, magicLink);

  const { data, error } = await resend.emails.send({
    from: "El Reino <onboarding@resend.dev>",
    to: [userEmail],
    subject: `⚔️ ${criticalTask.text} — ${criticalTask.missedDays} día${(criticalTask.missedDays ?? 0) !== 1 ? "s" : ""} arrastrado${(criticalTask.missedDays ?? 0) !== 1 ? "s" : ""}`,
    html: html,
  });

  if (error) {
    logger.error("Resend API error:", error);
    return `❌ Resend error: ${JSON.stringify(error)}`;
  }

  const msg = `✅ Email sent! Task: "${criticalTask.text}" (${criticalTask.missedDays} days). Resend ID: ${data?.id}`;
  logger.info(msg);
  return msg;
}

// ─────────────────────────────────────────────
// Scheduled Cloud Function — Daily at 07:00 AM
// ─────────────────────────────────────────────
export const dailyHunoReminder = onSchedule(
  {
    schedule: "0 7 * * *",
    timeZone: "Europe/Madrid",
    secrets: [resendApiKey],
    region: "europe-west1",
  },
  async () => {
    const result = await sendHunoReminder();
    logger.info(result);
  }
);

// ─────────────────────────────────────────────
// HTTP Test Endpoint (trigger manually to test)
// DELETE THIS after confirming it works!
// ─────────────────────────────────────────────
export const testHunoReminder = onRequest(
  {
    secrets: [resendApiKey],
    region: "europe-west1",
  },
  async (req, res) => {
    const result = await sendHunoReminder();
    res.status(200).send(result);
  }
);
