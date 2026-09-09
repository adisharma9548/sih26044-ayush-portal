import nodemailer from 'nodemailer';
import { OtpVerification } from '../models/OtpVerification';

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getEmailConfig = () => {
  const appName = process.env.APP_NAME?.trim() || 'Ayush Portal';
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || 'support@ayushportal.in';
  const senderAddress =
    process.env.EMAIL_FROM_ADDRESS?.trim() ||
    process.env.GMAIL_USER?.trim() ||
    process.env.SMTP_USER?.trim() ||
    `noreply@ayushportal.in`;
  return { appName, supportEmail, senderAddress };
};

export const createTransporter = (): nodemailer.Transporter | null => {
  const gmailUser = process.env.GMAIL_USER?.trim();
  // Strip any spaces, tabs, or hyphens often introduced when copying Google 16-character app passwords
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/[\s\-]+/g, '').trim();

  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
  } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER?.trim(),
        pass: process.env.SMTP_PASS?.trim(),
      },
      connectionTimeout: 10000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
  }

  return null;
};

export const checkEmailConfig = async (): Promise<{
  configured: boolean;
  provider?: string;
  user?: string;
  verified?: boolean;
  error?: string;
}> => {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/[\s\-]+/g, '').trim();
  const smtpHost = process.env.SMTP_HOST?.trim();

  if (!gmailUser && !smtpHost) {
    return {
      configured: false,
      error: 'Neither GMAIL_USER/GMAIL_APP_PASSWORD nor SMTP credentials configured in environment variables.',
    };
  }

  if (gmailUser && !gmailPass) {
    return {
      configured: false,
      error: 'GMAIL_USER is set but GMAIL_APP_PASSWORD is missing or blank.',
    };
  }

  const transporter = createTransporter();
  if (!transporter) {
    return {
      configured: false,
      error: 'Transporter creation failed.',
    };
  }

  try {
    await transporter.verify();
    return {
      configured: true,
      provider: gmailUser ? 'Gmail SMTP' : 'Custom SMTP',
      user: gmailUser ? `${gmailUser.substring(0, 3)}***@${gmailUser.split('@')[1]}` : process.env.SMTP_USER,
      verified: true,
    };
  } catch (verifyErr: any) {
    return {
      configured: true,
      provider: gmailUser ? 'Gmail SMTP' : 'Custom SMTP',
      verified: false,
      error: verifyErr?.message || String(verifyErr),
    };
  }
};

export const sendOtpEmail = async (
  email: string,
  purpose: 'SIGNUP_VERIFICATION' | 'PASSWORD_RESET' = 'SIGNUP_VERIFICATION'
): Promise<{ success: boolean; message: string }> => {
  const cleanEmail = email.toLowerCase().trim();
  const otp = generateOtp();
  const { appName, supportEmail, senderAddress } = getEmailConfig();

  const transporter = createTransporter();
  if (!transporter) {
    console.error(
      `❌ [SMTP CONFIG ERROR] Cannot deliver verification email to ${cleanEmail}: Email credentials (GMAIL_USER & GMAIL_APP_PASSWORD, or SMTP_HOST/USER/PASS) are missing in the server environment.`
    );
    throw new Error(
      `Email service is currently unavailable. Please contact support at ${supportEmail}.`
    );
  }

  // 1. Store OTP in database
  await OtpVerification.deleteMany({ email: cleanEmail, purpose });
  await OtpVerification.create({
    email: cleanEmail,
    otp,
    purpose,
    attempts: 0,
  });

  const actionTitle = purpose === 'SIGNUP_VERIFICATION' ? 'Account Verification Code' : 'Password Reset Code';
  const subject =
    purpose === 'SIGNUP_VERIFICATION'
      ? `${otp} is your ${appName} verification code`
      : `${otp} is your ${appName} password reset code`;

  console.log(`\n======================================================`);
  console.log(`📬 [EMAIL OTP DISPATCH] Destination: ${cleanEmail}`);
  console.log(`🎯 Purpose: ${purpose}`);
  console.log(`⏳ Valid for 10 minutes (Stored securely in MongoDB)`);
  console.log(`======================================================\n`);

  try {
    await transporter.sendMail({
      from: `"${appName}" <${senderAddress}>`,
      to: cleanEmail,
      replyTo: senderAddress,
      subject,
      text: `Hello,\n\nYour ${appName} ${actionTitle.toLowerCase()} is: ${otp}\n\nThis one-time code is valid for 10 minutes.\nIf you did not request this verification code, please disregard this email or contact ${supportEmail}.\n\n— ${appName} Team`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background-color: #f8fafc; color: #1e293b;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background-color: #065f46; color: #ffffff; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
        ${appName.toUpperCase()}
      </div>
      <h1 style="color: #0f172a; margin-top: 16px; margin-bottom: 4px; font-size: 20px; font-weight: 700;">${actionTitle}</h1>
      <p style="font-size: 13px; color: #64748b; margin: 0;">Secure Institutional Access</p>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 8px;">
      Hello,
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">
      Use the one-time verification code below to complete your ${purpose === 'SIGNUP_VERIFICATION' ? 'registration and activate your account' : 'password reset'}:
    </p>

    <div style="background-color: #f0fdf4; border: 2px dashed #059669; border-radius: 12px; padding: 18px; text-align: center; margin: 20px 0;">
      <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #047857; display: block;">
        ${otp}
      </span>
    </div>

    <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin-top: 20px; margin-bottom: 24px;">
      This verification code expires in <strong>10 minutes</strong>. Never share this code with anyone. If you did not request this, please contact <a href="mailto:${supportEmail}" style="color: #059669;">${supportEmail}</a>.
    </p>

    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
      ${appName} · Official Verification Service
    </div>
  </div>
</body>
</html>
      `,
      headers: {
        'X-Mailer': `${appName} Verification Service`,
        'X-Priority': '1 (Highest)',
      },
    });

    console.log(`✅ [SMTP SUCCESS] Verification email delivered to ${cleanEmail}`);
  } catch (smtpErr: any) {
    console.error('❌ [SMTP ERROR] Failed to deliver email via SMTP:', {
      message: smtpErr?.message,
      code: smtpErr?.code,
      response: smtpErr?.response,
      command: smtpErr?.command,
    });
    // Delete the OTP record so user is not stuck with an undelivered code
    await OtpVerification.deleteMany({ email: cleanEmail, purpose });
    throw new Error(
      `Failed to deliver verification email. (SMTP error: ${smtpErr?.code || 'DELIVERY_FAILED'}). Please verify your email or contact ${supportEmail}.`
    );
  }

  return {
    success: true,
    message: `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your inbox and spam folder.`,
  };
};

export const verifyOtp = async (
  email: string,
  inputOtp: string,
  purpose: 'SIGNUP_VERIFICATION' | 'PASSWORD_RESET' = 'SIGNUP_VERIFICATION',
  consumeOnSuccess: boolean = true
): Promise<boolean> => {
  const record = await OtpVerification.findOne({
    email: email.toLowerCase(),
    purpose,
  });

  if (!record) {
    return false;
  }

  if (record.attempts >= 5) {
    await OtpVerification.deleteOne({ _id: record._id });
    throw new Error('Too many invalid attempts. Please request a new OTP.');
  }

  if (record.otp !== inputOtp.trim()) {
    record.attempts += 1;
    await record.save();
    return false;
  }

  if (consumeOnSuccess) {
    // OTP is correct -> delete so it cannot be re-used
    await OtpVerification.deleteOne({ _id: record._id });
  }
  return true;
};

export const consumeOtp = async (
  email: string,
  purpose: 'SIGNUP_VERIFICATION' | 'PASSWORD_RESET' = 'SIGNUP_VERIFICATION'
): Promise<void> => {
  await OtpVerification.deleteMany({ email: email.toLowerCase().trim(), purpose });
};
