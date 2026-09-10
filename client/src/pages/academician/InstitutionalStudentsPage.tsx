import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { InstitutionalStudent, StudentDetailedProfileResponse, StudentProject } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  GraduationCap,
  Search,
  Award,
  BookOpen,
  FolderGit2,
  Video,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  FileCheck2,
  MessageSquare,
  Clock,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
  Copy
} from 'lucide-react';

export const InstitutionalStudentsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<InstitutionalStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [metaInfo, setMetaInfo] = useState<{ facultyDomain?: string; facultyInstitution?: string; isEduDomain?: boolean }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'moderate' | 'low'>('all');

  // Dossier Modal State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<StudentDetailedProfileResponse | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [activeDossierTab, setActiveDossierTab] = useState<'scores' | 'projects' | 'credentials'>('scores');

  // Project Assistance Form State
  const [selectedProjectTitle, setSelectedProjectTitle] = useState<string>('');
  const [assistanceType, setAssistanceType] = useState<'guidance' | 'review' | 'endorsement' | 'meeting'>('guidance');
  const [assistanceNotes, setAssistanceNotes] = useState('');
  const [scheduleMeeting, setScheduleMeeting] = useState(false);
  const [submittingAssistance, setSubmittingAssistance] = useState(false);
  const [assistanceSuccessMsg, setAssistanceSuccessMsg] = useState('');
  const [createdMeetingInfo, setCreatedMeetingInfo] = useState<{
    roomId: string;
    meetingUrl: string;
    projectTitle: string;
  } | null>(null);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await api.academician.getInstitutionalStudents();
      setStudents(res.data || []);
      if (res.meta) {
        setMetaInfo(res.meta);
      }
    } catch (err) {
      console.error('Failed to load institutional students:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [user]);

  const handleOpenDossier = async (studentId: string, initialTab: 'scores' | 'projects' | 'credentials' = 'scores') => {
    setSelectedStudentId(studentId);
    setActiveDossierTab(initialTab);
    setLoadingDossier(true);
    setAssistanceSuccessMsg('');
    setCreatedMeetingInfo(null);
    try {
      const res = await api.academician.getStudentDetailedProfile(studentId);
      setDossier(res.data);
      if (res.data.portfolio?.projects?.length > 0) {
        setSelectedProjectTitle(res.data.portfolio.projects[0].title);
      } else {
        setSelectedProjectTitle('');
      }
    } catch (err) {
      console.error('Failed to load student dossier:', err);
    } finally {
      setLoadingDossier(false);
    }
  };

  const handleSubmitAssistance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !assistanceNotes.trim()) return;

    setSubmittingAssistance(true);
    setAssistanceSuccessMsg('');
    try {
      const res = await api.academician.assistStudentProject(selectedStudentId, {
        projectTitle: selectedProjectTitle,
        assistanceType,
        notes: assistanceNotes,
        scheduleMeeting
      });

      setAssistanceSuccessMsg(res.data.message || 'Guidance successfully provided!');
      if (res.data.meetingRoomId) {
        setCreatedMeetingInfo({
          roomId: res.data.meetingRoomId,
          meetingUrl: res.data.meetingUrl || `/meetings?room=${res.data.meetingRoomId}&title=${encodeURIComponent('Project Guidance: ' + selectedProjectTitle)}`,
          projectTitle: selectedProjectTitle,
        });
      } else {
        setCreatedMeetingInfo(null);
      }
      setAssistanceNotes('');
      setScheduleMeeting(false);

      // Refresh dossier
      const updatedDossier = await api.academician.getStudentDetailedProfile(selectedStudentId);
      setDossier(updatedDossier.data);

      // Refresh background students list
      loadStudents();
    } catch (err: any) {
      alert(err.message || 'Failed to submit assistance');
    } finally {
      setSubmittingAssistance(false);
    }
  };

  // Instant 1-Click Launch & Host Guidance Room
  const handleInstantHostRoom = async (projectTitle: string) => {
    if (!selectedStudentId) return;
    setSubmittingAssistance(true);
    try {
      const res = await api.academician.assistStudentProject(selectedStudentId, {
        projectTitle,
        assistanceType: 'meeting',
        notes: `Live 1-on-1 Guidance Session on "${projectTitle}" hosted by faculty mentor.`,
        scheduleMeeting: true,
      });
      if (res.data.meetingRoomId) {
        navigate(`/meetings?room=${res.data.meetingRoomId}&title=${encodeURIComponent('Project Guidance: ' + projectTitle)}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initialize guidance room');
    } finally {
      setSubmittingAssistance(false);
    }
  };

  // Filtering
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.degree?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q) ||
      s.skills?.some((sk) => sk.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    const score = s.skillScore ?? 0;
    if (scoreFilter === 'high') return score >= 75;
    if (scoreFilter === 'moderate') return score >= 50 && score < 75;
    if (scoreFilter === 'low') return score < 50;
    return true;
  });

  const facultyDomain = metaInfo.facultyDomain || user?.email?.split('@')[1] || 'Institutional';

  return (
    <div className="space-y-6">
      {/* Institutional Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-3xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Institutional Faculty Authorization (@{facultyDomain})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Institutional Scholars & Project Guidance Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            As faculty at <strong className="text-white">{user?.institution || 'your affiliated institution'}</strong>, you have authorized academic access to your enrolled students who share your institutional domain (@{facultyDomain}). Review diagnostic assessment scores, audit skill proficiencies, and provide direct research project assistance.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-amber-200">
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <strong>{students.length}</strong> Enrolled Scholars
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg">
              <Award className="w-4 h-4 text-amber-400" />
              <strong>{students.filter((s) => (s.skillScore ?? 0) >= 70).length}</strong> High Skill Scorers
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg">
              <FolderGit2 className="w-4 h-4 text-sky-400" />
              <strong>{students.reduce((acc, s) => acc + (s.projectsCount ?? 0), 0)}</strong> Projects for Guidance
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center text-xs">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scholars by name, degree, roll, or skill..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-slate-400 font-medium whitespace-nowrap">Score Filter:</span>
          {(['all', 'high', 'moderate', 'low'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setScoreFilter(mode)}
              className={`px-3 py-1.5 rounded-xl font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
                scoreFilter === mode
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {mode === 'all' ? 'All Scholars' : `${mode} Scores`}
            </button>
          ))}
        </div>
      </div>

      {/* Student Cards Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm animate-pulse">
          Querying institutional scholars matching @{facultyDomain}...
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs space-y-3">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Institutional Scholars Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'No scholars matched your current search filters.'
              : `No registered students currently hold the institutional domain @${facultyDomain} or match ${user?.institution}. As students register with their university email, they will automatically appear here for academic guidance.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudents.map((student) => {
            const score = student.skillScore ?? 0;
            const scoreColor =
              score >= 75
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                : score >= 50
                ? 'text-amber-700 bg-amber-50 border-amber-200'
                : 'text-slate-700 bg-slate-50 border-slate-200';

            return (
              <div
                key={student.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Student Top Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-800 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                        {student.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{student.name}</h3>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{student.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                      .edu.in
                    </span>
                  </div>

                  {/* Academic Info */}
                  <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                    <p className="font-semibold text-slate-800">
                      {student.degree || 'Degree In Progress'}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      {student.department || 'Department'}{student.graduationYear ? ` • Class of ${student.graduationYear}` : ''}
                    </p>
                  </div>

                  {/* Diagnostic Skill Score Card */}
                  <div className={`rounded-xl p-3 border ${scoreColor} flex items-center justify-between text-xs`}>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                        Diagnostic Assessment
                      </span>
                      <div className="text-lg font-extrabold">{score} / 100</div>
                    </div>
                    <div className="text-right text-[11px]">
                      {student.rankPercentile ? (
                        <span className="font-bold">Top {100 - student.rankPercentile}% Percentile</span>
                      ) : (
                        <span className="opacity-75">Evaluated</span>
                      )}
                      <p className="text-[10px] opacity-75">{student.assessedSkillsCount ?? 0} Verified Skills</p>
                    </div>
                  </div>

                  {/* Projects Snapshot */}
                  <div className="text-xs text-slate-600 flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5 font-medium">
                      <FolderGit2 className="w-3.5 h-3.5 text-sky-600" />
                      <span>{student.projectsCount ?? 0} Active Project{(student.projectsCount ?? 0) === 1 ? '' : 's'}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {student.certificatesCount ?? 0} Certificates
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenDossier(student.id, 'scores')}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenDossier(student.id, 'projects')}
                    className="py-2 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                    title="Assist on Project"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Assist</span>
                  </button>
                  <button
                    onClick={() => handleOpenDossier(student.id, 'projects')}
                    className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                    title="Start Live Guidance Room"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Host Room</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Comprehensive Student Dossier & Project Guidance Modal */}
      {selectedStudentId && (
        <Modal
          isOpen={!!selectedStudentId}
          onClose={() => {
            setSelectedStudentId(null);
            setDossier(null);
          }}
          title="Institutional Scholar Dossier & Academic Oversight"
          maxWidth="2xl"
        >
          {loadingDossier || !dossier ? (
            <div className="py-16 text-center text-slate-400 text-sm animate-pulse">
              Loading comprehensive academic record & projects...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dossier Header */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-800 text-white font-extrabold flex items-center justify-center text-lg shadow-sm shrink-0">
                    {dossier.student.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{dossier.student.name}</h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {dossier.institutionalDomainMatched || 'Verified Domain'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{dossier.student.email}</p>
                    <p className="text-xs text-slate-700 font-medium mt-0.5">
                      {dossier.student.degree} • {dossier.student.department || 'Academic Department'}
                    </p>
                  </div>
                </div>

                {/* Score Header Widget */}
                <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs text-center shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Diagnostic Score</span>
                  <div className="text-xl font-extrabold text-emerald-700">
                    {dossier.skillProfile?.overallScore ?? 0} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                  </div>
                </div>
              </div>

              {/* Dossier Tabs */}
              <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
                <button
                  onClick={() => setActiveDossierTab('scores')}
                  className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeDossierTab === 'scores'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Diagnostic Scores & Skill Radar</span>
                </button>
                <button
                  onClick={() => setActiveDossierTab('projects')}
                  className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeDossierTab === 'projects'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FolderGit2 className="w-4 h-4" />
                  <span>Projects & Research Assistance ({dossier.portfolio?.projects?.length ?? 0})</span>
                </button>
                <button
                  onClick={() => setActiveDossierTab('credentials')}
                  className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeDossierTab === 'credentials'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Verified Credentials ({dossier.portfolio?.certificates?.length ?? 0})</span>
                </button>
              </div>

              {/* Tab 1: Diagnostic Scores & Skill Gaps */}
              {activeDossierTab === 'scores' && (
                <div className="space-y-6">
                  {/* Score breakdown metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4">
                      <span className="text-[11px] font-bold text-emerald-900 uppercase">Assessment Score</span>
                      <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                        {dossier.skillProfile?.overallScore ?? 0} %
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-1">
                        Rank Percentile: {dossier.skillProfile?.rankPercentile ? `Top ${100 - dossier.skillProfile.rankPercentile}%` : 'Standard'}
                      </p>
                    </div>

                    <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4">
                      <span className="text-[11px] font-bold text-blue-900 uppercase">Verified Skills</span>
                      <div className="text-2xl font-extrabold text-blue-700 mt-1">
                        {dossier.skillProfile?.skills?.length ?? 0}
                      </div>
                      <p className="text-[11px] text-blue-800 mt-1">
                        Assessed against UGC benchmarks
                      </p>
                    </div>

                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
                      <span className="text-[11px] font-bold text-amber-900 uppercase">Identified Gaps</span>
                      <div className="text-2xl font-extrabold text-amber-700 mt-1">
                        {dossier.skillProfile?.gapAnalysis?.length ?? 0}
                      </div>
                      <p className="text-[11px] text-amber-800 mt-1">
                        Recommended for faculty guidance
                      </p>
                    </div>
                  </div>

                  {/* Skills List with Progress */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Skill Proficiency vs Industry Benchmark</span>
                    </h4>
                    {dossier.skillProfile?.skills && dossier.skillProfile.skills.length > 0 ? (
                      <div className="space-y-2.5">
                        {dossier.skillProfile.skills.map((skill, i) => (
                          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs">
                            <div className="flex justify-between items-center mb-1.5 font-medium">
                              <span className="text-slate-800 font-semibold">{skill.name}</span>
                              <span className="text-slate-500">{skill.level}% (Benchmark: {skill.industryBenchmark}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-emerald-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(100, skill.level)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl">
                        No individual skills evaluated yet. Encourage scholar to take the Skill Diagnostic Assessment.
                      </p>
                    )}
                  </div>

                  {/* Skill Gap Analysis */}
                  {dossier.skillProfile?.gapAnalysis && dossier.skillProfile.gapAnalysis.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>High-Priority Skill Gaps for Faculty Mentorship</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {dossier.skillProfile.gapAnalysis.map((gap, i) => (
                          <div key={i} className="bg-amber-50/50 border border-amber-200 rounded-xl p-3 text-xs">
                            <div className="flex justify-between items-center font-bold text-amber-900">
                              <span>{gap.skill}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-200/80 uppercase">
                                {gap.priority} Priority
                              </span>
                            </div>
                            <p className="text-slate-600 mt-1 text-[11px]">
                              Current level: {gap.currentLevel}% • Required: {gap.requiredLevel}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Study Advice / Roadmap Diagnostics */}
                  {dossier.student.studyRoadmap?.studyAdvice && (
                    <div className="bg-slate-900 text-white rounded-2xl p-4 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-[11px]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Diagnostic Assessment Guidance</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        {dossier.student.studyRoadmap.studyAdvice}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Projects & Faculty Assistance */}
              {activeDossierTab === 'projects' && (
                <div className="space-y-6">
                  {/* Guidance & Hosting Explanation Banner */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 text-xs space-y-2 border border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-[11px]">
                      <Video className="w-4 h-4" />
                      <span>How Live Guidance Rooms & Hosting Work</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      As faculty, you are the designated <strong>Live Session Host</strong> for your institutional scholars. Clicking <em>Host Guidance Meeting</em> or creating a scheduled room instantly launches your secure, unlimited WebRTC conference room (equipped with video, audio, interactive whiteboard, shared code notes, and chat). A priority notification with a 1-click join link is delivered immediately to {dossier.student.name} ({dossier.student.email}).
                    </p>
                  </div>

                  {/* Active Guidance Room Banner (if just created) */}
                  {createdMeetingInfo && (
                    <div className="p-4 rounded-2xl bg-emerald-700 text-white shadow-md space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Video className="w-5 h-5 text-emerald-200 animate-pulse" />
                          <span className="font-bold text-sm">Live Video Guidance Room Created & Ready!</span>
                        </div>
                        <span className="text-[11px] font-mono bg-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-600">
                          Room: {createdMeetingInfo.roomId}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-100 leading-relaxed">
                        You are the faculty host. A direct join notification has been dispatched to <strong>{dossier.student.name}</strong> ({dossier.student.email}).
                      </p>
                      <div className="pt-1 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => navigate(createdMeetingInfo.meetingUrl)}
                          className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-all hover:scale-105"
                        >
                          <Video className="w-4 h-4 text-emerald-700" />
                          <span>🎥 Enter & Host Guidance Room Now</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.origin + createdMeetingInfo.meetingUrl);
                            alert('Meeting join link copied to clipboard!');
                          }}
                          className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-emerald-100 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-emerald-600"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Join Link</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(createdMeetingInfo.roomId);
                            alert(`Room Code copied: ${createdMeetingInfo.roomId}`);
                          }}
                          className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-emerald-100 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-emerald-600 font-mono"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Room Code</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Assistance Form */}
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                      <h4 className="text-sm font-bold text-emerald-950">
                        Provide Faculty Assistance on Scholar Project
                      </h4>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Your mentorship and reviews are officially stamped with your institutional credentials. The student will receive a real-time notification and see your feedback on their verified digital portfolio.
                    </p>

                    {assistanceSuccessMsg && !createdMeetingInfo && (
                      <div className="p-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{assistanceSuccessMsg}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmitAssistance} className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Target Student Project:
                          </label>
                          <select
                            value={selectedProjectTitle}
                            onChange={(e) => setSelectedProjectTitle(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                          >
                            {dossier.portfolio?.projects && dossier.portfolio.projects.length > 0 ? (
                              dossier.portfolio.projects.map((p, idx) => (
                                <option key={idx} value={p.title}>
                                  {p.title}
                                </option>
                              ))
                            ) : (
                              <option value="Academic Research Project">Academic Research Project</option>
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Assistance Nature:
                          </label>
                          <select
                            value={assistanceType}
                            onChange={(e) => setAssistanceType(e.target.value as any)}
                            className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="guidance">Academic Guidance & Next Steps</option>
                            <option value="review">Code & Methodology Review</option>
                            <option value="endorsement">Faculty Academic Endorsement</option>
                            <option value="meeting">1-on-1 Guidance Meeting</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Faculty Guidance Notes / Feedback:
                        </label>
                        <textarea
                          rows={3}
                          value={assistanceNotes}
                          onChange={(e) => setAssistanceNotes(e.target.value)}
                          placeholder="Provide specific technical advice, recommended research papers, architecture fixes, or next steps for the scholar..."
                          className="w-full p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="scheduleMeeting"
                          checked={scheduleMeeting}
                          onChange={(e) => setScheduleMeeting(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <label htmlFor="scheduleMeeting" className="font-semibold text-slate-700 cursor-pointer">
                          Automatically schedule 1-on-1 Live Video Guidance Session (WebRTC)
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingAssistance}
                        className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{submittingAssistance ? 'Recording Assistance...' : 'Submit Faculty Assistance'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Student Projects List */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Scholar Research & Development Projects ({dossier.portfolio?.projects?.length ?? 0})
                    </h4>

                    {dossier.portfolio?.projects && dossier.portfolio.projects.length > 0 ? (
                      <div className="space-y-4">
                        {dossier.portfolio.projects.map((project, idx) => (
                          <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-slate-900 text-sm">{project.title}</h5>
                                <p className="text-xs text-slate-500">
                                  Role: <span className="font-medium text-slate-700">{project.role}</span> • {project.startDate} - {project.endDate}
                                </p>
                              </div>
                              {project.link && (
                                <a
                                  href={project.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-bold"
                                >
                                  <span>Repository / Live Link</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">{project.description}</p>

                            {/* Tech Badges */}
                            {project.technologies && project.technologies.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {project.technologies.map((tech, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
                                  >
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Quick Action Bar on Project */}
                            <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleInstantHostRoom(project.title)}
                                disabled={submittingAssistance}
                                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                title="Instantly launch and host a live video conference with scholar"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>🎥 Host Guidance Meeting</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProjectTitle(project.title);
                                  setAssistanceType('guidance');
                                }}
                                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Write Feedback</span>
                              </button>
                            </div>

                            {/* Faculty Assistance History on this Project */}
                            {project.assistance && project.assistance.length > 0 && (
                              <div className="pt-3 border-t border-slate-100 space-y-2">
                                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Faculty Guidance Logged</span>
                                </span>
                                <div className="space-y-2">
                                  {project.assistance.map((asst, aIdx) => (
                                    <div key={aIdx} className="bg-emerald-50/80 border border-emerald-200/60 rounded-xl p-3 text-xs space-y-1.5">
                                      <div className="flex justify-between items-center text-[11px] font-semibold text-emerald-900">
                                        <span>{asst.facultyName} ({asst.assistanceType.toUpperCase()})</span>
                                        <span className="text-slate-400 font-normal">
                                          {new Date(asst.createdAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <p className="text-slate-700 leading-relaxed">{asst.notes}</p>
                                      {asst.meetingRoomId && (
                                        <div className="pt-1">
                                          <button
                                            type="button"
                                            onClick={() => navigate(`/meetings?room=${asst.meetingRoomId}&title=${encodeURIComponent('Project Guidance: ' + project.title)}`)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs cursor-pointer transition-colors"
                                          >
                                            <Video className="w-3.5 h-3.5" />
                                            <span>🎥 Enter / Host Guidance Room</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 bg-slate-50 p-6 rounded-xl text-center">
                        No projects submitted yet by this scholar.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Credentials */}
              {activeDossierTab === 'credentials' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Verified Digital Certificates & Qualifications ({dossier.portfolio?.certificates?.length ?? 0})
                  </h4>

                  {dossier.portfolio?.certificates && dossier.portfolio.certificates.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dossier.portfolio.certificates.map((cert, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5 shadow-xs">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-bold text-slate-900 line-clamp-1">{cert.title}</h5>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                              Verified
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px]">Issuer: {cert.issuer} • {cert.issueDate}</p>
                          {cert.credentialUrl && (
                            <a
                              href={cert.credentialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 text-[11px] font-bold inline-flex items-center gap-1 hover:underline pt-1"
                            >
                              <span>View Digital Credential</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 bg-slate-50 p-6 rounded-xl text-center">
                      No certificates registered yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
