import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { SkillProfile } from '../models/SkillProfile';
import { Portfolio } from '../models/Portfolio';
import { OtpVerification } from '../models/OtpVerification';
import { sendOtpEmail, verifyOtp, consumeOtp } from '../services/emailService';
import { AuthRequest, getJwtSecret } from '../middleware/auth';
import { recordAuditLog } from '../services/auditService';

const generateToken = (userId: string, role: string): string => {
  const secret = getJwtSecret();
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
  };
  return jwt.sign({ id: userId, role }, secret, options);
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, role: requestedRole } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Valid email and password strings are required' } });
    }

    if (!requestedRole || typeof requestedRole !== 'string') {
      return res.status(400).json({ error: { code: 'ROLE_REQUIRED', message: 'Login section role is required' } });
    }

    const allowedRoles = ['student', 'jobseeker', 'industry', 'academician', 'admin'];
    if (!allowedRoles.includes(requestedRole)) {
      return res.status(400).json({ error: { code: 'INVALID_ROLE', message: 'Invalid login section specified' } });
    }

    const cleanId = email.toLowerCase().trim();
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@nodalconnector.in').toLowerCase().trim();
    let query: any = { email: cleanId };
    if (cleanId === 'admin' || cleanId === configuredAdminEmail) {
      query = { $or: [{ email: 'admin' }, { email: configuredAdminEmail }, { role: 'admin' }] };
    }

    const user: any = await User.findOne(query).select('+password');

    if (!user) {
      await recordAuditLog({
        req,
        userEmail: email,
        action: 'LOGIN_FAILURE',
        entity: 'User',
        status: 'FAILURE',
        details: { reason: 'User not found' },
      });
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await recordAuditLog({
        req,
        userId: user._id.toString(),
        userEmail: user.email,
        userRole: user.role,
        action: 'LOGIN_FAILURE',
        entity: 'User',
        status: 'FAILURE',
        details: { reason: 'Incorrect password' },
      });
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    // Account verification / status validation
    if (user.verified === false) {
      await recordAuditLog({
        req,
        userId: user._id.toString(),
        userEmail: user.email,
        userRole: user.role,
        action: 'LOGIN_FAILURE',
        entity: 'User',
        status: 'FAILURE',
        details: { reason: 'Account pending verification' },
      });
      return res.status(403).json({ error: { code: 'ACCOUNT_PENDING_APPROVAL', message: 'Your account is pending verification or approval.' } });
    }

    // STRICT ROLE VERIFICATION: The user's actual database role MUST match the selected login section
    if (user.role !== requestedRole) {
      await recordAuditLog({
        req,
        userId: user._id.toString(),
        userEmail: user.email,
        userRole: user.role,
        action: 'LOGIN_FAILURE',
        entity: 'User',
        status: 'FAILURE',
        details: { reason: `Role mismatch: actual role '${user.role}' does not match login section '${requestedRole}'` },
      });
      return res.status(401).json({
        error: {
          code: 'ROLE_MISMATCH',
          message: 'These credentials do not belong to this login type.',
        },
      });
    }

    user.loginCount = (user.loginCount || 0) + 1;
    user.lastLoginAt = new Date();
    await user.save();

    await recordAuditLog({
      req,
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      status: 'SUCCESS',
    });

    const token = generateToken(user._id.toString(), user.role);

    res.json({
      data: {
        user: user.toSafeObject(),
        token,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }
    res.json({
      data: {
        user: req.user.toSafeObject(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const sendRegistrationOtp = async (req: Request, res: Response) => {
  try {
    const { email, role, companyName, facultyId } = req.body;
    if (!email) {
      return res.status(400).json({ error: { code: 'EMAIL_REQUIRED', message: 'Email address is required' } });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Student & Academician institutional email validation
    if (role === 'student' || role === 'academician') {
      const isEdu = cleanEmail.endsWith('.edu.in') || cleanEmail.endsWith('.ac.in');
      if (!isEdu) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DOMAIN',
            message: `${role === 'student' ? 'Students' : 'Academicians'} must register with an official university email ending in .edu.in or .ac.in. If you are a general candidate or graduate, please register via the "Job Seeker" tab.`,
          },
        });
      }

      if (role === 'academician' && (!facultyId || facultyId.trim() === '')) {
        return res.status(400).json({
          error: {
            code: 'FACULTY_ID_REQUIRED',
            message: 'University Faculty ID / Registration number is mandatory for academicians.',
          },
        });
      }
    }

    // 2. Job Seeker (Allows any valid email address, e.g. @gmail.com, @yahoo.com)
    if (role === 'jobseeker') {
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_EMAIL',
            message: 'Please enter a valid email address to receive your verification code.',
          },
        });
      }
    }

    // 3. Industry corporate work email and domain matching
    if (role === 'industry') {
      const consumerDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'rediffmail.com', 'proton.me'];
      const domain = cleanEmail.split('@')[1] || '';
      if (consumerDomains.includes(domain)) {
        return res.status(400).json({
          error: {
            code: 'CORPORATE_EMAIL_REQUIRED',
            message: 'Industry recruiters must register using their official corporate work email. Consumer emails (@gmail.com, etc.) are not permitted.',
          },
        });
      }

      if (companyName) {
        const compClean = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const domClean = domain.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const supportEmail = process.env.SUPPORT_EMAIL?.trim() || 'support@ayushportal.in';
        if (!domClean.includes(compClean) && !compClean.includes(domClean)) {
          return res.status(400).json({
            error: {
              code: 'COMPANY_DOMAIN_MISMATCH',
              message: `The company name "${companyName}" does not match your corporate email domain "@${domain}". Please check your company name, use your official company work email, or contact ${supportEmail}.`,
            },
          });
        }
      }
    }

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ error: { code: 'USER_EXISTS', message: 'An account with this email address already exists' } });
    }

    const result = await sendOtpEmail(cleanEmail, 'SIGNUP_VERIFICATION');
    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'OTP_ERROR', message: err.message } });
  }
};

export const resolveDomainFromUserContext = (params: {
  ayushDomain?: string;
  academicField?: string;
  degree?: string;
  specialization?: string;
  department?: string;
  industry?: string;
}): string => {
  if (params.ayushDomain && params.ayushDomain.trim()) {
    return params.ayushDomain.trim();
  }
  if (params.academicField && params.academicField.trim()) {
    return params.academicField.trim();
  }

  const deg = (params.degree || '').toLowerCase();
  const spec = (params.specialization || '').toLowerCase();
  const dept = (params.department || '').toLowerCase();
  const combined = `${deg} ${spec} ${dept}`;

  if (combined.includes('ayur') || combined.includes('bams')) return 'Ayurveda';
  if (combined.includes('yoga') || combined.includes('naturopath') || combined.includes('bnys')) return 'Yoga & Naturopathy';
  if (combined.includes('unani') || combined.includes('bums')) return 'Unani';
  if (combined.includes('siddha') || combined.includes('bsms')) return 'Siddha';
  if (combined.includes('homeo') || combined.includes('homoeo') || combined.includes('bhms')) return 'Homoeopathy';
  if (combined.includes('pharm') || combined.includes('b.pharm') || combined.includes('m.pharm')) return 'Pharmacy & Pharmaceutical Sciences';
  if (combined.includes('mbbs') || combined.includes('bds') || combined.includes('nurs') || combined.includes('medic')) return 'Medical & Health Sciences';
  if (combined.includes('tech') || combined.includes('eng') || combined.includes('b.e.') || combined.includes('m.e.')) return 'Engineering & Technology';
  if (combined.includes('comput') || combined.includes('bca') || combined.includes('mca') || combined.includes('data') || combined.includes('ai') || combined.includes('it')) return 'Computer Science & Information Technology';
  if (combined.includes('manage') || combined.includes('mba') || combined.includes('bba') || combined.includes('business')) return 'Management & Business Studies';
  if (combined.includes('biotech') || combined.includes('bioinfo')) return 'Biotechnology & Bioinformatics';
  if (combined.includes('scien') || combined.includes('b.sc') || combined.includes('m.sc')) return 'Applied Sciences';

  if (params.department && params.department.trim()) return params.department.trim();
  if (params.specialization && params.specialization.trim()) return params.specialization.trim();
  if (params.industry && params.industry.trim()) return params.industry.trim();
  if (params.degree && params.degree.trim()) return params.degree.trim();

  return 'General & Interdisciplinary Studies';
};

export const signup = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      role,
      institution,
      degree,
      academicField,
      specialization,
      department,
      designation,
      industry,
      graduationYear,
      ayushDomain,
      facultyId,
      companyName,
      otp,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Name, email, and password are required' } });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long.' } });
    }

    // OWASP A01 / API3: Prevent privilege escalation / mass assignment to admin
    if (role === 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Administrator accounts cannot be registered publicly.' } });
    }

    // 1. Student & Academician institutional email check (.edu.in / .ac.in)
    if (role === 'student' || role === 'academician') {
      const isEdu = cleanEmail.endsWith('.edu.in') || cleanEmail.endsWith('.ac.in');
      if (!isEdu) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DOMAIN',
            message: `${role === 'student' ? 'Students' : 'Academicians'} must register with an official university email ending in .edu.in or .ac.in. If you are a general candidate, please register under Job Seeker.`,
          },
        });
      }

      if (role === 'academician' && (!facultyId || facultyId.trim() === '')) {
        return res.status(400).json({
          error: {
            code: 'FACULTY_ID_REQUIRED',
            message: 'University Faculty ID / Registration number is mandatory for academicians.',
          },
        });
      }
    }

    // 2. Job Seeker (Any email allowed)
    if (role === 'jobseeker') {
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return res.status(400).json({
          error: { code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' },
        });
      }
    }

    // 3. Industry corporate work email and domain matching
    if (role === 'industry') {
      const consumerDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'rediffmail.com', 'proton.me'];
      const domain = cleanEmail.split('@')[1] || '';
      if (consumerDomains.includes(domain)) {
        return res.status(400).json({
          error: {
            code: 'CORPORATE_EMAIL_REQUIRED',
            message: 'Industry recruiters must register using their official corporate work email. Consumer emails (@gmail.com, etc.) are not permitted.',
          },
        });
      }

      const activeCompanyName = companyName || institution;
      if (activeCompanyName) {
        const compClean = activeCompanyName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const domClean = domain.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const supportEmail = process.env.SUPPORT_EMAIL?.trim() || 'support@ayushportal.in';
        if (!domClean.includes(compClean) && !compClean.includes(domClean)) {
          return res.status(400).json({
            error: {
              code: 'COMPANY_DOMAIN_MISMATCH',
              message: `The company name "${activeCompanyName}" does not match your corporate email domain "@${domain}". Please check your company name, use your official company work email, or contact ${supportEmail}.`,
            },
          });
        }
      }
    }

    // 4. Check if user already exists BEFORE verifying/consuming OTP
    const existing: any = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ error: { code: 'USER_EXISTS', message: 'An account with this email address already exists' } });
    }

    // 5. Verify OTP (do not delete yet so accidental errors don't invalidate user's code)
    if (!otp) {
      return res.status(400).json({
        error: { code: 'OTP_REQUIRED', message: 'Verification OTP is required to activate your account.' },
      });
    }

    const isOtpValid = await verifyOtp(cleanEmail, otp.trim(), 'SIGNUP_VERIFICATION', false);
    if (!isOtpValid) {
      return res.status(400).json({
        error: { code: 'INVALID_OTP', message: 'Invalid or expired 6-digit verification code. Please check your email.' },
      });
    }

    const allowedRoles = ['student', 'jobseeker', 'industry', 'academician'];
    const effectiveRole = allowedRoles.includes(role) ? role : 'student';

    const resolvedDomain = resolveDomainFromUserContext({
      ayushDomain,
      academicField,
      degree,
      specialization,
      department,
      industry,
    });

    const user: any = new User({
      name: name.trim(),
      email: cleanEmail,
      password: password,
      role: effectiveRole,
      institution: institution || companyName,
      degree: degree || '',
      academicField: academicField || '',
      specialization: specialization || '',
      department,
      designation,
      industry,
      graduationYear: graduationYear ? Number(graduationYear) : undefined,
      ayushDomain: resolvedDomain,
      facultyId: facultyId?.trim(),
      loginCount: 1,
      lastLoginAt: new Date(),
      isEmailVerified: true,
      verified: true,
    });

    await user.save();

    // Consume the OTP only after user successfully saved to prevent code loss on validation errors
    await consumeOtp(cleanEmail, 'SIGNUP_VERIFICATION');

    // Auto-create empty initial skill profile for student or job seeker
    if (user.role === 'student' || user.role === 'jobseeker') {
      await SkillProfile.create({
        userId: user._id.toString(),
        degree: user.degree || '',
        overallScore: 0,
        rankPercentile: 0,
        skills: [],
        gapAnalysis: [],
        categories: [],
      });

      await Portfolio.create({
        userId: user._id.toString(),
        certificates: [],
        projects: [],
      });
    }

    const token = generateToken(user._id.toString(), user.role);

    await recordAuditLog({
      req,
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      action: 'USER_REGISTER',
      entity: 'User',
      status: 'SUCCESS',
      details: { role: user.role, institution: user.institution, degree: user.degree },
    });

    res.status(201).json({
      data: {
        user: user.toSafeObject(),
        token,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Valid email is required' } });
    }
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    if (user) {
      try {
        await sendOtpEmail(cleanEmail, 'PASSWORD_RESET');
      } catch (emailErr: any) {
        console.warn('[forgotPassword] Non-fatal email delivery warning:', emailErr?.message || emailErr);
      }
    }

    // Always return generic success message to prevent user enumeration (OWASP A07:2025)
    res.json({
      data: {
        success: true,
        message: `If an account with ${cleanEmail} exists, a password reset verification code has been dispatched to that email address.`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to process password reset' } });
  }
};

export const resetPasswordWithOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email, OTP, and new password are required' } });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 8 characters long' } });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const record = await OtpVerification.findOne({
      email: cleanEmail,
      purpose: 'PASSWORD_RESET',
    });

    if (!record) {
      return res.status(400).json({ error: { code: 'OTP_EXPIRED', message: 'Reset code expired or not requested. Please request a new one.' } });
    }

    // Compare OTP hash using timingSafeEqual
    const hashedInput = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    const storedHash = record.otpHash || crypto.createHash('sha256').update(record.otp).digest('hex');

    const inputBuf = Buffer.from(hashedInput, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');

    const isMatch =
      inputBuf.length === storedBuf.length &&
      crypto.timingSafeEqual(inputBuf, storedBuf);

    if (!isMatch) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= 5) {
        await OtpVerification.deleteOne({ _id: record._id });
        return res.status(400).json({ error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many incorrect attempts. Reset code invalidated.' } });
      }
      await record.save();
      return res.status(400).json({ error: { code: 'INVALID_OTP', message: `Invalid code. ${5 - record.attempts} attempts remaining.` } });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User account not found' } });
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    user.requiresPasswordReset = false;
    await user.save();
    await OtpVerification.deleteOne({ _id: record._id });

    await recordAuditLog({
      req,
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      action: 'PASSWORD_RESET',
      entity: 'User',
      status: 'SUCCESS',
      details: { method: 'OTP_VERIFICATION' },
    });

    res.json({
      data: {
        success: true,
        message: 'Password successfully reset in MongoDB. You can now sign in with your new password.',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * Verifies OTP for password reset and generates a cryptographically signed, short-lived resetToken (JWT).
 * Enforces single-use invalidation of OTP and max 5 attempts.
 */
export const verifyResetOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email and verification code are required' } });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const record = await OtpVerification.findOne({
      email: cleanEmail,
      purpose: 'PASSWORD_RESET',
    });

    if (!record) {
      return res.status(400).json({ error: { code: 'OTP_EXPIRED', message: 'Reset code expired or not requested. Please request a new code.' } });
    }

    const hashedInput = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    const storedHash = record.otpHash || crypto.createHash('sha256').update(record.otp).digest('hex');

    const inputBuf = Buffer.from(hashedInput, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');

    const isMatch =
      inputBuf.length === storedBuf.length &&
      crypto.timingSafeEqual(inputBuf, storedBuf);

    if (!isMatch) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= 5) {
        await OtpVerification.deleteOne({ _id: record._id });
        return res.status(400).json({ error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many incorrect attempts. Reset code invalidated for your security.' } });
      }
      await record.save();
      return res.status(400).json({ error: { code: 'INVALID_OTP', message: `Invalid code. ${5 - record.attempts} attempts remaining.` } });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User account not found' } });
    }

    // SINGLE USE: Invalidate OTP record immediately so it cannot be reused
    await OtpVerification.deleteOne({ _id: record._id });

    // Issue signed JWT reset token with 15-minute expiration
    const resetToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        purpose: 'PASSWORD_RESET',
      },
      getJwtSecret(),
      { expiresIn: '15m' }
    );

    res.json({
      data: {
        success: true,
        resetToken,
        message: 'Verification code confirmed. You may now set your new password.',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};

/**
 * Resets password using cryptographically verified resetToken.
 * Rejects invalid, expired, or already-used tokens.
 */
export const resetPasswordWithToken = async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword, email, otp } = req.body;

    // Backward compatibility: If email + otp + newPassword are provided instead of resetToken
    if (!resetToken && email && otp && newPassword) {
      return resetPasswordWithOtp(req, res);
    }

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Reset token and new password are required' } });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 8 characters long' } });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, getJwtSecret());
    } catch (jwtErr: any) {
      return res.status(401).json({
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'Password reset token has expired or is invalid. Please request a new verification code.',
        },
      });
    }

    if (decoded.purpose !== 'PASSWORD_RESET' || !decoded.userId) {
      return res.status(401).json({ error: { code: 'INVALID_RESET_TOKEN', message: 'Invalid reset token purpose.' } });
    }

    const user = await User.findById(decoded.userId).select('+password');
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User account not found' } });
    }

    // Invalidate if token was issued before or at the last password reset time
    if (user.passwordChangedAt && decoded.iat) {
      const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat <= changedAtSeconds) {
        return res.status(401).json({
          error: {
            code: 'TOKEN_ALREADY_USED',
            message: 'This reset token has already been used. Please request a new verification code.',
          },
        });
      }
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    user.requiresPasswordReset = false;
    await user.save();

    // Clean up any remaining OTPs
    await OtpVerification.deleteMany({ email: user.email, purpose: 'PASSWORD_RESET' });

    await recordAuditLog({
      req,
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      action: 'PASSWORD_RESET',
      entity: 'User',
      status: 'SUCCESS',
      details: { method: 'SECURE_TOKEN_RESET' },
    });

    res.json({
      data: {
        success: true,
        message: 'Password successfully updated. You can now log in with your new credentials.',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
};
