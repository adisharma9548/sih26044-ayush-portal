import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Application, ApplicationStatus, FacultyOpportunity, FacultyApplication } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { AiMatchMatrix } from '../../components/common/AiMatchMatrix';
import {
  Users,
  Search,
  CheckCircle2,
  Calendar,
  FileText,
  UserCheck,
  ChevronDown,
  Mail,
  Building,
  Video,
  School,
  Award,
  ExternalLink,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

export const ManageApplicantsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'students' | 'faculty'>('students');
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [facultyPostings, setFacultyPostings] = useState<FacultyOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Selected applicant preview modal
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [selectedFacultyProposal, setSelectedFacultyProposal] = useState<{ opp: FacultyOpportunity; app: FacultyApplication } | null>(null);
  const [statusUpdatedToast, setStatusUpdatedToast] = useState('');

  // AI Synergy Matrix state
  const [synergyResults, setSynergyResults] = useState<
    Record<
      string,
      {
        synergyScore: number;
        verdict: string;
        strengths: string[];
        industrialFeasibility?: string;
        academicImpact?: string;
        recommendedAction?: string;
      }
    >
  >({});
  const [evaluatingSynergy, setEvaluatingSynergy] = useState(false);
  const [synergyError, setSynergyError] = useState('');

  const handleEvaluateSynergy = async () => {
    if (!selectedFacultyProposal) return;
    const proposalId = selectedFacultyProposal.app.id || (selectedFacultyProposal.app as any)._id;
    setEvaluatingSynergy(true);
    setSynergyError('');
    try {
      const res = await api.ai.evaluateProposalSynergy({
        opportunityTitle: selectedFacultyProposal.opp.title,
        organization: selectedFacultyProposal.opp.organization || user?.institution || 'Corporate Partner',
        opportunityType: selectedFacultyProposal.opp.type,
        requirements: selectedFacultyProposal.opp.requirements || [],
        facultyName: selectedFacultyProposal.app.facultyName,
        institution: selectedFacultyProposal.app.institution,
        proposalText: selectedFacultyProposal.app.proposalText,
        experience: selectedFacultyProposal.app.experience,
      });
      setSynergyResults((prev) => ({
        ...prev,
        [proposalId]: res.data,
      }));
    } catch (err: any) {
      setSynergyError(err?.message || 'Failed to evaluate synergy with AI.');
    } finally {
      setEvaluatingSynergy(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const companyQuery = user?.institution || user?.name || '';
      const [appRes, facRes] = await Promise.allSettled([
        api.applications.getCompanyApplicants(companyQuery),
        api.academician.getIndustryFacultyPostings(),
      ]);
      if (appRes.status === 'fulfilled') setApplicants(appRes.value.data || []);
      if (facRes.status === 'fulfilled') setFacultyPostings(facRes.value.data || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleStatusChange = async (appId: string, newStatus: ApplicationStatus) => {
    const res = await api.applications.updateStatus(appId, newStatus);
    setApplicants((prev) => prev.map((a) => (a.id === appId ? res.data : a)));
    if (selectedApp && selectedApp.id === appId) {
      setSelectedApp(res.data);
    }
    setStatusUpdatedToast(`Applicant marked as ${newStatus.replace('_', ' ').toUpperCase()}`);
    setTimeout(() => setStatusUpdatedToast(''), 3000);
  };

  const handleFacultyStatusChange = async (
    oppId: string,
    appId: string,
    newStatus: 'pending' | 'shortlisted' | 'accepted' | 'rejected'
  ) => {
    await api.academician.updateFacultyApplicationStatus(oppId, appId, newStatus);
    setFacultyPostings((prev) =>
      prev.map((opp) => {
        if (opp.id !== oppId) return opp;
        return {
          ...opp,
          applications: (opp.applications || []).map((a) =>
            a.id === appId || (a as any)._id === appId ? { ...a, status: newStatus } : a
          ),
        };
      })
    );
    if (
      selectedFacultyProposal &&
      (selectedFacultyProposal.app.id === appId || (selectedFacultyProposal.app as any)._id === appId)
    ) {
      setSelectedFacultyProposal({
        ...selectedFacultyProposal,
        app: { ...selectedFacultyProposal.app, status: newStatus },
      });
    }
    setStatusUpdatedToast(`Faculty proposal marked as ${newStatus.toUpperCase()}`);
    setTimeout(() => setStatusUpdatedToast(''), 3000);
  };

  const filtered = applicants.filter((a) => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = a.studentName?.toLowerCase().includes(q);
      const matchInst = a.studentInstitute?.toLowerCase().includes(q);
      const matchRole = a.opportunityTitle.toLowerCase().includes(q);
      return matchName || matchInst || matchRole;
    }
    return true;
  });

  const allFacultyProposals = facultyPostings.flatMap((opp) =>
    (opp.applications || []).map((app) => ({ opp, app }))
  );

  const filteredFacultyProposals = allFacultyProposals.filter(({ opp, app }) => {
    if (filterStatus !== 'all' && app.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = app.facultyName?.toLowerCase().includes(q);
      const matchInst = app.institution?.toLowerCase().includes(q);
      const matchTitle = opp.title.toLowerCase().includes(q);
      return matchName || matchInst || matchTitle;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
            ENTERPRISE RECRUITMENT & COLLABORATION
          </span>
          <span className="text-xs text-slate-400">
            Active Candidates: {applicants.length} • Faculty Proposals: {allFacultyProposals.length}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Manage Applicants & Faculty Proposals
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review student internship applications and collaborate with university professors on immersion sabbaticals and joint research grants
        </p>
      </div>

      {statusUpdatedToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusUpdatedToast}</span>
        </div>
      )}

      {/* Dual Category Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl max-w-md border border-slate-200/60">
        <button
          type="button"
          onClick={() => {
            setActiveTab('students');
            setFilterStatus('all');
          }}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
            activeTab === 'students'
              ? 'bg-white text-blue-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Student Candidates</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800">
            {applicants.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('faculty');
            setFilterStatus('all');
          }}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
            activeTab === 'faculty'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <School className="w-3.5 h-3.5" />
          <span>Faculty Proposals</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'faculty' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
            }`}
          >
            {allFacultyProposals.length}
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'students'
                  ? 'Search by student name, college, or position...'
                  : 'Search by professor name, institution, or immersion program...'
              }
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Stages</option>
              {activeTab === 'students' ? (
                <>
                  <option value="applied">Applied</option>
                  <option value="in_review">Under Review</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interview_scheduled">Interview Scheduled</option>
                  <option value="offered">Offer Extended</option>
                  <option value="rejected">Rejected</option>
                </>
              ) : (
                <>
                  <option value="pending">Pending Review</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="accepted">Accepted / Awarded</option>
                  <option value="rejected">Declined</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: Student Candidates Table */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Candidate & Institute</th>
                  <th className="py-3.5 px-4">Applied Role</th>
                  <th className="py-3.5 px-4">Skill Match</th>
                  <th className="py-3.5 px-4">Applied Date</th>
                  <th className="py-3.5 px-4">Status & Stage</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading candidate roster...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No student applicants match this criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900">{app.studentName}</div>
                        <div className="text-[11px] text-slate-500">{app.studentInstitute}</div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        <div>{app.opportunityTitle}</div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">{app.type}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {app.skillMatchPercentage ? `${app.skillMatchPercentage}% Match` : 'Evaluation Pending'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-500">{formatDate(app.appliedDate)}</td>
                      <td className="py-4 px-4">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                          className="text-xs font-semibold py-1 px-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="applied">Applied</option>
                          <option value="in_review">Under Review</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="interview_scheduled">Interview Scheduled</option>
                          <option value="offered">Offer Extended</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {app.status === 'interview_scheduled' && (
                            <Link
                              to={`/meetings?room=interview-${app.id}&title=${encodeURIComponent((app.opportunityTitle || 'Technical') + ' Interview')}`}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-xs"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Join Room</span>
                            </Link>
                          )}
                          <button
                            onClick={() => setSelectedApp(app)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition-colors"
                          >
                            View Dossier
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Faculty Immersion & Research Proposals Table */}
      {activeTab === 'faculty' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-50/80 border-b border-amber-200/80 text-amber-900 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Faculty Scholar & Affiliation</th>
                  <th className="py-3.5 px-4">Program & Category</th>
                  <th className="py-3.5 px-4">Grant / Fellowship</th>
                  <th className="py-3.5 px-4">Dispatched Date</th>
                  <th className="py-3.5 px-4">Review Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading faculty proposals...
                    </td>
                  </tr>
                ) : filteredFacultyProposals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No faculty proposals received yet for your posted programs.
                    </td>
                  </tr>
                ) : (
                  filteredFacultyProposals.map(({ opp, app }) => {
                    const appId = app.id || (app as any)._id;
                    return (
                      <tr key={appId} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <School className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{app.facultyName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">{app.institution || 'Institutional Scholar'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{app.facultyEmail}</div>
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-800">
                          <div>{opp.title}</div>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 mt-0.5">
                            {opp.type}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-emerald-700">{opp.stipendOrGrant}</div>
                          <div className="text-[11px] text-slate-400">{opp.duration}</div>
                        </td>
                        <td className="py-4 px-4 text-slate-500">{formatDate(app.createdAt)}</td>
                        <td className="py-4 px-4">
                          <select
                            value={app.status}
                            onChange={(e) =>
                              handleFacultyStatusChange(opp.id, appId, e.target.value as any)
                            }
                            className="text-xs font-semibold py-1 px-2 rounded-lg border border-amber-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="pending">Pending Review</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="accepted">Accepted / Awarded</option>
                            <option value="rejected">Declined</option>
                          </select>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/meetings?room=faculty-${appId}&title=${encodeURIComponent(opp.title + ' Guidance & Review')}`}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-xs"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Live Room</span>
                            </Link>
                            <button
                              onClick={() => setSelectedFacultyProposal({ opp, app })}
                              className="px-3 py-1.5 rounded-lg border border-amber-300 hover:bg-amber-50 text-amber-900 font-bold transition-colors"
                            >
                              Review Dossier
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidate Dossier Modal */}
      {selectedApp && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedApp(null)}
          title={`Candidate Dossier: ${selectedApp.studentName}`}
          subtitle={`${selectedApp.studentInstitute} • ${selectedApp.studentEmail}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Opportunity:</span>
                <span className="font-bold text-slate-900">{selectedApp.opportunityTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Skill Match Score:</span>
                <span className="font-bold text-emerald-700">
                  {selectedApp.skillMatchPercentage !== undefined ? `${selectedApp.skillMatchPercentage}% Compatibility` : 'Evaluation Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Status:</span>
                <Badge status={selectedApp.status} size="sm" />
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-1">Candidate Statement & Experience</h4>
              <p className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 leading-relaxed">
                {selectedApp.coverNote || 'The candidate has submitted a verified profile and demonstrated foundational competency in key domain practices.'}
              </p>
            </div>

            {/* AI Resume & Skill Compatibility Engine */}
            <AiMatchMatrix
              opportunityTitle={selectedApp.opportunityTitle}
              matchScore={selectedApp.skillMatchPercentage ?? 0}
              coverNote={selectedApp.coverNote}
              isRecruiterView={true}
            />

            {/* Quick action buttons in modal */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedApp.id, 'shortlisted')}
                  className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 font-bold hover:bg-purple-100"
                >
                  Shortlist Candidate
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedApp.id, 'interview_scheduled')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100"
                >
                  Schedule Interview
                </button>
                {selectedApp.status === 'interview_scheduled' && (
                  <Link
                    to={`/meetings?room=interview-${selectedApp.id}&title=${encodeURIComponent((selectedApp.opportunityTitle || 'Technical') + ' Interview')}`}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join Virtual Room</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedApp.id, 'offered')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100"
                >
                  Extend Offer
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Faculty Proposal Dossier Modal */}
      {selectedFacultyProposal && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedFacultyProposal(null)}
          title={`Faculty Proposal: ${selectedFacultyProposal.app.facultyName}`}
          subtitle={`${selectedFacultyProposal.app.institution || 'University Faculty'} • ${selectedFacultyProposal.app.facultyEmail}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex justify-between">
                <span className="text-amber-800 font-medium">Immersion / Program:</span>
                <span className="font-bold text-slate-900">{selectedFacultyProposal.opp.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800 font-medium">Program Classification:</span>
                <span className="font-bold text-amber-900">{selectedFacultyProposal.opp.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800 font-medium">Grant / Fellowship:</span>
                <span className="font-bold text-emerald-700">{selectedFacultyProposal.opp.stipendOrGrant}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800 font-medium">Proposal Review Status:</span>
                <span className="font-bold uppercase tracking-wider text-xs px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  {selectedFacultyProposal.app.status}
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-1">Proposed Research Abstract & Plan</h4>
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 leading-relaxed whitespace-pre-line font-mono text-[11px]">
                {selectedFacultyProposal.app.proposalText}
              </div>
            </div>

            {selectedFacultyProposal.app.experience && (
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Academic & Research Background</h4>
                <p className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 leading-relaxed">
                  {selectedFacultyProposal.app.experience}
                </p>
              </div>
            )}

            {selectedFacultyProposal.app.cvLink && (
              <div>
                <a
                  href={selectedFacultyProposal.app.cvLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-blue-600 font-bold hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Institutional NOC / Profile Link</span>
                </a>
              </div>
            )}

            {/* AI Research Synergy & Feasibility Matrix */}
            {(() => {
              const proposalId = selectedFacultyProposal.app.id || (selectedFacultyProposal.app as any)._id;
              const currentSynergy = synergyResults[proposalId];

              return (
                <div className="p-4 bg-gradient-to-br from-indigo-50/70 via-purple-50/60 to-amber-50/60 rounded-2xl border border-indigo-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">AI Research Synergy & Feasibility Matrix</h4>
                        <p className="text-[10px] text-slate-500">Evaluates proposal alignment against corporate R&D goals via Groq LLM</p>
                      </div>
                    </div>

                    {!currentSynergy && (
                      <button
                        type="button"
                        onClick={handleEvaluateSynergy}
                        disabled={evaluatingSynergy}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${evaluatingSynergy ? 'animate-spin' : ''}`} />
                        <span>{evaluatingSynergy ? 'Analyzing...' : '✨ Run AI Synergy Matrix'}</span>
                      </button>
                    )}
                  </div>

                  {synergyError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-xl">
                      {synergyError}
                    </div>
                  )}

                  {currentSynergy && (
                    <div className="space-y-3 pt-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-indigo-100 shadow-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Synergy Score</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-indigo-700">{currentSynergy.synergyScore}%</span>
                            <span className="text-xs font-semibold text-slate-700">{currentSynergy.verdict}</span>
                          </div>
                        </div>
                        <div className="w-full sm:w-32 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              currentSynergy.synergyScore >= 80
                                ? 'bg-emerald-500'
                                : currentSynergy.synergyScore >= 60
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${currentSynergy.synergyScore}%` }}
                          />
                        </div>
                      </div>

                      {currentSynergy.strengths && currentSynergy.strengths.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-700">Identified Strengths & Research Impact:</span>
                          <ul className="space-y-1">
                            {currentSynergy.strengths.map((str, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(currentSynergy.recommendedAction || currentSynergy.industrialFeasibility) && (
                        <div className="p-2.5 bg-amber-50/80 border border-amber-200/60 rounded-xl text-[11px] text-amber-900">
                          <span className="font-bold block mb-0.5">Recruiter Advisory & Feasibility:</span>
                          <span>{currentSynergy.recommendedAction || currentSynergy.industrialFeasibility}</span>
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleEvaluateSynergy}
                          disabled={evaluatingSynergy}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{evaluatingSynergy ? 'Re-evaluating...' : 'Re-run AI Evaluation'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Quick action buttons in modal */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleFacultyStatusChange(
                      selectedFacultyProposal.opp.id,
                      selectedFacultyProposal.app.id || (selectedFacultyProposal.app as any)._id,
                      'shortlisted'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 font-bold hover:bg-purple-100"
                >
                  Shortlist Proposal
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleFacultyStatusChange(
                      selectedFacultyProposal.opp.id,
                      selectedFacultyProposal.app.id || (selectedFacultyProposal.app as any)._id,
                      'accepted'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100"
                >
                  Award Grant / Accept
                </button>
                <Link
                  to={`/meetings?room=faculty-${selectedFacultyProposal.app.id || (selectedFacultyProposal.app as any)._id}&title=${encodeURIComponent(
                    selectedFacultyProposal.opp.title + ' Guidance & Review'
                  )}`}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Launch Live Video Room</span>
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    handleFacultyStatusChange(
                      selectedFacultyProposal.opp.id,
                      selectedFacultyProposal.app.id || (selectedFacultyProposal.app as any)._id,
                      'rejected'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-bold hover:bg-rose-100"
                >
                  Decline
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFacultyProposal(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
