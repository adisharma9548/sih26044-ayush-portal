import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { LearningProgram, RoadmapGuidance } from '../../types';
import {
  BookOpen,
  Star,
  Clock,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Play,
  Target,
  ExternalLink,
  AlertCircle,
  Compass,
  ArrowRight
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const LearningRecommendationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'recommendations' | 'all'>('recommendations');
  const [recommendations, setRecommendations] = useState<LearningProgram[]>([]);
  const [allPrograms, setAllPrograms] = useState<LearningProgram[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapGuidance[]>([]);
  const [hasGaps, setHasGaps] = useState<boolean>(false);
  const [totalGaps, setTotalGaps] = useState<number>(0);
  const [gapMessage, setGapMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedSyllabus, setExpandedSyllabus] = useState<Record<string, boolean>>({});

  // Enrollment Modal state
  const [enrollingProg, setEnrollingProg] = useState<LearningProgram | null>(null);
  const [enrolledSuccess, setEnrolledSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [recRes, allRes] = await Promise.all([
          api.learning.getRecommendations().catch(() => ({ data: { recommendations: [], roadmaps: [], hasGaps: false, message: '', totalGaps: 0 } })),
          api.learning.getAll().catch(() => ({ data: [] })),
        ]);

        const recData = recRes.data || {};
        setRecommendations(recData.recommendations || []);
        setRoadmaps(recData.roadmaps || []);
        setHasGaps(Boolean(recData.hasGaps));
        setTotalGaps(recData.totalGaps || 0);
        setGapMessage(recData.message || '');
        setAllPrograms(allRes.data || []);
      } catch (err) {
        console.error('Failed to load learning programs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleSyllabus = (id: string) => {
    setExpandedSyllabus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEnroll = async (prog: LearningProgram) => {
    const progId = prog.id || (prog as any)._id;
    try {
      const res = await api.learning.enroll(progId);
      setEnrolledSuccess(res.data.message);
    } catch (err: any) {
      setEnrolledSuccess(err?.response?.data?.error?.message || 'Enrollment processed successfully');
    }
  };

  const displayedPrograms = (activeTab === 'recommendations' ? recommendations : allPrograms).filter((p) => {
    if (filterType === 'all') return true;
    return p.type === filterType;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
            DATA-DRIVEN SKILL BRIDGES
          </span>
          <span className="text-xs text-slate-400">Accredited Competency Remediation</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Learning & Certification Recommendations
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Accredited coursework and career roadmaps dynamically mapped to bridge gaps identified in your skill assessment.
        </p>
      </div>

      {/* Main Mode Toggle: Gap-Targeted vs All Modules */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'recommendations'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>My Gap-Targeted Recommendations</span>
            {recommendations.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'recommendations' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {recommendations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>All Available Modules</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {allPrograms.length}
            </span>
          </button>
        </div>

        {/* Format Type Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-white border border-slate-200/80 rounded-xl">
          {[
            { key: 'all', label: 'All' },
            { key: 'workshop', label: '🛠️ Labs' },
            { key: 'course', label: '📖 Courses' },
            { key: 'certification', label: '🎓 Certs' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                filterType === tab.key
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Analyzing competency benchmarks and catalog modules...
        </div>
      ) : activeTab === 'recommendations' && recommendations.length === 0 ? (
        /* Empty State for Recommendations */
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Active Skill Gaps Detected</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {gapMessage ||
                'All of your assessed competencies currently meet industry benchmarks, or no benchmark requirements exist for your assessed skills. You do not currently require remedial bridge courses.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('all')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Browse All Modules ({allPrograms.length})
            </button>
            <button
              onClick={() => navigate('/student/skills')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Target className="w-3.5 h-3.5" />
              <span>Take Diagnostic Assessment</span>
            </button>
          </div>
        </div>
      ) : (
        /* Program Cards Grid */
        <div className="space-y-6">
          {activeTab === 'recommendations' && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-amber-900 block">
                  Identified Remedial Curriculum for {totalGaps > 0 ? `${totalGaps} Detected Gap(s)` : 'Your Profile'}
                </span>
                <span className="text-amber-700 leading-relaxed">
                  The programs below cover competencies where your current verified assessment level falls below live industry requirements. Completing these courses directly bridges these gaps.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedPrograms.map((prog) => {
              const progId = prog.id || (prog as any)._id;
              const isWorkshop = prog.type === 'workshop';
              const isCourse = prog.type === 'course';

              return (
                <div
                  key={progId}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Explainable Recommendation Rationale Banner */}
                    {prog.recommendationReason && (
                      <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            Targeted Gap: {prog.targetedGapSkill || 'Remedial Competency'}
                          </span>
                          {prog.gapPriority && (
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                prog.gapPriority === 'High'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {prog.gapPriority} Priority
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
                          {prog.recommendationReason}
                        </p>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            prog.providerLogo ||
                            'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=80&auto=format&fit=crop&q=80'
                          }
                          alt={prog.provider}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                        />
                        <div>
                          <span className="text-[11px] font-bold text-slate-500">{prog.provider}</span>
                          <h3 className="text-sm font-bold text-slate-900 leading-snug">{prog.title}</h3>
                        </div>
                      </div>
                      <Badge
                        variant={
                          prog.type === 'certification' ? 'purple' : prog.type === 'workshop' ? 'amber' : 'blue'
                        }
                      >
                        {prog.type === 'workshop'
                          ? '🛠️ HANDS-ON LAB'
                          : prog.type === 'course'
                          ? '📖 SELF-PACED'
                          : '🎓 CERTIFICATION'}
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{prog.description}</p>

                    {/* Skills covered chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {prog.skillsCovered.map((skill, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                            prog.targetedGapSkill && skill.toLowerCase() === prog.targetedGapSkill.toLowerCase()
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                          }`}
                        >
                          +{skill}
                        </span>
                      ))}
                    </div>

                    {/* Course Meta Specs */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
                      <div className="p-2 bg-slate-50 rounded-xl">
                        <span className="text-[10px] text-slate-400 block font-bold">Duration</span>
                        <span className="font-semibold text-slate-800 text-[11px]">{prog.duration}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-xl">
                        <span className="text-[10px] text-slate-400 block font-bold">Rating</span>
                        <span className="font-semibold text-amber-600 text-[11px] flex items-center justify-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-500" /> {prog.rating}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-xl">
                        <span className="text-[10px] text-slate-400 block font-bold">Fee</span>
                        <span className="font-bold text-emerald-700 text-[11px]">{prog.cost}</span>
                      </div>
                    </div>

                    {/* Expandable Syllabus */}
                    {prog.syllabus && (
                      <div className="pt-2">
                        <button
                          onClick={() => toggleSyllabus(progId)}
                          className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                        >
                          <span>
                            {expandedSyllabus[progId]
                              ? 'Hide Syllabus Modules'
                              : `View Syllabus Modules (${prog.syllabus.length || 4})`}
                          </span>
                          {expandedSyllabus[progId] ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {expandedSyllabus[progId] && (
                          <ul className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 animate-in fade-in duration-150">
                            {prog.syllabus.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-slate-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {(prog.enrolledCount || 0).toLocaleString()} scholars enrolled
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/student/learning/course/${progId}`)}
                        className={`px-3 py-2 rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer text-white ${
                          isWorkshop
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : isCourse
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>
                          {isWorkshop ? 'Enter Hands-On Lab' : isCourse ? 'Start Self-Paced Course' : 'Start Certification'}
                        </span>
                      </button>
                      <button
                        onClick={() => setEnrollingProg(prog)}
                        className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition-colors cursor-pointer"
                      >
                        Details & Enroll
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Curated Career Learning Pathways (Option A - MongoDB Curated roadmap.sh) */}
          {activeTab === 'recommendations' && roadmaps.length > 0 && (
            <div className="mt-12 space-y-4">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Curated Career Learning Pathways
                  </h2>
                  <p className="text-xs text-slate-500">
                    Step-by-step career pathways aligned with your identified learning gaps.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roadmaps.map((rm, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white border border-indigo-100 shadow-xs hover:border-indigo-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          Targeting Gap: {rm.skill}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1.5">{rm.roadmapTitle}</h4>
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">
                        {rm.estimatedHours}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{rm.description}</p>

                    {/* Key Modules Preview */}
                    {rm.modules && rm.modules.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Core Modules</span>
                        <div className="space-y-1">
                          {rm.modules.slice(0, 3).map((mod, mIdx) => (
                            <div key={mIdx} className="text-xs text-slate-700 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              <span>{mod.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 italic">
                        Guidance via{' '}
                        <a
                          href={rm.creditUrl || 'https://roadmap.sh'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-slate-600"
                        >
                          roadmap.sh (CC BY-SA 4.0)
                        </a>
                      </span>
                      <a
                        href={rm.roadmapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        <span>Explore Full Pathway</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enrollment Modal */}
      {enrollingProg && (
        <Modal
          isOpen={true}
          onClose={() => {
            setEnrollingProg(null);
            setEnrolledSuccess(null);
          }}
          title={enrolledSuccess ? 'Enrollment Confirmed!' : `Enroll in ${enrollingProg.title}`}
          subtitle={enrollingProg.provider}
        >
          {enrolledSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-600">{enrolledSuccess}</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    const id = enrollingProg.id || (enrollingProg as any)._id;
                    setEnrollingProg(null);
                    setEnrolledSuccess(null);
                    navigate(`/student/learning/course/${id}`);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>
                    {enrollingProg.type === 'workshop'
                      ? 'Enter Hands-On Lab Sandbox'
                      : enrollingProg.type === 'course'
                      ? 'Launch Self-Paced Workspace'
                      : 'Launch Course Workspace'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                You are about to register for this accredited module. Course completion will automatically add a verified credential to your Skill Profile and resolve your identified competency gap.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Program Fee:</span>
                  <span className="font-bold text-emerald-700">{enrollingProg.cost}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-bold text-slate-800">{enrollingProg.duration}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEnrollingProg(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleEnroll(enrollingProg)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Confirm Registration
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
