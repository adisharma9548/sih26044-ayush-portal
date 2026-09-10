import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import { api } from '../../services/api';
import {
  GraduationCap,
  Briefcase,
  Factory,
  School,
  ShieldCheck,
  Award,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Cpu,
  Database,
  Cloud,
  Layers,
  Code
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [partners, setPartners] = useState<any[]>([]);

  useEffect(() => {
    api.admin.getDashboardStats()
      .then(res => setStats(res.data))
      .catch(() => setStats(null));
    api.admin.getPartners()
      .then(res => setPartners(res.data || []))
      .catch(() => setPartners([]));
  }, []);

  const handleRoleQuickStart = (_role: UserRole, targetRoute: string) => {
    if (isAuthenticated) {
      navigate(targetRoute);
    } else {
      navigate('/login');
    }
  };

  const rolesConfig: {
    role: UserRole;
    title: string;
    description: string;
    route: string;
    icon: any;
    color: string;
    badge: string;
    features: string[];
  }[] = [
    {
      role: 'student',
      title: 'University Students',
      description: 'Institutional track for B.Tech, Computer Science, Engineering, and Science scholars (.edu.in). Take assessments, map skill gaps, and secure stipendiary internships.',
      route: '/student/dashboard',
      icon: GraduationCap,
      color: 'border-emerald-200 hover:border-emerald-500 bg-emerald-50/40',
      badge: 'B.Tech / MCA / Sciences',
      features: ['Automated Skill Gap Radar', 'Stipendiary Tech Internships', 'Verified Digital Portfolio']
    },
    {
      role: 'jobseeker',
      title: 'Job Seekers & Graduates',
      description: 'Open career track for graduates and working professionals. Register with any standard email, take standardized skill assessments, and apply directly for openings.',
      route: '/student/dashboard',
      icon: Briefcase,
      color: 'border-blue-200 hover:border-blue-500 bg-blue-50/40',
      badge: 'Open Track (Any Email)',
      features: ['Standard Email Signup', 'Direct Corporate Applications', 'Adaptive Domain Testing']
    },
    {
      role: 'industry',
      title: 'Industry & Recruiters',
      description: 'Post high-impact technical internships and full-time roles. Filter candidates by benchmarked algorithm, cloud, and systems scores, and host live interview meetings.',
      route: '/industry/dashboard',
      icon: Factory,
      color: 'border-indigo-200 hover:border-indigo-500 bg-indigo-50/40',
      badge: 'Tech & Enterprise Firms',
      features: ['Pre-Assessed Verified Talent', 'Conduct Live Video Interviews', 'Automated Funnel Analytics']
    },
    {
      role: 'academician',
      title: 'Faculty & Mentors',
      description: 'Institutional faculty with verified registration IDs. Track batch competencies, launch hands-on workshops, and participate in joint research and sabbaticals.',
      route: '/academician/dashboard',
      icon: School,
      color: 'border-amber-200 hover:border-amber-500 bg-amber-50/40',
      badge: 'Faculty Guides & Guides',
      features: ['Verified University Faculty ID', 'Student Mentorship Portals', 'Joint Grant & Research Calls']
    }
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            NodalConnector National Competency & Career Platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
            Connecting <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Engineering & Higher Education</span> with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">Industry Innovation</span>
          </h1>

          <p className="max-w-3xl mx-auto text-slate-300 text-base sm:text-lg leading-relaxed">
            The national integrated ecosystem for competency-based skill gap evaluation, standardized assessments, stipendiary tech internships, and direct corporate recruitment pipelines.
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to={isAuthenticated ? "/student/dashboard" : "/signup"}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 group cursor-pointer"
            >
              <span>{isAuthenticated ? 'Go to Your Dashboard' : 'Get Started — Register Now'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to={isAuthenticated ? "/student/internships" : "/login"}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20 transition-all cursor-pointer"
            >
              {isAuthenticated ? 'Browse Open Opportunities' : 'Sign In to Portal'}
            </Link>
          </div>

          {/* Key Metrics Banner (Live Data from MongoDB) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-12 border-t border-slate-800/80 mt-12 text-center">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-400">
                {stats?.totalStudents !== undefined ? `${stats.totalStudents}` : '—'}
              </div>
              <div className="text-xs text-slate-400 mt-1">Verified Scholars</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-bold text-teal-300">
                {stats?.activePartners !== undefined ? `${stats.activePartners}` : '—'}
              </div>
              <div className="text-xs text-slate-400 mt-1">Accredited Partners</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-bold text-amber-400">
                {stats?.totalInternshipsPosted !== undefined ? `${stats.totalInternshipsPosted}` : '—'}
              </div>
              <div className="text-xs text-slate-400 mt-1">Active Opportunities</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-2xl sm:text-3xl font-bold text-indigo-400">
                {stats?.mouSignedCount !== undefined ? `${stats.mouSignedCount}` : '—'}
              </div>
              <div className="text-xs text-slate-400 mt-1">Formal MoUs Signed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Selection Showcase (4 Public Tracks) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Tailored Pathways for Every Stakeholder
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Experience dedicated portals designed for university students, career job seekers, industry recruiters, and academic faculty.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {rolesConfig.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.role}
                className={`flex flex-col justify-between p-6 rounded-2xl border-2 transition-all hover:shadow-xl ${item.color} bg-white`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center text-slate-800">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.description}</p>

                  <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    {item.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleRoleQuickStart(item.role, item.route)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Enter as {item.title.split(' ')[0]}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Multi-Disciplinary Competency Framework Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white overflow-hidden relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
                Multi-Disciplinary Assessment Framework
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Benchmark Your Competencies Against National Industry Standards
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                NodalConnector evaluates real problem-solving ability across software systems, algorithm complexity, cloud resilience, and interdisciplinary engineering:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Full-Stack Architecture</h4>
                    <p className="text-[11px] text-slate-400">REST microservices, database transactions, modern UI</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Cloud Computing & DevOps</h4>
                    <p className="text-[11px] text-slate-400">Docker containerization, CI/CD pipelines, Kubernetes</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                  <div>
                    <h4 className="text-xs font-bold text-white">AI & Applied Machine Learning</h4>
                    <p className="text-[11px] text-slate-400">Deep learning, NLP, data pipelines, PyTorch/TensorFlow</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">4</div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Cyber Defense & IoT</h4>
                    <p className="text-[11px] text-slate-400">OWASP security compliance, network analysis, edge hardware</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Take the National Skill Assessment</h3>
              <p className="text-xs text-slate-300 mt-2 max-w-sm">
                Complete our adaptive multi-discipline diagnostic test to generate your verified national competency radar and unlock direct employer matching.
              </p>
              <Link
                to={isAuthenticated ? "/student/assessment" : "/login"}
                className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors"
              >
                Start Assessment Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise & Research Partners Section */}
      {partners && partners.filter((p: any) => p.status === 'Approved').length > 0 ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
            Accredited Collaboration Partners
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs sm:text-sm font-bold text-slate-600">
            {partners
              .filter((p: any) => p.status === 'Approved')
              .map((partner: any, idx: number) => (
                <span key={idx} className="uppercase tracking-wide">{partner.name}</span>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};
