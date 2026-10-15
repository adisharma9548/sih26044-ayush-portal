import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { IInstitutionAnalytics } from '../../types';
import {
  Building,
  Users,
  Award,
  TrendingUp,
  Briefcase,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Edit,
  GraduationCap,
  MapPin,
  Mail,
  Globe,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const InstitutionDashboardPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<IInstitutionAnalytics | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editAbout, setEditAbout] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [analyticsRes, studentsRes] = await Promise.all([
          api.institution.dashboard.getAnalytics(),
          api.institution.dashboard.getStudents(),
        ]);

        if (analyticsRes.data) {
          setAnalytics(analyticsRes.data);
          setEditAbout(analyticsRes.data.college?.about || '');
        }
        if (studentsRes.data) {
          setStudents(studentsRes.data);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load institutional dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.institution.dashboard.updateProfile({ about: editAbout });
      if (analytics) {
        setAnalytics({
          ...analytics,
          college: { ...analytics.college, about: editAbout },
        });
      }
      setEditModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const departments = ['All', ...Array.from(new Set(students.map((s) => s.department).filter(Boolean)))];

  const filteredStudents = students.filter((s) => {
    const matchesDept = selectedDepartment === 'All' || s.department === selectedDepartment;
    const matchesSearch =
      !studentSearch ||
      s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email?.toLowerCase().includes(studentSearch.toLowerCase());
    return matchesDept && matchesSearch;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-emerald-600 mb-3" />
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Loading Institutional Analytics...
        </h2>
        <p className="text-xs text-slate-500">Querying real student rosters and verified competency profiles</p>
      </div>
    );
  }

  if (!analytics && errorMessage) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
          <Building className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-amber-900 dark:text-amber-200">Institution Not Linked</h2>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-2 max-w-lg mx-auto">{errorMessage}</p>
        </div>
      </div>
    );
  }

  const { college, metrics, departmentBreakdown, topSkills, laggingSkills, recentAssessments } = analytics || ({} as any);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* College Identity Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/80 text-emerald-100 backdrop-blur-sm">
                {college?.type || 'Higher Education Institution'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                {college?.verificationStatus || 'VERIFIED'}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{college?.name}</h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-100/90 pt-1">
              {(college?.city || college?.state) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[college.city, college.district, college.state].filter(Boolean).join(', ')}
                </span>
              )}
              {college?.contact?.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {college.contact.email}
                </span>
              )}
              {college?.contact?.website && (
                <a
                  href={college.contact.website.startsWith('http') ? college.contact.website : `https://${college.contact.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:underline text-emerald-200"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Official Portal
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          <button
            onClick={() => setEditModalOpen(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 flex items-center gap-1.5 transition-colors self-start md:self-auto"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Enrolled Students</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {metrics?.totalStudents || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Real authenticated accounts</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Assessed Students</span>
            <Award className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {metrics?.assessedStudents || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{metrics?.assessmentParticipationRate || 0}% participation rate</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Average Skill Score</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {metrics?.averageSkillScore || 0}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Institutional skill index</div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Placement Ready</span>
            <Briefcase className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {metrics?.placementReadyCount || 0}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {metrics?.placementReadinessRate || 0}% scoring ≥ 70%
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Departments</span>
            <GraduationCap className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {departmentBreakdown?.length || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Academic disciplines</div>
        </div>
      </div>

      {/* Two Column Grid: Top Institutional Strengths & Lagging Competency Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Strengths */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Top Institutional Competencies
          </h2>
          <p className="text-xs text-slate-500 mb-4">Leading skills assessed across your student body</p>

          <div className="space-y-3">
            {(topSkills || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No assessed student competencies yet.</p>
            ) : (
              topSkills.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{s.name}</div>
                    <div className="text-[11px] text-slate-500">{s.studentCount} students assessed</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      {s.averageProficiency}%
                    </span>
                    <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${s.averageProficiency}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lagging Skill Gaps */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Priority Departmental Skill Gaps
          </h2>
          <p className="text-xs text-slate-500 mb-4">Competencies requiring faculty workshops or bridge training</p>

          <div className="space-y-3">
            {(laggingSkills || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No urgent institutional skill gaps detected.</p>
            ) : (
              laggingSkills.map((g: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{g.name}</div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400">{g.studentsAffected} students lagging behind benchmark</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                      {g.averageGapPercentage}% Gap
                    </span>
                    <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, g.averageGapPercentage)}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Academic Department Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Department / Discipline</th>
                <th className="p-3">Enrolled</th>
                <th className="p-3">Assessed</th>
                <th className="p-3">Participation</th>
                <th className="p-3">Average Skill Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(departmentBreakdown || []).map((d: any, idx: number) => {
                const partRate = d.studentCount > 0 ? Math.round((d.assessedCount / d.studentCount) * 100) : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{d.department}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{d.studentCount}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{d.assessedCount}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{partRate}%</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{d.averageScore}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Affiliated Student Roster */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Institutional Student Roster</h2>
            <p className="text-xs text-slate-500">Real students affiliated with your institution</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students..."
                className="pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs w-52"
              />
            </div>

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Student Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Department</th>
                <th className="p-3">Degree</th>
                <th className="p-3">Overall Score</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No affiliated students found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => (
                  <tr key={st._id || st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{st.name}</td>
                    <td className="p-3 text-slate-500">{st.email}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{st.department || '—'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{st.degree || '—'}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {st.overallScore !== null && st.overallScore !== undefined ? `${st.overallScore}%` : '—'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          st.assessmentStatus === 'current'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {st.assessmentStatus || 'not_assessed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Institutional Information</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Institutional Overview (About)
              </label>
              <textarea
                rows={5}
                value={editAbout}
                onChange={(e) => setEditAbout(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Save Updates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstitutionDashboardPage;
