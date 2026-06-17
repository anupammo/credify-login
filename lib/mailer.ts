import nodemailer, { type Transporter } from 'nodemailer';

// SMTP transport built lazily from environment variables:
//   SMTP_HOST  e.g. smtp.gmail.com
//   SMTP_PORT  587 (STARTTLS) or 465 (SSL)
//   SMTP_USER  the full address that owns the app password
//   SMTP_PASS  app password
//   SMTP_FROM  optional "Display Name <address>" (defaults to SMTP_USER)
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured (need SMTP_HOST, SMTP_USER, SMTP_PASS)');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit SSL; 587 = STARTTLS
    auth: { user, pass },
  });
  return transporter;
}

export async function sendMail(opts: { to: string; subject: string; html: string; text: string }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  return getTransporter().sendMail({ from, ...opts });
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const subject = 'Reset your Credify password';
  const text =
    `We received a request to reset your Credify password.\n\n` +
    `Reset it here (the link expires in 30 minutes):\n${resetLink}\n\n` +
    `If you didn't request this, you can safely ignore this email.`;

  const html = `
  <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;color:#0d1f18">
    <h2 style="color:#0a3d2b;font-weight:600">Reset your password</h2>
    <p style="color:#527060;line-height:1.6">We received a request to reset your Credify password. Click the button below to choose a new one. This link expires in 30 minutes.</p>
    <p style="margin:28px 0">
      <a href="${resetLink}" style="background:#1a8a66;color:#fff;text-decoration:none;padding:12px 22px;border-radius:9px;font-weight:600;display:inline-block">Reset password</a>
    </p>
    <p style="color:#8aaa9a;font-size:13px;line-height:1.6">If the button doesn't work, paste this link into your browser:<br><span style="color:#1a8a66;word-break:break-all">${resetLink}</span></p>
    <p style="color:#8aaa9a;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
  </div>`;

  return sendMail({ to, subject, html, text });
}
