import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import { api } from '../../services/api';
import { Captcha, CaptchaRef } from '../../components/common/Captcha';
import { UGCDegreeSelector } from '../../components/common/UGCDegreeSelector';
import {
  User as UserIcon,
  Mail,
  Lock,
  Building,
  GraduationCap,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Loader2,
  X,
  Sparkles
} from 'lucide-react';

export const SignupPage: React.FC = () => {
  const { user, isAuthenticated, signup } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      switch (user.role) {
        case 'student':
        case 'jobseeker':
          navigate('/student/dashboard', { replace: true });
          break;
        case 'industry':
          navigate('/industry/dashboard', { replace: true });
          break;
        case 'academician':
          navigate('/academician/dashboard', { replace: true });
          break;
        case 'admin':
          navigate('/admin/dashboard', { replace: true });
          break;
        default:
          navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const [role, setRole] = useState<UserRole>('student');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    institution: '',
    degree: 'B.Tech in Computer Science & Engineering (CSE)',
    department: 'Department of Computer Science & Engineering',
    designation: 'Undergraduate Scholar',
    industry: 'Technology & Software Systems',
    licenseNumber: '',
    facultyId: '',
    graduationYear: 2026,
    ayushDomain: 'Technology & Engineering' as any,
  });

  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaRef>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError(null);
  };

  const validateClientSide = (): string | null => {
    const cleanEmail = formData.email.toLowerCase().trim();

    if (!formData.name.trim()) return 'Please enter your full legal name.';
    if (!cleanEmail) return 'Please enter your email address.';
    if (formData.password.length < 6) return 'Password must be at least 6 characters.';

    // 1. Student & Academician institutional email check (.edu.in / .ac.in)
    if (role === 'student' || role === 'academician') {
      const isEdu = cleanEmail.endsWith('.edu.in') || cleanEmail.endsWith('.ac.in');
      if (!isEdu) {
        return `${role === 'student' ? 'Students' : 'Academicians'} must register with an official university email ending with .edu.in or .ac.in (e.g. name@university.edu.in). If you are a general candidate or graduate, please select the "Job Seeker" tab.`;
      }
    }

    // 2. Job Seeker (Allows any valid email address)
    if (role === 'jobseeker') {
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return 'Please enter a valid email address to receive your OTP verification code.';
      }
    }

    // 3. Academician Faculty ID check
    if (role === 'academician' && !formData.facultyId.trim()) {
      return 'University Faculty ID / Registration number is required for academician registration.';
    }

    // 4. Industry corporate work email check
    if (role === 'industry') {
      const consumerDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'rediffmail.com', 'proton.me'];
      const domain = cleanEmail.split('@')[1] || '';
      if (consumerDomains.includes(domain)) {
        return 'Industry recruiters must register using an official corporate work email (consumer domains like @gmail.com are not permitted).';
      }

      if (formData.institution.trim()) {
        const compClean = formData.institution.toLowerCase().replace(/[^a-z0-9]/g, '');
        const domClean = domain.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!domClean.includes(compClean) && !compClean.includes(domClean)) {
          return `Company name "${formData.institution}" does not match your corporate email domain "@${domain}". Please check your company name or use your official corporate work email.`;
        }
      }
    }

    return null;
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const clientError = validateClientSide();
    if (clientError) {
      setFormError(clientError);
      return;
    }

    // Anti-bot CAPTCHA check
    if (captchaRef.current && !captchaRef.current.validate()) {
      setFormError('Incorrect security CAPTCHA code. Please enter the characters displayed in the anti-bot box.');
      return;
    }

    setIsSendingOtp(true);
    try {
      await api.auth.sendOtp({
        email: formData.email.trim(),
        role,
        companyName: formData.institution,
        facultyId: formData.facultyId,
      });

      setOtpStep(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to dispatch verification OTP to your email.');
      captchaRef.current?.refresh();
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setFormError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setIsVerifying(true);
    setFormError(null);

    try {
      await signup({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role,
        institution: formData.institution.trim(),
        degree: formData.degree,
        department: formData.department,
        designation: formData.designation,
        industry: formData.industry,
        facultyId: formData.facultyId.trim(),
        graduationYear: formData.graduationYear,
        ayushDomain: formData.ayushDomain,
        otp: otpCode.trim(),
      } as any);

      switch (role) {
        case 'student':
        case 'jobseeker':
          navigate('/student/dashboard');
          break;
        case 'industry':
          navigate('/industry/dashboard');
          break;
        case 'academician':
          navigate('/academician/dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (err: any) {
      setFormError(err.message || 'Verification failed. Please verify your OTP and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/90 shadow-xl">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              Verified Registration
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">SkillBridge National Platform</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-2">Create Your SkillBridge Account</h2>
          <p className="text-xs text-slate-500 mt-1">
            Sign up for university students, career job seekers, corporate recruiters, and academic faculty.
          </p>
        </div>

        {/* Role Selection Tabs - Public shows Student, Job Seeker, Industry, Academician */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
          {[
            { key: 'student', label: 'Student (.edu.in)' },
            { key: 'jobseeker', label: 'Job Seeker' },
            { key: 'industry', label: 'Industry' },
            { key: 'academician', label: 'Academician' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setRole(key as UserRole);
                setFormError(null);
              }}
              className={`py-2 px-1 text-center text-[11px] font-bold rounded-lg transition-all ${
                role === key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {formError && (
          <div className="p-4 mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {role === 'industry' ? 'Corporate Recruiter Name' : 'Full Legal Name'}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={role === 'industry' ? 'Rohan Mehra' : 'Aditya Sharma'}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {role === 'industry'
                  ? 'Corporate Work Email'
                  : role === 'jobseeker'
                  ? 'Email Address (Any email allowed)'
                  : 'Institutional University Email (.edu.in)'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={
                    role === 'industry'
                      ? 'recruiter@company.com'
                      : role === 'jobseeker'
                      ? 'candidate@gmail.com'
                      : role === 'academician'
                      ? 'professor@university.edu.in'
                      : 'student@dtu.edu.in'
                  }
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {role === 'industry'
                  ? 'Domain must match company name (No @gmail.com)'
                  : role === 'jobseeker'
                  ? 'Standard email accepted (@gmail.com, @yahoo.com, etc.)'
                  : 'Mandatory: must end with .edu.in or .ac.in'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Create Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Student Fields */}
          {role === 'student' && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">University / College</label>
                  <input
                    type="text"
                    required
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    placeholder="Delhi Technological University (DTU)"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <UGCDegreeSelector
                    value={formData.degree}
                    onChange={(val) => setFormData(prev => ({ ...prev, degree: val }))}
                    placeholder="Search UGC degree (e.g. B.Tech, B.Com, BAMS)..."
                    label="Degree Program"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Discipline Stream</label>
                  <select
                    name="ayushDomain"
                    value={formData.ayushDomain}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Technology & Engineering">Technology & Engineering</option>
                    <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
                    <option value="Cloud & DevOps">Cloud & DevOps</option>
                    <option value="Electronics & IoT">Electronics & IoT</option>
                    <option value="Ayush & Health-Tech">Health-Tech Informatics</option>
                    <option value="Core Engineering">Core Engineering</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Graduation Passing Year</label>
                  <input
                    type="number"
                    name="graduationYear"
                    value={formData.graduationYear}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Job Seeker Fields */}
          {role === 'jobseeker' && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">College / University / Last Institute</label>
                  <input
                    type="text"
                    required
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    placeholder="e.g. Delhi Technological University, NIT, Mumbai University"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <UGCDegreeSelector
                    value={formData.degree}
                    onChange={(val) => setFormData(prev => ({ ...prev, degree: val }))}
                    placeholder="Search UGC qualification (e.g. B.Tech, MCA, B.Sc)..."
                    label="Highest Qualification / Degree"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Discipline / Domain</label>
                  <select
                    name="ayushDomain"
                    value={formData.ayushDomain}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Technology & Engineering">Technology & Engineering</option>
                    <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
                    <option value="Cloud & DevOps">Cloud & DevOps</option>
                    <option value="Electronics & IoT">Electronics & IoT</option>
                    <option value="Ayush & Health-Tech">Health-Tech Informatics</option>
                    <option value="Core Engineering">Core Engineering</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Graduation Passing Year</label>
                  <input
                    type="number"
                    name="graduationYear"
                    value={formData.graduationYear}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Industry Fields */}
          {role === 'industry' && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Registered Company Name</label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      name="institution"
                      value={formData.institution}
                      onChange={handleChange}
                      placeholder="e.g. Tata Consultancy Services"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Recruiter Job Title</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      placeholder="Talent Acquisition Lead"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Academician Fields */}
          {role === 'academician' && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">University / College</label>
                  <input
                    type="text"
                    required
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    placeholder="e.g. Delhi Technological University"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Faculty ID / Employee Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="facultyId"
                    value={formData.facultyId}
                    onChange={handleChange}
                    placeholder="FAC-2026-ENG-891"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Anti-Bot Security CAPTCHA */}
          <div className="pt-2">
            <Captcha ref={captchaRef} />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSendingOtp}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSendingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating Domain & Dispatching OTP to Email...</span>
                </>
              ) : (
                <>
                  <span>Send Email Verification OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Already registered on the platform?{' '}
          <Link to="/login" className="font-bold text-emerald-600 hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>

      {/* Email OTP Verification Modal */}
      {otpStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Verify Email Address</h3>
              </div>
              <button
                type="button"
                onClick={() => setOtpStep(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600">
                A 6-digit one-time password (OTP) has been dispatched to{' '}
                <strong className="text-slate-900">{formData.email}</strong>.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Please check your inbox (and spam/junk folder) for the 6-digit verification code. The code is valid for 10 minutes.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 123456"
                  className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 px-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleVerifyAndRegister}
                disabled={isVerifying || otpCode.length !== 6}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating Account...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify OTP & Complete Registration</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setOtpStep(false)}
                className="text-xs text-slate-500 hover:text-slate-700 py-1"
              >
                Back to Registration Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
