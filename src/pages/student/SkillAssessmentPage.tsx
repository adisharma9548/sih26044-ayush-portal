import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { AssessmentQuestion, RoadmapGuidance } from '../../types';
import {
  Award,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Compass,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const SkillAssessmentPage: React.FC = () => {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [roadmaps, setRoadmaps] = useState<RoadmapGuidance[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQ = async () => {
      setLoading(true);
      const res = await api.skills.getQuestions();
      setQuestions(res.data);
      setLoading(false);
    };
    fetchQ();
  }, []);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (optionIdx: number) => {
    if (!currentQ) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQ.id]: optionIdx
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.skills.submitAssessment(selectedAnswers);
      setResultScore(res.data.score);
      setIsCompleted(true);

      // Search roadmap.sh for any lagging skill categories
      const wrongCategories = questions
        .filter((q) => selectedAnswers[q.id] !== q.correctIndex)
        .map((q) => q.category);
      const uniqueLagging = Array.from(new Set(wrongCategories));
      if (uniqueLagging.length > 0) {
        try {
          const rmRes = await api.ai.getRoadmaps(uniqueLagging);
          if (rmRes.data?.roadmaps) {
            setRoadmaps(rmRes.data.roadmaps);
          }
        } catch {
          // Graceful fallback
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-semibold">Loading National Ayush Assessment Monograph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              NATIONAL TEST
            </span>
            <span className="text-xs text-slate-400">SIH-AYUSH-COMP-2026</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Ayush Competency Skill Assessment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evaluate your readiness in Dravyaguna, Schedule T GMP, Clinical Rog Nidan, and GCP.
          </p>
        </div>

        {!isCompleted && questions.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold shrink-0">
            <span>Question {currentIndex + 1} of {questions.length}</span>
          </div>
        )}
      </div>

      {questions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Assessment Questions Published</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Standardized assessment questions will appear here once published by administrators. You can also take the AI Dynamic Diagnostic evaluation tailored to your registered degree.
          </p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
          >
            <span>Return to Dashboard</span>
          </button>
        </div>
      ) : !isCompleted ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="blue" size="sm">
                {currentQ.category}
              </Badge>
              <span className="text-xs text-slate-400">Weightage: {currentQ.weight}%</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
              {currentQ.question}
            </h3>

            {/* Options List */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedAnswers[currentQ.id] === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-white"></span>}
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-slate-800 leading-normal">
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                {submitting ? (
                  <span>Evaluating Score...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Submit & Update Radar</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Results Card */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-xl space-y-6 animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 border-2 border-emerald-500/30 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <Award className="w-10 h-10" />
          </div>

          <div>
            <span className="text-xs uppercase font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              Assessment Verified
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-3">
              Your New Score: {resultScore} / 100
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Your competencies have been verified and saved to your national profile.
            </p>
          </div>

          {/* Mandatory Test Requirement Notice */}
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-left space-y-1 max-w-xl mx-auto">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Mandatory Test Requirement Verified</span>
            </div>
            <p className="text-xs text-amber-900 font-semibold leading-relaxed">
              The Competency Assessment Test is mandatory before applying for any upcoming or ongoing internships or jobs.
            </p>
            <p className="text-[11px] text-amber-800">
              Your score of {resultScore}/100 fulfills the verification prerequisite. You are now eligible to submit verified applications across all active listings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto text-left">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Status</span>
              <span className="text-xs font-bold text-emerald-700">Competency Certified</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">National Rank</span>
              <span className="text-xs font-bold text-slate-900">Top 8th Percentile</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">Unlocked Openings</span>
              <span className="text-xs font-bold text-blue-700">All Active Listings</span>
            </div>
          </div>

          {/* Course Guidance via roadmap.sh if lagging skills detected */}
          {roadmaps.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100 text-left max-w-xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-600" />
                    <span>Course Guidance for Identified Gaps</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Community-standard learning modules from <strong>roadmap.sh</strong> for missed challenge areas:
                  </p>
                </div>
                <a
                  href="https://roadmap.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0"
                >
                  <span>roadmap.sh</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-3">
                {roadmaps.map((rm, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-slate-800">{rm.roadmapTitle || rm.skill}</span>
                        <span className="ml-2 text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded font-medium">
                          roadmap.sh/{rm.roadmapSlug || rm.canonicalRoadmap}
                        </span>
                      </div>
                      <a
                        href={rm.roadmapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1 shrink-0"
                      >
                        <span>Open Roadmap</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-slate-600 text-[11px]">{rm.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {rm.modules?.map((mod, mIdx) => (
                        <div key={mIdx} className="p-2 rounded-xl bg-white border border-slate-200/80 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-700 uppercase block">{mod.title || mod.stage}</span>
                          {mod.description && <p className="text-[10px] text-slate-500 leading-tight">{mod.description}</p>}
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {mod.topics.slice(0, 4).map((t, tIdx) => (
                              <span key={tIdx} className="text-[9px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-600">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* roadmap.sh Attribution */}
              <div className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>Curriculum guidance provided by roadmap.sh under CC BY-SA 4.0. All credit belongs to roadmap.sh and contributors.</span>
                <a href="https://roadmap.sh" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-bold hover:underline whitespace-nowrap">
                  roadmap.sh ↗
                </a>
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/student/skills')}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
            >
              View Updated Radar Chart
            </button>
            <button
              onClick={() => {
                setIsCompleted(false);
                setCurrentIndex(0);
                setSelectedAnswers({});
                setRoadmaps([]);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retake Assessment</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
