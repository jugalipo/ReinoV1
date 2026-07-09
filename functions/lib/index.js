"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testHunoReminder = exports.dailyHunoReminder = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const resend_1 = require("resend");
const firebase_functions_1 = require("firebase-functions");
// ─────────────────────────────────────────────
// Initialize Firebase Admin SDK
// ─────────────────────────────────────────────
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// ─────────────────────────────────────────────
// Secrets & Config
// ─────────────────────────────────────────────
const resendApiKey = (0, params_1.defineSecret)("RESEND_API_KEY");
// ─────────────────────────────────────────────
// Email HTML Builder
// ─────────────────────────────────────────────
function getFormattedDate() {
    const opcionesFecha = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    let fechaDeHoy = new Date().toLocaleDateString('es-ES', opcionesFecha);
    fechaDeHoy = fechaDeHoy.charAt(0).toUpperCase() + fechaDeHoy.slice(1);
    return fechaDeHoy;
}
function extractEmoji(text) {
    // Regex supporting ZWJ, variation selectors, and modifiers
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}](?:\ufe0f|\u200d|[\u{1F3FB}-\u{1F3FF}]|[\u{2600}-\u{27BF}]|\u2642|\u2640)*/gu;
    const match = text.match(emojiRegex);
    return match ? match[0] : "📋";
}
function cleanTaskText(text) {
    // 1. Remove tracking prefixes like T1, H3, etc. at the start (case-insensitive, followed by space or hyphen/dot)
    let clean = text.replace(/^[a-zA-Z]\d+\b[\s-.]*/gi, '');
    // 2. Remove all emojis, symbols, and pictographs
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}](?:\ufe0f|\u200d|[\u{1F3FB}-\u{1F3FF}]|[\u{2600}-\u{27BF}]|\u2642|\u2640)*/gu;
    clean = clean.replace(emojiRegex, '');
    // 3. Remove trailing time annotations like 20', 20m, 30 min, 1h, etc.
    clean = clean.replace(/\s*\d+\s*(?:'|’|min|mins|m|h|hr|hrs|hs|horas?)\s*$/gi, '');
    // 4. Clean up multiple spaces and trim
    clean = clean.replace(/\s+/g, ' ').trim();
    if (!clean)
        return "";
    // 5. Lowercase the first letter of the sentence
    return clean.charAt(0).toLowerCase() + clean.slice(1);
}
function buildEmailHtml(task, magicLink, appDomain) {
    const fechaDeHoy = getFormattedDate();
    // Iconografía elegante para el boletín
    const emojiLibro = "&#128214;"; // 📖
    const emojiCirculoRojo = "&#128308;"; // 🔴
    const emojiSeparador = "❖";
    let taskCardHtml = "";
    if (task) {
        const emoji = extractEmoji(task.text);
        const missedDays = task.missedDays || 0;
        const urgencyColor = missedDays >= 7 ? "#ff4757" : missedDays >= 3 ? "#ffa502" : "#2ed573";
        taskCardHtml = `
        <!-- SEPARADOR -->
        <div style="text-align: center; margin: 40px 0;">
          <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
            <tr>
              <td style="border-bottom: 1px solid #3c352a; width: 45%;"></td>
              <td style="text-align: center; color: #c5a059; font-size: 14px; width: 10%; padding: 0 10px; font-family: serif;">${emojiSeparador}</td>
              <td style="border-bottom: 1px solid #3c352a; width: 45%;"></td>
            </tr>
          </table>
        </div>

        <!-- TAREA CRÍTICA -->
        <div style="background-color: #1a1815; border: 1px solid #c5a05940; border-radius: 12px; padding: 30px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); text-align: center;">
          <h3 style="font-family: Georgia, serif; font-weight: normal; font-size: 22px; color: #ffffff; margin: 0 0 30px 0; line-height: 1.6; text-align: center;">
            Llevas <span style="font-weight: bold; color: ${urgencyColor};">${missedDays} día${missedDays !== 1 ? "s" : ""}</span> sin<br>
            <span style="font-weight: bold; color: #ffffff;">${cleanTaskText(task.text)}</span>
          </h3>

          <div style="text-align: center; margin-bottom: 5px;">
            <!-- Gran círculo con la tarea del día -->
            <a href="${magicLink}" target="_blank" 
               style="display: inline-block; width: 110px; height: 110px; border-radius: 50%; line-height: 110px; text-align: center; background-color: #1c1a17; border: 2px solid #c5a059; font-size: 54px; text-decoration: none; box-shadow: 0 6px 20px rgba(197, 160, 89, 0.3);">
               ${emoji}
            </a>

            <!-- Pequeño círculo centrado bajo el gran círculo con emoji de corona -->
            <div style="margin-top: 20px;">
              <a href="${appDomain}" target="_blank" 
                 style="display: inline-block; width: 50px; height: 50px; border-radius: 50%; line-height: 50px; text-align: center; background-color: #1c1a17; border: 1.5px solid #c5a059; font-size: 24px; text-decoration: none; box-shadow: 0 4px 10px rgba(197, 160, 89, 0.15);">
                 👑
              </a>
            </div>
          </div>
        </div>
    `;
    }
    else {
        taskCardHtml = `
        <!-- SEPARADOR -->
        <div style="text-align: center; margin: 40px 0;">
          <table cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
            <tr>
              <td style="border-bottom: 1px solid #3c352a; width: 45%;"></td>
              <td style="text-align: center; color: #c5a059; font-size: 14px; width: 10%; padding: 0 10px; font-family: serif;">${emojiSeparador}</td>
              <td style="border-bottom: 1px solid #3c352a; width: 45%;"></td>
            </tr>
          </table>
        </div>

        <!-- SIN TAREAS CRÍTICAS -->
        <div style="background-color: #121814; border: 1px solid #2ed57330; border-radius: 8px; padding: 25px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); text-align: center;">
          <p style="margin: 0 0 20px 0; font-size: 14px; color: #a7f3d0; font-family: Georgia, serif; font-style: italic; line-height: 1.6;">
            ✨ Excelente noticia, señor. No tiene ninguna tarea arrastrada pendiente en el Reino. Todo se encuentra al día.
          </p>
          <div style="text-align: center;">
            <a href="${appDomain}" target="_blank" 
               style="display: inline-block; width: 50px; height: 50px; border-radius: 50%; line-height: 50px; text-align: center; background-color: #121814; border: 1.5px solid #2ed573; font-size: 24px; text-decoration: none; box-shadow: 0 4px 10px rgba(46, 213, 115, 0.15);">
               👑
            </a>
          </div>
        </div>
    `;
    }
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>El Reino — Boletín Diario</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family: Georgia, 'Times New Roman', serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 0;">
    <tr>
      <td align="center">
        <div style="max-width: 600px; width: 100%; border: 1px solid #3c352a; border-radius: 12px; overflow: hidden; background-color: #121214; color: #ffffff; box-shadow: 0 12px 40px rgba(0,0,0,0.6); text-align: left;">
          
          <!-- CABECERA -->
          <div style="background: linear-gradient(135deg, #1e1b18 0%, #0f0e0d 100%); padding: 35px 30px; text-align: center; border-bottom: 2px solid #c5a059;">
            <h1 style="color: #c5a059; margin: 0; font-size: 26px; font-weight: normal; letter-spacing: 2px; font-family: Georgia, serif;">Buenos días tenga usted</h1>
            <p style="color: #8e8270; margin: 10px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 3px; font-family: 'Segoe UI', Arial, sans-serif;">${fechaDeHoy}</p>
          </div>

          <!-- CUERPO PRINCIPAL -->
          <div style="padding: 40px 35px; line-height: 1.8;">
            
            <!-- BOTÓN PRINCIPAL: GEMINI -->
            <div style="text-align: center; margin: 10px 0 20px 0;">
              <a href="https://gemini.google.com/gem/57fd6345e586/b8d22ffe8e46ae7d" 
                 style="background-color: #c5a059; color: #121214; padding: 16px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-family: 'Segoe UI', Arial, sans-serif; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(197, 160, 89, 0.25); text-transform: uppercase; font-size: 14px;">
                 ${emojiLibro} Su periódico, señor
              </a>
            </div>

            ${taskCardHtml}

            <!-- RECORDATORIO DEL POEMA -->
            <div style="background-color: #1e1313; padding: 25px; border-left: 4px solid #b91c1c; border-radius: 6px; margin: 30px 0 40px 0; box-shadow: inset 0 1px 3px rgba(0,0,0,0.4);">
              <p style="margin: 0; font-weight: bold; color: #fecdd3; font-size: 15px; letter-spacing: 1.5px; font-family: 'Segoe UI', Arial, sans-serif; text-transform: uppercase;">
                ${emojiCirculoRojo} No olvide su POEMA, señor
              </p>
            </div>

            <!-- FIRMA -->
            <table cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin-top: 30px;">
              <tr>
                <td style="width: 50%;"></td>
                <td style="text-align: right; font-family: Georgia, serif; font-style: italic; color: #9ca3af; font-size: 15px; line-height: 1.6;">
                  <span style="color: #c5a059; font-weight: bold; font-style: normal; font-size: 18px; letter-spacing: 0.5px; display: inline-block; margin-top: 5px;">Sebastian</span><br>
                  <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-family: 'Segoe UI', Arial, sans-serif; display: inline-block; margin-top: 2px;">Su mayordomo</span>
                </td>
              </tr>
            </table>

          </div>

          <!-- PIE DE PÁGINA -->
          <div style="background-color: #0c0c0d; padding: 25px 20px; text-align: center; border-top: 1px solid #1a1a1f;">
            <p style="margin: 0; font-size: 11px; color: #4b5563; letter-spacing: 4px; font-family: Georgia, serif; font-weight: bold; text-transform: uppercase;">
              SEMPER ITERVM RVDIS
            </p>
          </div>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
// ─────────────────────────────────────────────
// Core Logic (shared by scheduled + test)
// ─────────────────────────────────────────────
async function sendHunoReminder() {
    const userUid = process.env.USER_UID;
    const userEmail = process.env.USER_EMAIL;
    const appDomain = process.env.APP_DOMAIN;
    if (!userUid || !userEmail || !appDomain) {
        const msg = `Missing env vars — UID: ${userUid ? "set" : "MISSING"}, EMAIL: ${userEmail ? "set" : "MISSING"}, DOMAIN: ${appDomain ? "set" : "MISSING"}`;
        firebase_functions_1.logger.error(msg);
        return `❌ ${msg}`;
    }
    const apiKey = resendApiKey.value();
    if (!apiKey) {
        const msg = "Missing secret: RESEND_API_KEY";
        firebase_functions_1.logger.error(msg);
        return `❌ ${msg}`;
    }
    const hunosDocRef = db.doc(`users/${userUid}/habits/hunos`);
    const hunosSnap = await hunosDocRef.get();
    if (!hunosSnap.exists) {
        const msg = `No hunos document found for user ${userUid}`;
        firebase_functions_1.logger.warn(msg);
        return `❌ ${msg}`;
    }
    const items = hunosSnap.data()?.items || [];
    const missedTasks = items.filter((t) => !t.completed && (t.missedDays ?? 0) > 0);
    const criticalTask = missedTasks.length > 0
        ? missedTasks.reduce((worst, current) => (current.missedDays ?? 0) > (worst.missedDays ?? 0) ? current : worst)
        : null;
    if (criticalTask) {
        firebase_functions_1.logger.info(`Critical task selected: "${criticalTask.text}" (ID: ${criticalTask.id}, missedDays: ${criticalTask.missedDays})`);
    }
    else {
        firebase_functions_1.logger.info("No critical task found today. Sending generic newsletter.");
    }
    const magicLink = criticalTask
        ? `${appDomain}/?magicTask=${encodeURIComponent(criticalTask.id)}`
        : appDomain;
    const resend = new resend_1.Resend(apiKey);
    const html = buildEmailHtml(criticalTask, magicLink, appDomain);
    const subject = criticalTask
        ? `⚔️ Llevas ${criticalTask.missedDays} día${criticalTask.missedDays !== 1 ? "s" : ""} sin ${cleanTaskText(criticalTask.text)}`
        : `Boletín Diario (${getFormattedDate()})`;
    const { data, error } = await resend.emails.send({
        from: "El Reino <onboarding@resend.dev>",
        to: [userEmail],
        subject: subject,
        html: html,
    });
    if (error) {
        firebase_functions_1.logger.error("Resend API error:", error);
        return `❌ Resend error: ${JSON.stringify(error)}`;
    }
    const msg = criticalTask
        ? `✅ Email sent! Task: "${criticalTask.text}" (${criticalTask.missedDays} days). Resend ID: ${data?.id}`
        : `✅ Email sent! Newsletter without tasks. Resend ID: ${data?.id}`;
    firebase_functions_1.logger.info(msg);
    return msg;
}
// ─────────────────────────────────────────────
// Scheduled Cloud Function — Daily at 07:00 AM
// ─────────────────────────────────────────────
exports.dailyHunoReminder = (0, scheduler_1.onSchedule)({
    schedule: "0 7 * * *",
    timeZone: "Europe/Madrid",
    secrets: [resendApiKey],
    region: "europe-west1",
}, async () => {
    const result = await sendHunoReminder();
    firebase_functions_1.logger.info(result);
});
// ─────────────────────────────────────────────
// HTTP Test Endpoint (trigger manually to test)
// DELETE THIS after confirming it works!
// ─────────────────────────────────────────────
exports.testHunoReminder = (0, https_1.onRequest)({
    secrets: [resendApiKey],
    region: "europe-west1",
}, async (req, res) => {
    const result = await sendHunoReminder();
    res.status(200).send(result);
});
//# sourceMappingURL=index.js.map