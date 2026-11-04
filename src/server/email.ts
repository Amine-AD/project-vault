import fs from 'node:fs'
import path from 'node:path'

/**
 * Transactional email through Resend (https://resend.com).
 *
 * Settings come from the environment (or a .env file in the project root):
 *  - RESEND_API_KEY  Resend API key. Without it, emails are printed to the
 *                    server console instead, which is handy in development.
 *  - EMAIL_FROM      Sender, e.g. "OneVault <security@yourdomain.com>". Must
 *                    be on a domain verified in Resend.
 *  - APP_URL         Public URL of the app, used for links in emails.
 *
 * Emails never contain vault data, master passwords or recovery keys.
 */

const envFile = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envFile)) {
  try {
    // Doesn't override variables that are already set
    process.loadEnvFile(envFile)
  } catch (err) {
    console.error('[email] Could not read .env', err)
  }
}

const APP_NAME = 'OneVault'

function config() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim() || null,
    from:
      process.env.EMAIL_FROM?.trim() || `${APP_NAME} <onboarding@resend.dev>`,
    appUrl: (process.env.APP_URL?.trim() || 'http://localhost:3000').replace(
      /\/+$/,
      '',
    ),
  }
}

/** Thrown when the email provider refuses or can't be reached. */
export class EmailDeliveryError extends Error {
  constructor() {
    super("We couldn't send the email right now. Try again in a moment.")
  }
}

interface Email {
  to: string
  subject: string
  text: string
  html: string
}

async function sendEmail(email: Email) {
  const { apiKey, from } = config()

  if (!apiKey) {
    console.info(
      [
        '',
        '──── email (RESEND_API_KEY not set, not sent) ────',
        `To:      ${email.to}`,
        `Subject: ${email.subject}`,
        '',
        email.text,
        '──────────────────────────────────────────────────',
        '',
      ].join('\n'),
    )
    return
  }

  let res: Response
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    })
  } catch (err) {
    console.error('[email] Resend request failed', err)
    throw new EmailDeliveryError()
  }

  if (!res.ok) {
    console.error(
      `[email] Resend responded ${res.status}: ${await res.text().catch(() => '')}`,
    )
    throw new EmailDeliveryError()
  }
}

/** Sends an alert, logging instead of failing: the action already happened. */
async function sendAlert(email: Email) {
  try {
    await sendEmail(email)
  } catch (err) {
    console.error('[email] Alert not delivered', err)
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Minimal, client-safe HTML layout. `body` must already be escaped. */
function layout(heading: string, body: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;">
      <tr><td style="padding:32px;">
        <p style="margin:0 0 24px;font-weight:600;font-size:15px;">${APP_NAME}</p>
        <h1 style="margin:0 0 16px;font-size:20px;line-height:28px;">${heading}</h1>
        ${body}
      </td></tr>
    </table>
  </body>
</html>`
}

const p = (text: string) =>
  `<p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#3f3f46;">${text}</p>`

const muted = (text: string) =>
  `<p style="margin:24px 0 0;font-size:12px;line-height:18px;color:#71717a;">${text}</p>`

const codeBlock = (code: string) =>
  `<p style="margin:0 0 16px;padding:16px;background:#f4f4f5;border-radius:8px;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:28px;letter-spacing:8px;font-weight:600;">${escapeHtml(code)}</p>`

const button = (href: string, label: string) =>
  `<p style="margin:0 0 16px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:10px 18px;background:#18181b;color:#ffffff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">${escapeHtml(label)}</a></p>`

/** Spaced for reading: "123 456". */
function displayCode(code: string) {
  return `${code.slice(0, 3)} ${code.slice(3)}`
}

export async function sendSignupCode(to: string, code: string) {
  const shown = displayCode(code)
  await sendEmail({
    to,
    subject: `${shown} is your ${APP_NAME} verification code`,
    text: [
      `Your ${APP_NAME} verification code is ${shown}.`,
      '',
      'Enter it to keep creating your vault. It expires in 10 minutes.',
      '',
      "If you didn't try to create a vault, you can ignore this email.",
    ].join('\n'),
    html: layout(
      'Confirm your email',
      p('Enter this code to keep creating your vault:') +
        codeBlock(shown) +
        p('It expires in 10 minutes.') +
        muted(
          "If you didn't try to create a vault, you can ignore this email.",
        ),
    ),
  })
}

/** Sent instead of a code when someone signs up with a registered email. */
export async function sendAccountExists(to: string) {
  const { appUrl } = config()
  const login = `${appUrl}/login`
  const recover = `${appUrl}/recover`
  await sendEmail({
    to,
    subject: `You already have a ${APP_NAME} vault`,
    text: [
      `Someone tried to create a ${APP_NAME} vault with this email, but you already have one.`,
      '',
      `Sign in: ${login}`,
      `Forgot your master password? ${recover}`,
      '',
      "If this wasn't you, you can ignore this email. Your vault hasn't changed.",
    ].join('\n'),
    html: layout(
      'You already have a vault',
      p(
        `Someone tried to create a ${APP_NAME} vault with this email, but you already have one.`,
      ) +
        button(login, 'Sign in') +
        p(
          `Forgot your master password? <a href="${escapeHtml(recover)}" style="color:#18181b;">Recover your vault</a>.`,
        ) +
        muted(
          "If this wasn't you, you can ignore this email. Your vault hasn't changed.",
        ),
    ),
  })
}

export async function sendRecoveryCode(to: string, code: string) {
  const shown = displayCode(code)
  await sendEmail({
    to,
    subject: `${shown} is your ${APP_NAME} recovery code`,
    text: [
      `Someone asked to recover the ${APP_NAME} vault for this email.`,
      '',
      `Your verification code is ${shown}. It expires in 10 minutes.`,
      '',
      'This code only confirms your email. To open your items you will also need your recovery key or a device you have used before.',
      '',
      "If this wasn't you, don't share the code. Your vault is still safe.",
    ].join('\n'),
    html: layout(
      'Recover your vault',
      p(
        `Someone asked to recover the ${APP_NAME} vault for this email. Enter this code to continue:`,
      ) +
        codeBlock(shown) +
        p(
          'It expires in 10 minutes. This code only confirms your email: to open your items you will also need your recovery key or a device you have used before.',
        ) +
        muted(
          "If this wasn't you, don't share the code. Without it your vault can't be recovered.",
        ),
    ),
  })
}

type SecurityEvent = 'changed' | 'recovered' | 'recoveredOnDevice' | 'reset'

const SECURITY_EVENTS: Record<
  SecurityEvent,
  { subject: string; heading: string; detail: string }
> = {
  changed: {
    subject: `Your ${APP_NAME} master password was changed`,
    heading: 'Master password changed',
    detail: 'The master password for your vault was just changed.',
  },
  recovered: {
    subject: `Your ${APP_NAME} vault was recovered`,
    heading: 'Vault recovered',
    detail:
      'Your vault was just recovered with your recovery key and has a new master password. Your old recovery key no longer works, and every other device was signed out.',
  },
  recoveredOnDevice: {
    subject: `Your ${APP_NAME} vault was recovered`,
    heading: 'Vault recovered',
    detail:
      'Your vault was just recovered on a trusted device and has a new master password. Your old recovery key no longer works, and every other device was signed out.',
  },
  reset: {
    subject: `Your ${APP_NAME} vault was reset`,
    heading: 'Vault reset',
    detail:
      'A new, empty vault was just started for your account without a recovery key, and every other device was signed out. Your old items were not deleted: they are locked with your old master password. If you remember it or find your recovery key, you can restore them from Settings.',
  },
}

export async function sendSecurityAlert(to: string, event: SecurityEvent) {
  const { subject, heading, detail } = SECURITY_EVENTS[event]
  const when = new Date().toUTCString()
  const warning =
    event === 'reset'
      ? "If this wasn't you, someone else can read your email. Secure your email account first."
      : "If this wasn't you, someone else had your master password or recovery key. Change the passwords stored in your vault and secure your email account."
  await sendAlert({
    to,
    subject,
    text: [
      detail,
      '',
      `When: ${when}`,
      '',
      "If this was you, there's nothing to do.",
      warning,
    ].join('\n'),
    html: layout(
      heading,
      p(escapeHtml(detail)) +
        p(`When: ${escapeHtml(when)}`) +
        muted(`If this was you, there's nothing to do. ${escapeHtml(warning)}`),
    ),
  })
}
