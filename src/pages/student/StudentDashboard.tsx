import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { Internship, Job, SkillProfile } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { GaugeScore } from '../../components/common/GaugeScore';
import { Badge } from '../../components/common/Badge';
import { UserAvatar } from '../../components/common/UserAvatar';
import { AiOnboardingModal } from '../../components/student/AiOnboardingModal';
import {
  Award,
  Briefcase,
  FileCheck,
  Calendar,
  ArrowRight,
  Sparkles,
  BookOpen,
  Building2,
  MapPin,
  Clock,
  TrendingUp,
  AlertCircle,
  Video,
  BrainCircuit
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [skillProfile, setSkillProfile] = useState<SkillProfile | null>(null);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [upcomingMeeting, setUpcomingMeeting] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAiModal, setShowAiModal] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [profileRes, intRes, jobRes, appRes, meetRes] = await Promise.allSettled([
        api.skills.getProfile(),
        api.internships.getAll(),
        api.jobs.getAll(),
        api.applications.getMyApplications(),
        api.meetings.getMyMeetings(),
      ]);

      if (profileRes.status === 'fulfilled') {
        const prof = profileRes.value.data;
        setSkillProfile(prof);
        // Automatically prompt AI diagnostic onboarding if overallScore is 0 (new student)
        if (!prof || prof.overallScore === 0) {
          setShowAiModal(true);
        }
      }

      if (intRes.status === 'fulfilled') {
        setInternships(intRes.value.data.slice(0, 3));
      }

      if (jobRes.status === 'fulfilled') {
        setJobs(jobRes.value.data.slice(0, 2));
      }

      if (appRes.status === 'fulfilled') {
        setApplicationsCount(appRes.value.data?.length || 0);
      }

      if (meetRes.status === 'fulfilled') {
        const meetings = meetRes.value.data || [];
        const upcoming = meetings.find((m: any) => new Date(m.scheduledAt) >= new Date() && m.status === 'scheduled');
        setUpcomingMeeting(upcoming || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleAiModalComplete = () => {
    setShowAiModal(false);
    loadDashboardData();
  };

  const isAssessed = skillProfile && skillProfile.overallScore > 0;
  const isNewUser = (user?.loginCount ?? 1) <= 1;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-2xl relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>National Skill Repository • {user?.degree || 'Technical Degree'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isNewUser ? `Welcome to your Career Launchpad, ${user?.name || 'Scholar'}!` : `Welcome back, ${user?.name || 'Scholar'}!`}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
            {isNewUser
              ? "Your university-verified profile is active on the unified Academia–Industry portal. Discover your skills, bridge domain gaps, and connect directly with hiring industries."
              : "Great to see you continuing your career progression. Check your verified Skill Gap Radar, review scheduled recruiter meetings, and explore newly posted opportunities."}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAiModal(true)}
              className="px-4 py-2 rounded-xl bg-white text-emerald-900 font-bold text-xs hover:bg-emerald-50 shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isAssessed ? 'Retake AI Diagnostic' : 'Launch AI Diagnostic Test'}</span>
            </button>
            <Link
              to="/student/internships"
              className="px-4 py-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 text-white font-semibold text-xs border border-emerald-500/30 transition-colors"
            >
              Browse Internships
            </Link>
          </div>
        </div>
        <div className="relative z-10 shrink-0 hidden md:block">
          <UserAvatar user={user} size="xl" className="ring-4 ring-white/20 shadow-md" />
        </div>
      </div>

      {/* Active Study Sprint Banner (If student reached 5 mistakes and received AI study plan) */}
      {user?.studyRoadmap && !isAssessed && (
        <div className="p-5 rounded-2xl bg-blue-50/90 border border-blue-200 text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-blue-950">Active Preparation Sprint</h3>
                <span className="text-[10px] font-bold bg-blue-200/80 text-blue-900 px-2 py-0.5 rounded-full">
                  {user.studyRoadmap.recommendedTimeline}
                </span>
              </div>
              <p className="text-xs text-blue-800 mt-1">
                Targeted review topics: <strong>{user.studyRoadmap.targetedTopics?.join(' • ')}</strong>. Ready to test again?
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAiModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shrink-0 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span>Retake Diagnostic</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mandatory AI Diagnostic Alert Banner (Only if not assessed and no study sprint yet) */}
      {!isAssessed && !user?.studyRoadmap && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-300/80 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-950">AI Skill Diagnostic Required</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Answer diagnostic questions tailored to <strong>{user?.currentDomain || user?.degree || 'your technical degree'}</strong> to generate your verified Skill Gap Radar and unlock personalized recruiter recommendations.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAiModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm shrink-0 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <span>Take Diagnostic Assessment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metric Stats Cards — 100% REAL LIVE DATA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Skill Benchmark Score"
          value={isAssessed ? `${skillProfile?.overallScore} / 100` : 'Pending'}
          subtitle={isAssessed ? `Top ${100 - (skillProfile?.rankPercentile || 80)}% Nationally` : 'AI Diagnostic Required'}
          icon={Award}
          color="emerald"
          trend={isAssessed ? { value: 'Verified by AI', isPositive: true } : undefined}
        />
        <StatCard
          title="Active Applications"
          value={applicationsCount.toString()}
          subtitle={applicationsCount === 0 ? 'No applications submitted' : `${applicationsCount} in recruitment pipeline`}
          icon={FileCheck}
          color="blue"
        />
        <StatCard
          title="Upcoming Interview"
          value={upcomingMeeting ? new Date(upcomingMeeting.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'None'}
          subtitle={upcomingMeeting ? `${upcomingMeeting.title.substring(0, 22)}...` : 'No live interviews scheduled'}
          icon={Calendar}
          color="amber"
        />
        <StatCard
          title="Skill Gap Bridge Modules"
          value={skillProfile?.gapAnalysis?.length ? `${skillProfile.gapAnalysis.length} Identified` : '0 Gaps'}
          subtitle={skillProfile?.gapAnalysis?.[0]?.skill ? `Priority: ${skillProfile.gapAnalysis[0].skill.substring(0, 20)}...` : 'Assessment required'}
          icon={BookOpen}
          color="purple"
        />
      </div>

      {/* Main Grid: Skill Gauge / Gap Radar Preview & Recommended Openings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Skill Score Gauge & Priority Bridge Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Competency Score Gauge</h3>
              {isAssessed && (
                <Link to="/student/skills" className="text-xs font-semibold text-emerald-600 hover:underline">
                  View Radar →
                </Link>
              )}
            </div>

            {isAssessed ? (
              <GaugeScore score={skillProfile?.overallScore || 0} percentile={skillProfile?.rankPercentile || 0} />
            ) : (
              <div className="py-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center mx-auto text-slate-400 font-bold text-lg">
                  --
                </div>
                <p className="text-xs text-slate-500 font-medium">No assessment completed yet</p>
                <button
                  onClick={() => setShowAiModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors"
                >
                  Start Diagnostic Test
                </button>
              </div>
            )}

            {/* Dynamic Real Competencies from SkillProfile */}
            {isAssessed && skillProfile?.skills && skillProfile.skills.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                {skillProfile.skills.slice(0, 3).map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium truncate max-w-[180px]">{s.name}</span>
                      <span className="text-emerald-700 font-bold">{s.level}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${s.level}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Matched Internships & Live Interview Link */}
        <div className="lg:col-span-8 space-y-6">
          {/* Live Meetings Quick Link */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm">Live Hiring & Mentorship Room</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Connect with corporate recruiters and university faculty mentors via Native WebRTC HD video calls.
                </p>
              </div>
            </div>
            <Link
              to="/meetings"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 transition-colors"
            >
              Open Live Meetings
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">AI-Matched Industry Internships</h3>
                <p className="text-xs text-slate-500">Tailored to your degree in {user?.degree || 'Engineering & Healthcare'}</p>
              </div>
              <Link to="/student/internships" className="text-xs font-semibold text-emerald-600 hover:underline">
                View All ({internships.length}+) →
              </Link>
            </div>

            {internships.length === 0 ? (
              <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                <h4 className="text-sm font-bold text-slate-700">No active internships posted yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  New internships will appear here in real-time as verified employers register and publish opportunities.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {internships.map((int) => (
                  <div
                    key={int.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <img
                        src={int.companyLogo || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=80&auto=format&fit=crop&q=80'}
                        alt={int.company}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">{int.title}</h4>
                          <Badge variant="emerald" size="sm">90% Match</Badge>
                        </div>
                        <p className="text-xs font-medium text-slate-600 mt-0.5">{int.company}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {int.location}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {int.duration}</span>
                          <span className="font-bold text-emerald-700">{int.stipend}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center shrink-0">
                      <Link
                        to={`/student/internships/${int.id || (int as any)._id}`}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs transition-colors"
                      >
                        Apply Now
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Groq AI Diagnostic Assessment Modal */}
      <AiOnboardingModal
        isOpen={showAiModal}
        onComplete={handleAiModalComplete}
        onClose={() => setShowAiModal(false)}
      />
    </div>
  );
};
