import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

// Enforce IPv4 in nodemailer shared module so resolveHostname only queries and returns IPv4 addresses
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const shared = require('nodemailer/lib/shared');
  if (shared && shared.networkInterfaces) {
    for (const key of Object.keys(shared.networkInterfaces)) {
      if (Array.isArray(shared.networkInterfaces[key])) {
        shared.networkInterfaces[key] = shared.networkInterfaces[key].filter(
          (i: any) => i.family === 'IPv4' || i.family === 4
        );
      }
    }
  }
} catch {}

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { OtpVerification } from '../models/OtpVerification';

// OWASP A02: Cryptographically secure pseudorandom number generator (CSPRNG)
export const generateOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

const getEmailConfig = () => {
  const appName = process.env.APP_NAME?.trim() || 'NodalConnector';
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || 'support@nodalconnector.in';
  const senderAddress =
    process.env.EMAIL_FROM_ADDRESS?.trim() ||
    process.env.GMAIL_USER?.trim() ||
    process.env.SMTP_USER?.trim() ||
    `noreply@ayushportal.in`;
  return { appName, supportEmail, senderAddress };
};

let cachedTransporter: nodemailer.Transporter | null = null;

export const resetTransporterCache = (): void => {
  cachedTransporter = null;
};

export const createTransporter = (preferPort: number = 587): nodemailer.Transporter | null => {
  const gmailUser = process.env.GMAIL_USER?.trim();
  // Strip any spaces, tabs, or hyphens often introduced when copying Google 16-character app passwords
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/[\s\-]+/g, '').trim();

  if (gmailUser && gmailPass) {
    const isSsl = preferPort === 465;
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: preferPort,
      secure: isSsl, // Port 465 is SSL, Port 587 is STARTTLS
      requireTLS: !isSsl,
      family: 4, // Explicit IPv4
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
        minVersion: 'TLSv1.2',
        servername: 'smtp.gmail.com',
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    } as any);
  } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      family: 4,
      auth: {
        user: process.env.SMTP_USER?.trim(),
        pass: process.env.SMTP_PASS?.trim(),
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    } as any);
  }

  return null;
};

export const getTransporter = (): nodemailer.Transporter | null => {
  if (!cachedTransporter) {
    cachedTransporter = createTransporter(587);
  }
  return cachedTransporter;
};

export const checkEmailConfig = async (): Promise<{
  configured: boolean;
  provider?: string;
  user?: string;
  verified?: boolean;
  error?: string;
  hint?: string;
}> => {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/[\s\-]+/g, '').trim();
  const smtpHost = process.env.SMTP_HOST?.trim();

  if (!gmailUser && !smtpHost) {
    return {
      configured: false,
      error: 'No email service configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.',
      hint: 'Please provide valid GMAIL_USER and GMAIL_APP_PASSWORD in your server environment.',
    };
  }

  if (gmailUser && !gmailPass) {
    return {
      configured: false,
      error: 'GMAIL_USER is set but GMAIL_APP_PASSWORD is missing or blank.',
    };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return {
      configured: false,
      error: 'Transporter creation failed.',
    };
  }

  const verifyWithTimeout = (t: nodemailer.Transporter, timeoutMs: number = 6000): Promise<any> => {
    return Promise.race([
      t.verify(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`SMTP connection timed out after ${timeoutMs}ms (cloud port block)`)), timeoutMs)
      ),
    ]);
  };

  try {
    await verifyWithTimeout(transporter, 6000);
    return {
      configured: true,
      provider: gmailUser ? 'Gmail SMTP (Port 587 STARTTLS, IPv4)' : 'Custom SMTP',
      user: gmailUser ? `${gmailUser.substring(0, 3)}***@${gmailUser.split('@')[1]}` : process.env.SMTP_USER,
      verified: true,
    };
  } catch (verifyErr: any) {
    resetTransporterCache();
    if (gmailUser && gmailPass) {
      try {
        const fallbackTransporter = createTransporter(465);
        if (fallbackTransporter) {
          await verifyWithTimeout(fallbackTransporter, 6000);
          cachedTransporter = fallbackTransporter;
          return {
            configured: true,
            provider: 'Gmail SMTP (Port 465 SSL Fallback, IPv4)',
            user: `${gmailUser.substring(0, 3)}***@${gmailUser.split('@')[1]}`,
            verified: true,
          };
        }
      } catch (fallbackErr: any) {
        return {
          configured: true,
          provider: 'Gmail SMTP (Cloud Host Outbound Port Filtered)',
          verified: false,
          error: `Port 587: ${verifyErr.message || verifyErr}; Port 465: ${fallbackErr.message || fallbackErr}`,
          hint: 'Cloud container platforms block outbound SMTP ports 587/465. Request Railway support to unblock outbound SMTP ports 587 and 465 for project sih26044.',
        };
      }
    }
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

  const transporter = getTransporter();

  // Require SMTP transporter
  if (!transporter) {
    console.error(
      `❌ [EMAIL CONFIG ERROR] No email service configured for ${cleanEmail}. Set GMAIL_USER+GMAIL_APP_PASSWORD.`
    );
    throw new Error(
      `Email service is currently unavailable. Please contact support at ${supportEmail}.`
    );
  }

  // 1. Store OTP in database (Instant O(1) persistence, takes ~2ms)
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

  const htmlBody = `
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
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 8px;">Hello,</p>
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
  `;

  const textBody = `Hello,\n\nYour ${appName} ${actionTitle.toLowerCase()} is: ${otp}\n\nThis one-time code is valid for 10 minutes.\nIf you did not request this verification code, please disregard this email or contact ${supportEmail}.\n\n— ${appName} Team`;

  let lastError: any = null;

  // Nodemailer SMTP dispatch (port 587 STARTTLS, then port 465 SSL fallback)
  if (transporter) {
    const mailOptions = {
      from: `"${appName}" <${senderAddress}>`,
      to: cleanEmail,
      replyTo: senderAddress,
      subject,
      text: textBody,
      html: htmlBody,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ [SMTP SUCCESS] Verification email delivered to ${cleanEmail}`);
      return {
        success: true,
        message: `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your inbox and spam folder.`,
      };
    } catch (smtpErr: any) {
      lastError = smtpErr;
      console.warn(`⚠️ [SMTP PORT 587 FAILED] ${smtpErr?.message || smtpErr} (code: ${smtpErr?.code || 'UNKNOWN'})`);
      resetTransporterCache();

      const gmailUser = process.env.GMAIL_USER?.trim();
      const gmailPass = process.env.GMAIL_APP_PASSWORD?.replace(/[\s\-]+/g, '').trim();
      if (gmailUser && gmailPass) {
        try {
          console.log(`🔄 [SMTP RETRY] Attempting port 465 SSL fallback to ${cleanEmail}...`);
          const fallbackTransporter = createTransporter(465);
          if (fallbackTransporter) {
            await fallbackTransporter.sendMail(mailOptions);
            console.log(`✅ [SMTP FALLBACK SUCCESS] Delivered via port 465 to ${cleanEmail}`);
            return {
              success: true,
              message: `A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your inbox and spam folder.`,
            };
          }
        } catch (fallbackErr: any) {
          lastError = fallbackErr;
          console.error(`❌ [SMTP PORT 465 FAILED] ${fallbackErr?.message || fallbackErr} (code: ${fallbackErr?.code || 'UNKNOWN'})`);
        }
      }
    }
  }

  // All delivery methods failed — clean up the orphaned OTP record and throw error
  await OtpVerification.deleteMany({ email: cleanEmail, purpose });
  console.error(
    `❌ [EMAIL DELIVERY FAILED] All delivery methods failed for ${cleanEmail}. Error: ${lastError?.message || lastError}`
  );

  throw new Error(
    `Failed to deliver verification email (${lastError?.message || 'Connection timeout'}). Please verify your email configuration or contact ${supportEmail}.`
  );
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

  // OWASP A02 / A07: Timing-safe comparison to prevent timing side-channel attacks
  const recordBuf = Buffer.from(record.otp);
  const inputBuf = Buffer.from(inputOtp.trim());
  const isMatch =
    recordBuf.length === inputBuf.length &&
    crypto.timingSafeEqual(recordBuf, inputBuf);

  if (!isMatch) {
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
