import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { Application, Internship } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import {
  Briefcase,
  Users,
  PlusCircle,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { MouProposalModal } from '../../components/common/MouProposalModal';

export const IndustryDashboard: React.FC = () => {
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [showMouModal, setShowMouModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIndustryData = async () => {
      setLoading(true);
      const companyQuery = user?.institution || user?.name || '';
      const [appRes, intRes, meetRes] = await Promise.allSettled([
        api.applications.getCompanyApplicants(companyQuery),
        api.internships.getAll(),
        api.meetings.getMyMeetings(),
      ]);
      if (appRes.status === 'fulfilled') setApplicants(appRes.value.data || []);
      if (intRes.status === 'fulfilled') setInternships(intRes.value.data || []);
      if (meetRes.status === 'fulfilled') setMeetingsCount(meetRes.value.data?.length || 0);
      setLoading(false);
    };
    fetchIndustryData();
  }, [user]);

  const evaluatedApplicants = applicants.filter((a) => typeof a.skillMatchPercentage === 'number' && a.skillMatchPercentage > 0);
  const avgMatch = evaluatedApplicants.length > 0
    ? `${Math.round(evaluatedApplicants.reduce((acc, a) => acc + (a.skillMatchPercentage || 0), 0) / evaluatedApplicants.length)}%`
    : 'Pending';

  const isNewUser = (user?.loginCount ?? 1) <= 1;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-950/60 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Corporate & Tech Industry Recruiter Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isNewUser ? `Welcome, ${user?.name || 'Recruiter'}` : `Welcome back, ${user?.name || 'Recruiter'}`}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            {isNewUser
              ? `Your corporate portal for ${user?.institution || 'your organization'} is live. Start posting internships, scheduling live video interviews, and finding verified candidates.`
              : `Logged in to ${user?.institution || 'Recruitment Console'}. You have ${applicants.length} student applicant${applicants.length === 1 ? '' : 's'} benchmarked against your skill criteria.`}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/industry/post"
              className="px-4 py-2 rounded-xl bg-white text-blue-950 font-bold text-xs hover:bg-blue-50 transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Post New Internship / Job</span>
            </Link>
            <Link
              to="/meetings"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <span>Live Video Interviews ({meetingsCount})</span>
            </Link>
            <Link
              to="/industry/candidates"
              className="px-4 py-2 rounded-xl bg-blue-950/50 hover:bg-blue-950 text-white font-semibold text-xs border border-blue-400/30 transition-colors flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Talent Pool</span>
            </Link>
            <Link
              to="/industry/programs"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Manage Modules & Labs</span>
            </Link>
            <button
              onClick={() => setShowMouModal(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Propose Academic MoU</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Postings"
          value={internships.length.toString()}
          subtitle={`${internships.length} opportunity postings live`}
          icon={Briefcase}
          color="blue"
        />
        <StatCard
          title="Candidate Applications"
          value={applicants.length.toString()}
          subtitle={applicants.length === 0 ? 'No applications received yet' : 'In recruitment pipeline'}
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Interviews Scheduled"
          value={meetingsCount.toString()}
          subtitle={meetingsCount === 0 ? 'No live interviews booked' : `${meetingsCount} live conferences`}
          icon={Calendar}
          color="purple"
        />
        <StatCard
          title="Avg. Candidate Match"
          value={avgMatch}
          subtitle={applicants.length > 0 ? 'Competency benchmark match' : 'Awaiting applicants'}
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* Recent Applicants Review Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Candidate Pipeline</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review verified candidates who have applied for your active openings
            </p>
          </div>
          <Link
            to="/industry/applicants"
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            <span>Manage All ({applicants.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-3 px-2">Applicant</th>
                <th className="pb-3 px-2">Institution</th>
                <th className="pb-3 px-2">Target Opportunity</th>
                <th className="pb-3 px-2">Skill Match</th>
                <th className="pb-3 px-2">Date</th>
                <th className="pb-3 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applicants.slice(0, 4).map((app) => (
                <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="font-bold text-slate-900">{app.studentName}</div>
                    <div className="text-[11px] text-slate-400">{app.studentEmail}</div>
                  </td>
                  <td className="py-3 px-2 text-slate-600 font-medium">{app.studentInstitute}</td>
                  <td className="py-3 px-2 font-semibold text-slate-800">{app.opportunityTitle}</td>
                  <td className="py-3 px-2">
                    <Badge variant={app.skillMatchPercentage !== undefined ? 'emerald' : 'slate'} size="sm">
                      {app.skillMatchPercentage !== undefined ? `${app.skillMatchPercentage}% Compatible` : 'Pending Evaluation'}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-slate-400">{formatDate(app.appliedDate)}</td>
                  <td className="py-3 px-2 text-right">
                    <Badge status={app.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MoU Proposal Modal */}
      <MouProposalModal
        isOpen={showMouModal}
        onClose={() => setShowMouModal(false)}
        initiatorRole="industry"
      />
    </div>
  );
};
