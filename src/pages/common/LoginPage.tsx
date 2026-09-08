import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/useAuthStore';
import { UserRole } from '../../types';
import { Captcha, CaptchaRef } from '../../components/common/Captcha';
import {
  GraduationCap,
  Briefcase,
  Factory,
  School,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, isAuthenticated, login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const roleParam = searchParams.get('role') as UserRole | null;
  const initialRole: UserRole = roleParam === 'admin' ? 'admin' : (roleParam || 'student');

  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaRef>(null);

  // Auto-redirect if already logged in (eliminates redirect loop / bouncing)
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

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Anti-bot CAPTCHA check
    if (captchaRef.current && !captchaRef.current.validate()) {
      setLocalError('Incorrect security CAPTCHA code. Please enter the characters shown in the box.');
      return;
    }

    try {
      await login(email, password, selectedRole);
      const currentUser = useAuthStore.getState().user;
      const effectiveRole = currentUser?.role || selectedRole;

      switch (effectiveRole) {
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
    } catch (err: any) {
      setLocalError(err.message || 'Login failed. Please check your credentials.');
      captchaRef.current?.refresh();
    }
  };

  const displayedError = localError || error;

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left Side: SkillBridge Brand & Information */}
        <div className="md:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-4 h-4" />
              SkillBridge Portal
            </div>
            <h2 className="text-xl font-bold leading-tight">National Multi-Disciplinary Skills & Placement Platform</h2>
            <p className="text-xs text-slate-300 mt-2 mb-6 leading-relaxed">
              Unified ecosystem for engineering, technology, sciences, and professional students to evaluate skill gaps, discover stipendiary internships, and connect with top industry recruiters.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <GraduationCap className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">University Students (.edu.in)</p>
                  <p className="text-[11px] text-slate-400">Institutional skill assessments, B.Tech gap radar & direct placements.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <Briefcase className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">Job Seekers & Graduates</p>
                  <p className="text-[11px] text-slate-400">Open track with standard emails to discover tech and core opportunities.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <Factory className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">Industry Partners</p>
                  <p className="text-[11px] text-slate-400">Hire pre-assessed talent and schedule live technical interviews.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <School className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-white">Academicians & Guides</p>
                  <p className="text-[11px] text-slate-400">Verified faculty IDs, curriculum alignment & collaborative R&D grants.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Protected by 256-bit encryption & anti-bot verification.</span>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Login Form */}
        <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-lg">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In to SkillBridge</h2>
              {selectedRole === 'admin' && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Admin Portal
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">Select your role and enter your registered credentials</p>
          </div>

          {/* Role selector tabs - Public shows Student, Job Seeker, Industry, Academician */}
          {selectedRole === 'admin' ? (
            <div className="p-3 mb-6 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between text-xs text-purple-900">
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Administrator Direct Access</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRole('student')}
                className="text-[11px] text-purple-700 underline font-semibold hover:text-purple-900"
              >
                Switch to standard login
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
              {[
                { key: 'student', label: 'Student' },
                { key: 'jobseeker', label: 'Job Seeker' },
                { key: 'industry', label: 'Industry' },
                { key: 'academician', label: 'Academician' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleSelect(key as UserRole)}
                  className={`py-2 text-[11px] font-bold rounded-lg transition-all ${
                    selectedRole === key
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {displayedError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
              <span>{displayedError}</span>
              <button type="button" onClick={() => setLocalError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-2">×</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {selectedRole === 'admin'
                  ? 'Administrator Username or Email'
                  : selectedRole === 'jobseeker'
                  ? 'Email Address (Any email)'
                  : selectedRole === 'industry'
                  ? 'Corporate Work Email'
                  : 'Institutional University Email (.edu.in)'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder={
                    selectedRole === 'admin'
                      ? 'admin or admin@skillbridge.gov.in'
                      : selectedRole === 'jobseeker'
                      ? 'candidate@gmail.com'
                      : selectedRole === 'industry'
                      ? 'recruiter@company.com'
                      : 'student@dtu.edu.in'
                  }
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-emerald-600 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder={selectedRole === 'admin' ? 'admin' : '••••••••'}
                />
              </div>
            </div>

            {/* Anti-Bot Security CAPTCHA */}
            <Captcha ref={captchaRef} />

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span>Keep me signed in</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>
                    Sign In as {selectedRole === 'jobseeker' ? 'JOB SEEKER' : selectedRole.toUpperCase()}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-emerald-600 hover:underline">
              Register New Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
