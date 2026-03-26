import sgMail from '@sendgrid/mail';
import { config } from '../config';

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!config.SENDGRID_API_KEY) {
    console.log(`[EMAIL STUB] To: ${to}, Subject: ${subject}`);
    return true;
  }
  sgMail.setApiKey(config.SENDGRID_API_KEY);
  try {
    await sgMail.send({ to, from: config.FROM_EMAIL, subject, html });
    return true;
  } catch (err) {
    console.error('[EMAIL ERROR]', err);
    return false;
  }
}

export async function sendInviteEmail(toEmail: string, name: string, inviteToken: string): Promise<boolean> {
  const url = `${config.FRONTEND_URL}/set-password/${inviteToken}`;
  const html = `
    <h2>Welcome to MAD Photography, ${name}!</h2>
    <p>Your account has been created. Click the link below to set your password:</p>
    <p><a href="${url}">Set Your Password</a></p>
    <p>If you did not expect this email, you can safely ignore it.</p>
  `;
  return sendEmail(toEmail, 'Welcome to MAD Photography - Set Your Password', html);
}

export async function sendGalleryLinkEmail(
  toEmail: string,
  name: string,
  galleryToken: string,
  projectTitle: string,
): Promise<boolean> {
  const url = `${config.FRONTEND_URL}/gallery/${galleryToken}`;
  const html = `
    <h2>Your photos are ready, ${name}!</h2>
    <p>Your <strong>${projectTitle}</strong> gallery is now available for viewing:</p>
    <p><a href="${url}">View Your Gallery</a></p>
    <p>From the gallery you can view, select, and download your photos.</p>
  `;
  return sendEmail(toEmail, `Your ${projectTitle} Gallery is Ready!`, html);
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string): Promise<boolean> {
  const url = `${config.FRONTEND_URL}/reset-password/${resetToken}`;
  const html = `
    <h2>Password Reset</h2>
    <p>Click the link below to reset your password:</p>
    <p><a href="${url}">Reset Password</a></p>
    <p>If you did not request a password reset, you can safely ignore this email.</p>
  `;
  return sendEmail(toEmail, 'MAD Photography - Password Reset', html);
}
