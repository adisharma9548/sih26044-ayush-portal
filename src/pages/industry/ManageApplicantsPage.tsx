import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Application, ApplicationStatus } from '../../types';
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
  Video
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

export const ManageApplicantsPage: React.FC = () => {
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Selected applicant preview modal
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [interviewDateInput, setInterviewDateInput] = useState('2026-09-18 10:30 AM IST');
  const [statusUpdatedToast, setStatusUpdatedToast] = useState('');

  useEffect(() => {
    const fetchApplicants = async () => {
      setLoading(true);
      const companyQuery = user?.institution || user?.name || '';
      const res = await api.applications.getCompanyApplicants(companyQuery);
      setApplicants(res.data || []);
      setLoading(false);
    };
    fetchApplicants();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
            TALENT RECRUITMENT PIPELINE
          </span>
          <span className="text-xs text-slate-400">Total Applicants: {applicants.length}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Manage Candidate Applications
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review verified skill matches, schedule technical interviews, and issue offer letters
        </p>
      </div>

      {statusUpdatedToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusUpdatedToast}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, college, or position..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Pipeline Stages</option>
              <option value="applied">Applied</option>
              <option value="in_review">Under Review</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview_scheduled">Interview Scheduled</option>
              <option value="offered">Offer Extended</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applicants Table */}
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
                  <td colSpan={6} className="py-12 text-center text-slate-400">Loading candidate roster...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">No applicants match this criteria.</td>
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
                <span className="font-bold text-emerald-700">{selectedApp.skillMatchPercentage || 88}% Compatibility</span>
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
              matchScore={selectedApp.skillMatchPercentage || 88}
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
    </div>
  );
};
