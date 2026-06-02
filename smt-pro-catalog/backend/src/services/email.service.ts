import nodemailer from 'nodemailer';
import logger from '../shared/utils/logger.util';

const getTransporter = () => {
  const host = process.env['SMTP_HOST'];
  const port = parseInt(process.env['SMTP_PORT'] ?? '587');
  const user = process.env['SMTP_USER'];
  const pass = process.env['SMTP_PASS'];

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

interface EmailOptions {
  to:      string | string[];
  subject: string;
  html:    string;
}

export const sendEmail = async ({ to, subject, html }: EmailOptions): Promise<boolean> => {
  const transporter = getTransporter();
  if (!transporter) {
    logger.info('[email] SMTP not configured — email skipped');
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"DaralIraq" <${process.env['SMTP_USER']}>`,
      to:   Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    logger.info(`[email] Sent: ${subject}`);
    return true;
  } catch (err) {
    logger.warn('[email] Failed to send: ' + (err as Error).message);
    return false;
  }
};

export const sendLowStockAlert = async (
  products: Array<{ name: string; sku: string | null; quantity: number; lowStockAlert: number }>,
  adminEmails: string[],
): Promise<void> => {
  if (!adminEmails.length || !products.length) return;

  const rows = products.map((p) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #1e293b;">${p.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#94a3b8;">${p.sku ?? '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:${p.quantity === 0 ? '#f87171' : '#fbbf24'};font-weight:bold;">
        ${p.quantity === 0 ? 'Out of stock' : `${p.quantity} left`}
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#64748b;">${p.lowStockAlert}</td>
    </tr>`).join('');

  const html = `
    <div style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;max-width:600px;margin:auto;">
      <h2 style="color:#f59e0b;margin:0 0 8px;">⚠️ Low Stock Alert</h2>
      <p style="color:#94a3b8;margin:0 0 24px;">The following products need restocking:</p>
      <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#0f172a;">
            <th style="padding:10px 12px;text-align:left;color:#94a3b8;font-size:12px;text-transform:uppercase;">Product</th>
            <th style="padding:10px 12px;text-align:left;color:#94a3b8;font-size:12px;text-transform:uppercase;">SKU</th>
            <th style="padding:10px 12px;text-align:left;color:#94a3b8;font-size:12px;text-transform:uppercase;">Stock</th>
            <th style="padding:10px 12px;text-align:left;color:#94a3b8;font-size:12px;text-transform:uppercase;">Threshold</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#64748b;font-size:12px;margin:24px 0 0;">
        Sent by DaralIraq Enterprise — ${new Date().toLocaleString()}
      </p>
    </div>`;

  await sendEmail({ to: adminEmails, subject: `⚠️ Low Stock Alert — ${products.length} product${products.length !== 1 ? 's' : ''} need restocking`, html });
};
