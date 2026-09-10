import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { FacultyOpportunity, MentorshipRequest, Workshop } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import {
  School,
  CalendarCheck,
  Award,
  BookOpen,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Video,
  Plus,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';
import { MouProposalModal } from '../../components/common/MouProposalModal';

export const AcademicianDashboard: React.FC = () => {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<FacultyOpportunity[]>([]);
  const [mentorships, setMentorships] = useState<MentorshipRequest[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [showMouModal, setShowMouModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAcademicData = async () => {
      setLoading(true);
      const [oppRes, mentRes, wkRes] = await Promise.all([
        api.academician.getFacultyOpportunities(),
        api.academician.getMentorshipRequests(),
        api.academician.getWorkshops()
      ]);
      setOpportunities(oppRes.data);
      setMentorships(mentRes.data);
      setWorkshops(wkRes.data);
      setLoading(false);
    };
    loadAcademicData();
  }, []);

  const handleAcceptRequest = async (id: string) => {
    await api.academician.updateMentorshipStatus(id, 'accepted');
    setMentorships((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'accepted' } : m))
    );
  };

  const isNewUser = (user?.loginCount ?? 1) <= 1;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-800 to-amber-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Academic Faculty & Research Guide Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isNewUser ? `Welcome, ${user?.name || 'Faculty Member'}` : `Welcome back, ${user?.name || 'Faculty Member'}`}
          </h1>
          <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
            {isNewUser
              ? `Your academic console at ${user?.institution || 'your university'} is active. Connect with student scholars, host skills workshops, and engage with industry grant calls.`
              : `${user?.designation || 'Academic Faculty'} • ${user?.institution || 'Affiliated University'}. You have ${mentorships.filter(m => m.status === 'pending').length} pending mentorship request${mentorships.filter(m => m.status === 'pending').length === 1 ? '' : 's'} and ${opportunities.length} active industry sabbatical calls.`}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/academician/students"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Institutional Scholars (.edu.in)</span>
            </Link>
            <Link
              to="/academician/mentorship"
              className="px-4 py-2 rounded-xl bg-white text-amber-950 font-bold text-xs hover:bg-amber-50 transition-colors"
            >
              Manage Mentorship & Workshops
            </Link>
            <Link
              to="/meetings"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
            >
              Live Video Mentorship
            </Link>
            <Link
              to="/academician/opportunities"
              className="px-4 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 text-white font-semibold text-xs border border-amber-500/30 transition-colors"
            >
              Browse Faculty Immersion Grants
            </Link>
            <button
              onClick={() => setShowMouModal(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Propose Industry MoU</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Student Mentees"
          value={mentorships.filter((m) => m.status === 'accepted').length.toString()}
          subtitle="Accepted research mentees"
          icon={School}
          color="amber"
        />
        <StatCard
          title="Pending Guidance Requests"
          value={mentorships.filter((m) => m.status === 'pending').length.toString()}
          subtitle="Scholar mentorship requests"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Workshops Hosted"
          value={workshops.length.toString()}
          subtitle={workshops.length === 0 ? 'No workshops scheduled' : `${workshops.length} active training programs`}
          icon={CalendarCheck}
          color="emerald"
        />
        <StatCard
          title="Industry Grant Calls"
          value={opportunities.length.toString()}
          subtitle={`${opportunities.length} sabbatical & research calls`}
          icon={Award}
          color="purple"
        />
      </div>

      {/* Mentorship Requests & Faculty Immersion Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Mentorship Queue */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Student Mentorship Queue</h3>
              <p className="text-xs text-slate-500">1-on-1 guidance requests for student research dissertations and projects</p>
            </div>
            <Link to="/academician/mentorship" className="text-xs font-bold text-amber-700 hover:underline">
              View All →
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            {mentorships.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{req.studentName}</h4>
                    <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">{req.topic}</p>
                  </div>
                  <Badge variant={req.status === 'accepted' ? 'emerald' : 'amber'} size="sm">
                    {req.status.toUpperCase()}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">{req.message}</p>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Proposed: {req.preferredDate}</span>
                  {req.status === 'pending' ? (
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      Accept Guidance Slot
                    </button>
                  ) : (
                    <a
                      href={req.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 flex items-center gap-1"
                    >
                      <Video className="w-3 h-3" />
                      <span>Join Room</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Faculty Immersion & Research Grants Snapshot */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Sponsored Faculty Sabbaticals</h3>
              <p className="text-xs text-slate-500">Industry-funded fellowships and research collaboration grants</p>
            </div>
            <Link to="/academician/opportunities" className="text-xs font-bold text-amber-700 hover:underline">
              Explore All →
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            {opportunities.slice(0, 2).map((opp) => (
              <div
                key={opp.id}
                className="p-4 rounded-2xl border border-slate-200 hover:border-amber-300 transition-all bg-white space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{opp.title}</h4>
                  <Badge variant="purple" size="sm">{opp.type}</Badge>
                </div>
                <p className="text-xs text-slate-600">{opp.organization}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="font-bold text-emerald-700">{opp.stipendOrGrant}</span>
                  <Link
                    to="/academician/opportunities"
                    className="text-amber-700 font-bold hover:underline"
                  >
                    View Terms →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MoU Proposal Modal */}
      <MouProposalModal
        isOpen={showMouModal}
        onClose={() => setShowMouModal(false)}
        initiatorRole="academician"
      />
    </div>
  );
};
