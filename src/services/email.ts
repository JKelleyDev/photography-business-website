import { Resend } from 'resend';
import { config } from '../config';

function getClient(): Resend | null {
  if (!config.RESEND_API_KEY) return null;
  return new Resend(config.RESEND_API_KEY);
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const client = getClient();
  if (!client) {
    console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
    return true;
  }
  const { error } = await client.emails.send({
    from: `MAD Photography <${config.FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
  if (error) {
    console.error('[EMAIL ERROR]', error);
    return false;
  }
  return true;
}

export async function sendGalleryLinkEmail(
  toEmail: string,
  name: string,
  galleryToken: string,
  projectTitle: string,
): Promise<boolean> {
  const url = `${config.FRONTEND_URL}/gallery/${galleryToken}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#111111;padding:28px 40px;">
                <p style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:1px;">MAD PHOTOGRAPHY</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;color:#111111;font-size:24px;">Your photos are ready, ${name}!</h2>
                <p style="margin:0 0 24px;color:#555555;font-size:16px;line-height:1.6;">
                  Your <strong>${projectTitle}</strong> gallery is ready to view. Click the button below to browse,
                  select, and download your photos.
                </p>
                <a href="${url}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-size:16px;font-weight:600;">
                  View Your Gallery
                </a>
                <p style="margin:32px 0 0;color:#999999;font-size:13px;line-height:1.6;">
                  Or copy this link into your browser:<br>
                  <a href="${url}" style="color:#555555;">${url}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px;border-top:1px solid #eeeeee;">
                <p style="margin:0;color:#aaaaaa;font-size:12px;">
                  You received this email because your photos were delivered by MAD Photography.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
  return sendEmail(toEmail, `Your ${projectTitle} Gallery is Ready!`, html);
}

export async function sendInvoiceEmail(
  toEmail: string,
  name: string,
  invoiceToken: string,
  projectTitle: string,
  amountDue: string,
  dueDate: string,
): Promise<boolean> {
  const url = `${config.FRONTEND_URL}/invoice/${invoiceToken}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#111111;padding:28px 40px;">
                <p style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:1px;">MAD PHOTOGRAPHY</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 8px;color:#111111;font-size:24px;">Invoice for ${projectTitle}</h2>
                <p style="margin:0 0 24px;color:#555555;font-size:16px;">Hi ${name},</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;border-radius:6px;padding:20px;margin-bottom:24px;">
                  <tr>
                    <td style="color:#555555;font-size:15px;">Amount Due</td>
                    <td align="right" style="color:#111111;font-size:22px;font-weight:700;">${amountDue}</td>
                  </tr>
                  <tr>
                    <td style="color:#555555;font-size:14px;padding-top:8px;">Due Date</td>
                    <td align="right" style="color:#555555;font-size:14px;padding-top:8px;">${dueDate}</td>
                  </tr>
                </table>
                <a href="${url}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-size:16px;font-weight:600;">
                  View & Pay Invoice
                </a>
                <p style="margin:32px 0 0;color:#999999;font-size:13px;line-height:1.6;">
                  Or copy this link into your browser:<br>
                  <a href="${url}" style="color:#555555;">${url}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px;border-top:1px solid #eeeeee;">
                <p style="margin:0;color:#aaaaaa;font-size:12px;">
                  You received this email from MAD Photography. If you have questions, reply to this email.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
  return sendEmail(toEmail, `Invoice for ${projectTitle} — ${amountDue} due ${dueDate}`, html);
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string): Promise<boolean> {
  const url = `${config.FRONTEND_URL}/reset-password/${resetToken}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#111111;padding:28px 40px;">
                <p style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:1px;">MAD PHOTOGRAPHY</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;color:#111111;font-size:24px;">Reset Your Password</h2>
                <p style="margin:0 0 24px;color:#555555;font-size:16px;line-height:1.6;">
                  Click the button below to reset your password. This link expires in 1 hour.
                </p>
                <a href="${url}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-size:16px;font-weight:600;">
                  Reset Password
                </a>
                <p style="margin:24px 0 0;color:#999999;font-size:13px;">
                  If you did not request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
  return sendEmail(toEmail, 'MAD Photography — Password Reset', html);
}

// Kept for future use when client accounts are re-enabled
export async function sendInviteEmail(toEmail: string, name: string, inviteToken: string): Promise<boolean> {
  const url = `${config.FRONTEND_URL}/set-password/${inviteToken}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f9f9f9;font-family:sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#111111;padding:28px 40px;">
                <p style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:1px;">MAD PHOTOGRAPHY</p>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 16px;color:#111111;font-size:24px;">Welcome, ${name}!</h2>
                <p style="margin:0 0 24px;color:#555555;font-size:16px;line-height:1.6;">
                  Your MAD Photography account has been created. Click below to set your password and get started.
                </p>
                <a href="${url}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:6px;font-size:16px;font-weight:600;">
                  Set Your Password
                </a>
                <p style="margin:24px 0 0;color:#999999;font-size:13px;">
                  If you did not expect this email, you can safely ignore it.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
  return sendEmail(toEmail, 'Welcome to MAD Photography — Set Your Password', html);
}
