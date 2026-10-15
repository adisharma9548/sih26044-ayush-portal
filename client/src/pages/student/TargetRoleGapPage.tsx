import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ICareerRole, IResume } from '../../types';
import {
  Briefcase,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  BookOpen,
  ArrowRight,
  Sparkles,
  Loader2,
  TrendingUp,
  Target,
  FileText,
  RefreshCw,
  Plus,
  Award,
} from 'lucide-react';

export const TargetRoleGapPage: React.FC = () => {
  const navigate = useNavigate();

  const [roles, setRoles] = useState<ICareerRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<ICareerRole | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loadingRoles, setLoadingRoles] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeResume, setActiveResume] = useState<IResume | null>(null);
  const [resumeMetadata, setResumeMetadata] = useState<any>(null);

  // Fetch student's verified resume
  useEffect(() => {
    async function loadResume() {
      try {
        const res = await api.resumes.getMyResume();
        if (res.data) {
          setActiveResume(res.data);
        }
      } catch {
        // No resume uploaded yet
      }
    }
    loadResume();
  }, []);

  // Fetch available career roles
  useEffect(() => {
    async function loadRoles() {
      setLoadingRoles(true);
      try {
        const res = await api.careerRoles.getAll();
        const roleData = res.data || [];
        setRoles(roleData);
        if (roleData.length > 0) {
          const hasRec = roleData.some((r: any) => r.recommended);
          if (hasRec) {
            setSelectedCategory('Recommended');
            const firstRec = roleData.find((r: any) => r.recommended);
            setSelectedRole(firstRec || roleData[0]);
          } else {
            setSelectedRole(roleData[0]);
          }
        } else {
          setSelectedRole(null);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load career roles.');
      } finally {
        setLoadingRoles(false);
      }
    }
    loadRoles();
  }, []);

  // Run gap analysis when selected role changes
  useEffect(() => {
    if (!selectedRole) return;
    async function runGapAnalysis() {
      setAnalyzing(true);
      setErrorMessage('');
      try {
        const isOpp = (selectedRole as any)?.isOpportunity;
        const oppId = isOpp ? ((selectedRole as any)?.opportunityId || selectedRole?.id) : undefined;
        const roleId = !isOpp ? (selectedRole?.id || (selectedRole as any)?._id) : undefined;
        const res = await api.careerRoles.analyzeGap(roleId, selectedRole?.slug, oppId);
        if (res.data?.analysis) {
          setAnalysisResult(res.data.analysis);
        }
        if (res.data?.resumeMetadata) {
          setResumeMetadata(res.data.resumeMetadata);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to compute skill gap analysis.');
      } finally {
        setAnalyzing(false);
      }
    }
    runGapAnalysis();
  }, [selectedRole]);

  const hasRecommended = roles.some((r: any) => r.recommended);
  const dynamicCategories = Array.from(new Set(roles.map((r) => r.category))).filter((c) => c !== 'Recommended');
  const categories = [
    ...(hasRecommended ? ['Recommended'] : []),
    'All',
    ...dynamicCategories,
  ];

  const filteredRoles = selectedCategory === 'All'
    ? roles
    : selectedCategory === 'Recommended'
    ? roles.filter((r: any) => r.recommended)
    : roles.filter((r) => r.category === selectedCategory);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              COMPETENCY BENCHMARK ENGINE
            </span>
            <span className="text-xs text-slate-400">Industry & Framework Opportunities</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Target Career Role & Skill Gap Analysis
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evaluate your authentic evaluated skills against live industry employer opportunities and national competency frameworks
          </p>
        </div>

        {/* Step Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200/80 rounded-2xl shadow-xs self-start sm:self-auto">
          <button
            onClick={() => navigate('/student/resume')}
            className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Step 1: Resume & Skills</span>
          </button>
          <button
            onClick={() => navigate('/student/target-role')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Step 2: Target Role Gap</span>
          </button>
        </div>
      </div>

      {/* Active Resume & Competency Source Banner */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {activeResume?.originalFilename || 'No Resume Document on File'}
              </h3>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  activeResume
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {activeResume ? 'Resume Document Synchronized' : 'No Resume on File'}
              </span>
              {resumeMetadata?.fieldOfStudy && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {resumeMetadata.fieldOfStudy}
                </span>
              )}
              {hasRecommended && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  Tailored to Your Academic Profile
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              {activeResume
                ? 'Target career roles and active industry postings are dynamically curated for your academic background and verified skills.'
                : 'Upload your CV or resume in Step 1 to automatically personalize opportunities and competency benchmarking.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/student/resume')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {activeResume ? 'Update Resume Document' : 'Upload Resume Document'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === cat
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {cat === 'Recommended' ? (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Recommended
              </span>
            ) : (
              cat
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Role Selector */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Select Career Profile ({filteredRoles.length})
          </h2>

          {loadingRoles ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              <p className="text-xs text-slate-500">Loading benchmark roles...</p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
              <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No postings found</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {selectedCategory === 'Recommended'
                  ? 'No personalized recommendations yet for this category. Switch to "All" to view all live postings.'
                  : 'Check back as employers post new opportunities.'}
              </p>
            </div>
          ) : (
            filteredRoles.map((r) => {
              const isSelected = selectedRole?.slug === r.slug;
              return (
                <div
                  key={r.slug}
                  onClick={() => setSelectedRole(r)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500/20'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100/80 truncate">
                      {r.category}
                    </span>
                    {r.recommended ? (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                        <Sparkles className="w-2.5 h-2.5" />
                        Recommended
                      </span>
                    ) : r.isOpportunity ? (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full truncate max-w-[130px] shrink-0">
                        {r.company || 'Live Opportunity'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                        {r.source?.replace('_', ' ') || 'Framework'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-2">{r.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{r.description}</p>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      <span className="font-semibold text-slate-700">{r.requiredSkills?.length || 0}</span> required competencies
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        Active <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Comparative Analysis */}
        <div className="lg:col-span-8 space-y-6">
          {selectedRole ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              {/* Role Header Banner */}
              <div className="border-b border-slate-100 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    {selectedRole.isOpportunity ? (
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          Live {selectedRole.type === 'internship' ? 'Internship' : 'Job'} Posting
                        </span>
                        <span className="text-xs font-semibold text-slate-700">{selectedRole.company}</span>
                        {selectedRole.location && (
                          <span className="text-xs text-slate-400">&bull; {selectedRole.location}</span>
                        )}
                        {(selectedRole.stipend || selectedRole.salary) && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            {selectedRole.stipend || selectedRole.salary}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                          {selectedRole.category}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">&bull; Source: National Benchmark Framework</span>
                      </div>
                    )}
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedRole.name}</h2>
                  </div>

                  {analysisResult && (
                    <div className="flex items-center gap-3 bg-emerald-50/70 border border-emerald-200/80 px-4 py-2.5 rounded-2xl">
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overall Match</div>
                        <div className="text-2xl font-black text-emerald-700">
                          {analysisResult.overallCompatibility}%
                        </div>
                      </div>
                      <div className="w-11 h-11 rounded-full border-4 border-emerald-500 bg-white flex items-center justify-center font-bold text-xs text-emerald-700 shadow-xs">
                        {analysisResult.overallCompatibility}%
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-3 leading-relaxed">{selectedRole.description}</p>
              </div>

              {/* Analysis States */}
              {analyzing ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
                  <div className="text-sm font-semibold text-slate-800">
                    Comparing evaluated skills against role benchmarks...
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Executing mathematical fulfillment matrix</div>
                </div>
              ) : analysisResult ? (
                <div className="space-y-6">
                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950">
                      <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Matched
                      </div>
                      <div className="text-2xl font-black text-emerald-950 mt-1">
                        {analysisResult.matchingSkills?.length || 0}
                      </div>
                      <div className="text-[11px] text-emerald-700 mt-0.5">Meets or exceeds benchmark</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-950">
                      <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        Partial Gap
                      </div>
                      <div className="text-2xl font-black text-amber-950 mt-1">
                        {analysisResult.partialSkills?.length || 0}
                      </div>
                      <div className="text-[11px] text-amber-700 mt-0.5">Competent, bridge needed</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-rose-950">
                      <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                        <XCircle className="w-4 h-4 text-rose-500" />
                        Missing
                      </div>
                      <div className="text-2xl font-black text-rose-950 mt-1">
                        {analysisResult.missingSkills?.length || 0}
                      </div>
                      <div className="text-[11px] text-rose-700 mt-0.5">Unassessed prerequisites</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-900">
                      <div className="flex items-center gap-2 text-slate-700 text-xs font-bold">
                        <TrendingUp className="w-4 h-4 text-slate-500" />
                        Total Target
                      </div>
                      <div className="text-2xl font-black text-slate-900 mt-1">
                        {selectedRole.requiredSkills?.length || 0}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Core role competencies</div>
                    </div>
                  </div>

                  {/* Explainable Breakdown List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Detailed Competency Breakdown
                    </h3>

                    {(analysisResult.gapAnalysisList || []).map((item: any, idx: number) => {
                      const isMatched = item.status === 'MATCHED';
                      const isPartial = item.status === 'PARTIAL';
                      const isMissing = item.status === 'MISSING';

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                            isMatched
                              ? 'border-emerald-200/80 bg-emerald-50/30'
                              : isPartial
                              ? 'border-amber-200/80 bg-amber-50/30'
                              : 'border-slate-200/80 bg-white hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                              {isPartial && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
                              {isMissing && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                              <span className="text-sm font-bold text-slate-900">{item.skill}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isMatched
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isPartial
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-xs font-semibold text-slate-700">
                                Current: <span className="font-bold text-slate-900">{item.currentLevel}%</span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Required: {item.requiredLevel !== null ? `${item.requiredLevel}%` : 'N/A'}
                              </div>
                            </div>

                            {item.recommendedProgramId ? (
                              <button
                                onClick={() => navigate('/student/learning')}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                Bridge
                              </button>
                            ) : isMissing ? (
                              <button
                                onClick={() => navigate('/student/assessment')}
                                title="Calibrate this competency via diagnostic assessment"
                                className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
                              >
                                <Award className="w-3.5 h-3.5 text-emerald-600" />
                                Evaluate
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation summary note */}
                  <div className="p-5 bg-gradient-to-r from-emerald-50/90 to-teal-50/60 rounded-2xl border border-emerald-200/80 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        AI Diagnostics Assessment Recommendation
                      </div>
                      <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                        {analysisResult.explanation}
                      </p>
                      <button
                        onClick={() => navigate('/student/assessment')}
                        className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
                      >
                        Launch Adaptive Skill Evaluation
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : !loadingRoles ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 shadow-xs text-center">
              <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Select an Opportunity or Career Role</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Choose any active employer listing or benchmark standard from the left to compute your personalized skill gap analysis.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TargetRoleGapPage;
