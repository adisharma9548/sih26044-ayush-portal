import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  BookOpen,
  PlusCircle,
  Users,
  Award,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FileCheck
} from 'lucide-react';

interface Enrollee {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  studentInstitution: string;
  studentDepartment: string;
  progressPercent: number;
  isCompleted: boolean;
  completedAt?: string;
  certificateId?: string;
  lessonsCompletedCount: number;
}

export const ManageLearningProgramsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFormat, setFilterFormat] = useState('all');

  // Enrollee Modal state
  const [selectedProgForEnrollees, setSelectedProgForEnrollees] = useState<any | null>(null);
  const [enrolleesLoading, setEnrolleesLoading] = useState(false);
  const [enrolleesData, setEnrolleesData] = useState<{
    program: any;
    enrollees: Enrollee[];
    totalEnrollees: number;
    totalCompleted: number;
  } | null>(null);

  // Deletion Modal state
  const [progToDelete, setProgToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const res = await api.learning.getManaged();
      setPrograms(res.data || []);
    } catch (err) {
      console.error('Failed to load managed learning programs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleOpenEnrollees = async (prog: any) => {
    setSelectedProgForEnrollees(prog);
    setEnrolleesLoading(true);
    try {
      const res = await api.learning.getEnrollees(prog.id || prog._id);
      setEnrolleesData(res.data);
    } catch (err) {
      console.error('Failed to load enrollees:', err);
    } finally {
      setEnrolleesLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!progToDelete) return;
    setDeleting(true);
    try {
      const res = await api.learning.delete(progToDelete.id || progToDelete._id);
      setActionNotice({
        type: 'success',
        message: res.data.message || `Module "${progToDelete.title}" archived successfully. Student certificates preserved.`,
      });
      setProgToDelete(null);
      await fetchPrograms();
      setTimeout(() => setActionNotice(null), 6000);
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Failed to archive program.',
      });
      setTimeout(() => setActionNotice(null), 6000);
    } finally {
      setDeleting(false);
    }
  };

  const filteredPrograms = programs.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ayushDomain?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFormat = filterFormat === 'all' || p.type === filterFormat;
    return matchesSearch && matchesFormat;
  });

  const totalEnrolledAcrossAll = programs.reduce((acc, p) => acc + (p.totalEnrollees || p.enrolledCount || 0), 0);
  const totalCompletedAcrossAll = programs.reduce((acc, p) => acc + (p.completedCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-[11px] font-bold">
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>Corporate & Faculty Curriculum Directorate</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Sponsored Learning Modules & Hands-On Labs
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed">
            Manage your industry-accredited masterclasses, review verified student completion records, and publish new interactive training sandboxes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-10">
          <Link
            to="/industry/post-program"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Sponsor / Post New Module</span>
          </Link>
          <Link
            to="/student/learning"
            target="_blank"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Public Catalog</span>
          </Link>
        </div>
      </div>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in text-xs ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span className="font-semibold">{actionNotice.message}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Modules Published
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-slate-900">{programs.length}</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Enrolled Scholars
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-slate-900">{totalEnrolledAcrossAll}</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Verified Certificates Earned
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-emerald-600">{totalCompletedAcrossAll}</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Completion Ratio
          </span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-amber-600">
              {totalEnrolledAcrossAll > 0
                ? `${Math.round((totalCompletedAcrossAll / totalEnrolledAcrossAll) * 100)}%`
                : '100%'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, domain, provider..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { key: 'all', label: 'All Formats' },
            { key: 'workshop', label: '🛠️ Hands-on Labs' },
            { key: 'course', label: '📖 Self-Paced' },
            { key: 'certification', label: '🎓 Certifications' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterFormat(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filterFormat === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Learning Programs List */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading sponsored learning programs...</p>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Learning Modules Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You have not posted any learning programs matching this criteria yet. Sponsor an interactive hands-on lab or self-paced course to bridge student skill gaps.
          </p>
          <Link
            to="/industry/post-program"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Sponsor First Module</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPrograms.map((prog) => {
            const progId = prog.id || prog._id;
            const completedCount = prog.completedCount || 0;
            const inProgressCount = prog.inProgressCount || 0;
            const totalEnrollees = prog.totalEnrollees || prog.enrolledCount || 0;
            const isArchived = prog.isArchived === true;

            return (
              <div
                key={progId}
                className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                  isArchived ? 'border-rose-200 bg-slate-50/50' : 'border-slate-200/80'
                }`}
              >
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={prog.type === 'workshop' ? 'amber' : prog.type === 'course' ? 'blue' : 'purple'}>
                      {prog.type === 'workshop'
                        ? '🛠️ HANDS-ON LAB'
                        : prog.type === 'course'
                        ? '📖 SELF-PACED COURSE'
                        : '🎓 CERTIFICATION'}
                    </Badge>

                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {prog.level}
                    </span>

                    <span className="text-[11px] font-semibold text-slate-500">
                      {prog.ayushDomain}
                    </span>

                    {isArchived ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Archived / Hidden from Public Catalog</span>
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Live on Curriculum Grid</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {prog.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {prog.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{prog.duration}</span>
                    </div>
                    <div>
                      <span>Provider: </span>
                      <strong className="text-slate-800">{prog.provider}</strong>
                    </div>
                    <div>
                      <span>Fee: </span>
                      <strong className="text-emerald-700 font-bold">{prog.cost}</strong>
                    </div>
                  </div>
                </div>

                {/* Metrics & Actions Column */}
                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-4 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                  {/* Completion Stats Block */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 min-w-[190px] space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-500 text-[11px]">Enrolled:</span>
                      <span className="text-slate-900">{totalEnrollees} scholars</span>
                    </div>
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-emerald-700 text-[11px]">Certified:</span>
                      <span className="text-emerald-700 font-black">{completedCount} completions</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{
                          width: `${totalEnrollees > 0 ? Math.min(100, Math.round((completedCount / totalEnrollees) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 text-right">
                      {inProgressCount} in progress
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleOpenEnrollees(prog)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>View Enrollees & Badges ({totalEnrollees})</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/student/learning/course/${progId}`}
                        target="_blank"
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Preview Workspace</span>
                      </Link>

                      {!isArchived && (
                        <button
                          onClick={() => setProgToDelete(prog)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Delete or Archive Module"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enrollees & Completions Modal */}
      {selectedProgForEnrollees && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedProgForEnrollees(null);
            setEnrolleesData(null);
          }}
          title={`Enrollee & Certification Ledger: ${selectedProgForEnrollees.title}`}
          subtitle={`${selectedProgForEnrollees.provider} • Format: ${selectedProgForEnrollees.type?.toUpperCase()}`}
        >
          <div className="space-y-4">
            {enrolleesLoading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Querying student completion ledger...</p>
              </div>
            ) : !enrolleesData || enrolleesData.enrollees.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">No Scholars Recorded Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Scholars will automatically appear in this ledger as they enroll and progress through the workspace.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="text-slate-600">
                    Total Enrolled: <strong>{enrolleesData.totalEnrollees}</strong>
                  </span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>{enrolleesData.totalCompleted} Certified Scholars</span>
                  </span>
                </div>

                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 pr-1">
                  {enrolleesData.enrollees.map((enrollee) => (
                    <div key={enrollee.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <strong className="font-bold text-slate-900 truncate">
                            {enrollee.studentName}
                          </strong>
                          {enrollee.isCompleted && (
                            <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>CERTIFIED</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {enrollee.studentEmail} • {enrollee.studentInstitution}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${enrollee.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {enrollee.progressPercent}% ({enrollee.lessonsCompletedCount} lessons)
                          </span>
                        </div>
                      </div>

                      {enrollee.certificateId && (
                        <div className="shrink-0 text-right">
                          <span className="text-[10px] text-slate-400 block font-mono">
                            ID: {enrollee.certificateId.slice(0, 10)}...
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold block">
                            Permanent Record
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete / Archive Safeguard Confirmation Modal */}
      {progToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setProgToDelete(null)}
          title={`Archive / Delete Module: ${progToDelete.title}?`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>What happens when you delete this module?</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-amber-800 pl-6 list-disc">
                <li>
                  This module will be immediately removed from the public student catalog, preventing new enrollments.
                </li>
                <li>
                  <strong>CERTIFICATION SAFEGUARD:</strong> Any student who has already completed this module or earned a verified certificate will <strong>KEEP their certification, verifiable credential ID, and portfolio entry permanently</strong>.
                </li>
              </ul>
            </div>

            <p className="text-slate-600">
              Are you sure you want to proceed with archiving <strong>"{progToDelete.title}"</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProgToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Archiving Module...' : 'Confirm Archive & Delete'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
