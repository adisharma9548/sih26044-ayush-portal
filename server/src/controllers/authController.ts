import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { SkillProfile } from '../models/SkillProfile';
import { Portfolio } from '../models/Portfolio';
import { OtpVerification } from '../models/OtpVerification';
import { sendOtpEmail, verifyOtp } from '../services/emailService';
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
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Valid email and password strings are required' } });
    }

    const cleanId = email.toLowerCase().trim();
    let query: any = { email: cleanId };
    if (cleanId === 'admin') {
      query = { $or: [{ email: 'admin' }, { email: 'admin@skillbridge.gov.in' }, { role: 'admin' }] };
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
        if (!domClean.includes(compClean) && !compClean.includes(domClean)) {
          return res.status(400).json({
            error: {
              code: 'COMPANY_DOMAIN_MISMATCH',
              message: `The company name "${companyName}" does not match your corporate email domain "@${domain}". Please check your company name, use your official company work email, or contact support@skillbridge.gov.in.`,
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

export const signup = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      role,
      institution,
      degree,
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
        if (!domClean.includes(compClean) && !compClean.includes(domClean)) {
          return res.status(400).json({
            error: {
              code: 'COMPANY_DOMAIN_MISMATCH',
              message: `The company name "${activeCompanyName}" does not match your corporate email domain "@${domain}". Please check your company name, use your official company work email, or contact support@skillbridge.gov.in.`,
            },
          });
        }
      }
    }

    // 4. Verify OTP
    if (!otp) {
      return res.status(400).json({
        error: { code: 'OTP_REQUIRED', message: 'Verification OTP is required to activate your account.' },
      });
    }

    const isOtpValid = await verifyOtp(cleanEmail, otp.trim(), 'SIGNUP_VERIFICATION');
    if (!isOtpValid) {
      return res.status(400).json({
        error: { code: 'INVALID_OTP', message: 'Invalid or expired 6-digit verification code. Please check your email.' },
      });
    }

    const existing: any = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ error: { code: 'USER_EXISTS', message: 'An account with this email address already exists' } });
    }

    // OWASP A01 / API3: Prevent privilege escalation / mass assignment to admin
    if (role === 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Administrator accounts cannot be registered publicly.' } });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long.' } });
    }

    const allowedRoles = ['student', 'jobseeker', 'industry', 'academician'];
    const effectiveRole = allowedRoles.includes(role) ? role : 'student';

    const user: any = new User({
      name: name.trim(),
      email: cleanEmail,
      password: password,
      role: effectiveRole,
      institution: institution || companyName,
      degree: degree || (effectiveRole === 'jobseeker' ? 'Graduate / Professional' : 'B.Tech Engineering'),
      department,
      designation,
      industry,
      graduationYear: graduationYear ? Number(graduationYear) : undefined,
      ayushDomain: ayushDomain || (degree?.includes('Tech') ? 'Technology & Engineering' : 'Technology & Engineering'),
      facultyId: facultyId?.trim(),
      loginCount: 1,
      lastLoginAt: new Date(),
      isEmailVerified: true,
      verified: true,
    });

    await user.save();

    // Auto-create empty initial skill profile for student or job seeker
    if (user.role === 'student' || user.role === 'jobseeker') {
      await SkillProfile.create({
        userId: user._id.toString(),
        degree: user.degree || 'B.Tech Computer Science & Engineering',
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
      await sendOtpEmail(cleanEmail, 'PASSWORD_RESET');
    }

    // Always return generic success message to prevent user enumeration (OWASP A07:2025)
    res.json({
      data: {
        success: true,
        message: `If an account with ${cleanEmail} exists, a password reset verification code has been dispatched.`,
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

    if (newPassword.length < 6) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'New password must be at least 6 characters long' } });
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

    if (record.otp !== cleanOtp) {
      record.attempts += 1;
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
