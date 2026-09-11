import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { RoadmapGuidance } from '../../types';
import { useExamProctoring, ProctoringViolation } from '../../hooks/useExamProctoring';
import { ProctoringHUD } from '../proctoring/ProctoringHUD';
import { ViolationWarningModal } from '../proctoring/ViolationWarningModal';
import {
  Sparkles,
  Brain,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  Award,
  AlertCircle,
  AlertTriangle,
  Clock,
  BookOpen,
  Calendar,
  GraduationCap,
  Target,
  RotateCcw,
  ExternalLink,
  Layers,
  Compass,
  X
} from 'lucide-react';
import { RadarChart } from '../common/RadarChart';

interface Question {
  id: number;
  category: string;
  difficulty?: 'Basic' | 'Intermediate' | 'Advanced';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface EvaluationResult {
  overallScore: number;
  radar: { subject: string; score: number; benchmark: number | null; benchmarkStatus?: string; reason?: string }[];
  strengths: string[];
  gaps: { skill: string; gapPercentage: number; priority: string }[];
  recommendations: { title: string; provider: string; duration: string; type: string }[];
  mandatoryNotice?: string;
  roadmaps?: RoadmapGuidance[];
}

interface StudyTimelineData {
  recommendedDays: number;
  recommendedTimeline: string;
  retryAfterDate: string;
  targetedTopics: string[];
  studyAdvice: string;
  recommendedResources: { title: string; type: string; url?: string }[];
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  mandatoryNotice?: string;
  roadmaps?: RoadmapGuidance[];
}

interface Props {
  isOpen: boolean;
  onComplete: () => void;
  onClose?: () => void;
  requiredForApplication?: boolean;
}

export const AiOnboardingModal: React.FC<Props> = ({
  isOpen,
  onComplete,
  onClose,
  requiredForApplication = false,
}) => {
  const { user } = useAuth();

  // Phases: 'domain_discovery' | 'test' | 'study_timeline' | 'results'
  const [phase, setPhase] = useState<'domain_discovery' | 'test' | 'study_timeline' | 'results'>('domain_discovery');

  // Degree & Domain selections (fetched purely via AI)
  const [selectedDegree, setSelectedDegree] = useState<string>(user?.degree || '');
  const [currentDomain, setCurrentDomain] = useState<string>(user?.specialization || user?.currentDomain || '');
  const [targetDomain, setTargetDomain] = useState<string>(user?.targetDomain || '');
  const [dynamicDomains, setDynamicDomains] = useState<string[]>([]);
  const [dynamicCareers, setDynamicCareers] = useState<string[]>([]);
  const [loadingAiDomains, setLoadingAiDomains] = useState(false);

  // Assessment states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);

  // History tracking
  const [recordedAnswers, setRecordedAnswers] = useState<
    { questionId: number; selectedIndex: number; correctIndex: number; category: string }[]
  >([]);
  const [wrongQuestions, setWrongQuestions] = useState<
    { question: string; category: string; explanation: string }[]
  >([]);

  // Results & Study Timeline
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [studyTimeline, setStudyTimeline] = useState<StudyTimelineData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isNewUser = (user?.loginCount ?? 1) <= 1;

  // Auto-submit on max proctoring violations reached
  const handleAutoSubmitOnBreach = async (logs: ProctoringViolation[]) => {
    setSubmitting(true);
    try {
      const res = await api.ai.submitDiagnostic(recordedAnswers, selectedDegree || user?.degree, {
        violationsCount: logs.length,
        violationsLog: logs,
        terminatedEarly: true,
      });
      setEvaluation(res.data.evaluation);
      setPhase('results');
    } catch (err: any) {
      setError('Diagnostic assessment automatically submitted due to integrity violations.');
      setPhase('results');
    } finally {
      setSubmitting(false);
    }
  };

  // Proctoring lockdown during active test
  const {
    strikes,
    maxStrikes,
    violationsLog,
    activeWarning,
    requestFullscreen,
    recordViolation,
    clearActiveWarning,
    resetProctoring,
  } = useExamProctoring({
    active: phase === 'test' && isOpen,
    maxStrikes: 3,
    onMaxStrikesReached: (logs) => {
      // Auto-submit immediately on 3 strikes
      handleAutoSubmitOnBreach(logs);
    },
  });

  // Dynamic AI Specialization & Career Track Discovery
  useEffect(() => {
    if (!isOpen) return;
    const targetDeg = (selectedDegree || user?.degree || 'Higher Education').trim();
    let isMounted = true;
    setLoadingAiDomains(true);

    api.ai
      .getSpecializations(targetDeg)
      .then((res) => {
        if (!isMounted) return;
        const specs = res.data?.specializations || [];
        const careers = res.data?.suggestedCareers || [];
        setDynamicDomains(specs);
        setDynamicCareers(careers);

        if (specs.length > 0 && !currentDomain) {
          setCurrentDomain(specs[0]);
        }
        if (careers.length > 0 && !targetDomain) {
          setTargetDomain(careers[0]);
        }
      })
      .catch((err) => {
        console.warn('Unable to load AI specializations:', err.message);
      })
      .finally(() => {
        if (isMounted) setLoadingAiDomains(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedDegree, user]);

  useEffect(() => {
    if (isOpen) {
      if (user?.degree) setSelectedDegree(user.degree);
      if (user?.specialization || user?.currentDomain) setCurrentDomain(user.specialization || user.currentDomain || '');
      if (user?.targetDomain) setTargetDomain(user.targetDomain);
      setPhase('domain_discovery');
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setRecordedAnswers([]);
      setWrongQuestions([]);
      setEvaluation(null);
      setStudyTimeline(null);
      setError(null);
      resetProctoring();
    }
  }, [isOpen, user, resetProctoring]);

  const handleStartTest = async () => {
    setLoading(true);
    setError(null);
    resetProctoring();
    try {
      if (user?.id) {
        api.users.updateProfile(user.id, { degree: selectedDegree, currentDomain, targetDomain }).catch(() => {});
      }

      await requestFullscreen();

      const res = await api.ai.getDiagnostic(selectedDegree, currentDomain, targetDomain, currentDomain);
      const fetchedQuestions: Question[] = res.data.questions || [];
      if (fetchedQuestions.length === 0) {
        throw new Error('No diagnostic questions available from AI. Please try again.');
      }
      setQuestions(fetchedQuestions);
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setRecordedAnswers([]);
      setWrongQuestions([]);
      setPhase('test');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize AI diagnostic questions');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
  };

  const handleConfirmAnswer = async () => {
    if (selectedOption === null) return;
    const currentQ = questions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQ.correctIndex;

    const updatedRecorded = [
      ...recordedAnswers,
      {
        questionId: currentQ.id,
        selectedIndex: selectedOption,
        correctIndex: currentQ.correctIndex,
        category: currentQ.category,
      },
    ];
    setRecordedAnswers(updatedRecorded);

    let updatedWrong = [...wrongQuestions];
    if (!isCorrect) {
      updatedWrong = [
        ...wrongQuestions,
        {
          question: currentQ.question,
          category: currentQ.category,
          explanation: currentQ.explanation,
        },
      ];
      setWrongQuestions(updatedWrong);
    }

    setIsAnswerSubmitted(true);

    // If 5 mistakes reached, halt and trigger realistic AI study timeline + roadmap.sh guidance
    if (updatedWrong.length >= 5) {
      setSubmitting(true);
      const totalAnswered = updatedRecorded.length;
      const wrongCount = updatedWrong.length;
      const correctCount = Math.max(0, totalAnswered - wrongCount);
      try {
        const timelineRes = await api.ai.getStudyTimeline(
          currentDomain,
          targetDomain,
          updatedWrong,
          correctCount,
          totalAnswered
        );
        setStudyTimeline(timelineRes.data);
        setPhase('study_timeline');
      } catch (err: any) {
        setStudyTimeline({
          recommendedDays: 5,
          recommendedTimeline: '5 Days of Targeted Foundations Review',
          retryAfterDate: new Date(Date.now() + 5 * 86400000).toISOString(),
          targetedTopics: updatedWrong.map((q) => q.category).filter((v, i, a) => a.indexOf(v) === i),
          studyAdvice: 'Iterative revision builds technical mastery. Review the designated roadmaps to strengthen these core principles before re-attempting.',
          recommendedResources: [
            { title: 'Interactive Problem Drills & Code Exercises', type: 'Practice' },
          ],
          score: Math.round((correctCount / totalAnswered) * 100),
          totalQuestions: totalAnswered,
          correctAnswers: correctCount,
          wrongAnswers: wrongCount,
          mandatoryNotice: 'The Competency Assessment Test is mandatory before applying for any upcoming or ongoing internships or jobs.',
          roadmaps: [],
        });
        setPhase('study_timeline');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setSubmitting(true);
      try {
        const res = await api.ai.submitDiagnostic(recordedAnswers, selectedDegree || user?.degree, {
          violationsCount: violationsLog.length,
          violationsLog,
          terminatedEarly: false,
        });
        setEvaluation(res.data.evaluation);
        setPhase('results');
      } catch (err: any) {
        setError(err.message || 'AI evaluation failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleSkip = () => {
    if (user?.id && (currentDomain || targetDomain)) {
      api.users.updateProfile(user.id, { currentDomain, targetDomain }).catch(() => {});
    }
    if (onClose) {
      onClose();
    } else {
      onComplete();
    }
  };

  if (!isOpen) return null;

  const currentQ = questions[currentQuestionIndex];
  const wrongCount = wrongQuestions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      {/* Proctoring HUD and Warning Modal during active test */}
      {phase === 'test' && (
        <ProctoringHUD
          isActive={phase === 'test' && isOpen}
          strikes={strikes}
          maxStrikes={maxStrikes}
          onViolation={recordViolation}
        />
      )}

      <ViolationWarningModal
        warning={activeWarning}
        strikes={strikes}
        maxStrikes={maxStrikes}
        onResume={async () => {
          clearActiveWarning();
          await requestFullscreen();
        }}
        isTerminated={violationsLog.length >= maxStrikes}
      />

      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 relative animate-in fade-in zoom-in-95 duration-200">
        {!requiredForApplication && (
          <button
            onClick={handleSkip}
            className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Skip for Now"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* PHASE 1: DOMAIN & CAREER INTEREST DISCOVERY */}
        {phase === 'domain_discovery' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Unified Skill Intelligence Engine</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {isNewUser
                  ? `Welcome to your Career Launchpad, ${user?.name || 'Scholar'}!`
                  : `Welcome back, ${user?.name || 'Scholar'}!`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {isNewUser
                  ? "Let's discover your core competencies and map your verified Skill Gap Radar. Select your current study domain and target career to calibrate your diagnostic."
                  : 'Update your technical domain and career focus to re-calibrate your adaptive diagnostic benchmark against live industry criteria.'}
              </p>
            </div>

            {requiredForApplication && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Assessment Required to Apply:</strong> Partner industries evaluate candidates based on verified skill competency. Please complete this quick adaptive diagnostic test to verify your skills.
                </span>
              </div>
            )}

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    <span>Degree / Academic Program</span>
                  </span>
                  {loadingAiDomains && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading AI tracks...
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={selectedDegree}
                  onChange={(e) => setSelectedDegree(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science, LL.B, BAMS, MBBS, B.Com, MBA..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Academic Specialization / Domain</span>
                </label>
                {dynamicDomains.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={currentDomain}
                      onChange={(e) => setCurrentDomain(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-xs"
                    >
                      {dynamicDomains.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={currentDomain}
                      onChange={(e) => setCurrentDomain(e.target.value)}
                      placeholder="Or specify custom specialization..."
                      className="w-full p-2 text-xs rounded-lg border border-slate-200 text-slate-700 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={currentDomain}
                    onChange={(e) => setCurrentDomain(e.target.value)}
                    placeholder="Enter your field of study or major (e.g. Artificial Intelligence, Constitutional Law, Dravyaguna)..."
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-xs"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span>Target Industry Career Aspiration</span>
                </label>
                {dynamicCareers.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={targetDomain}
                      onChange={(e) => setTargetDomain(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-xs"
                    >
                      {dynamicCareers.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={targetDomain}
                      onChange={(e) => setTargetDomain(e.target.value)}
                      placeholder="Or specify custom career role..."
                      className="w-full p-2 text-xs rounded-lg border border-slate-200 text-slate-700 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={targetDomain}
                    onChange={(e) => setTargetDomain(e.target.value)}
                    placeholder="e.g. Cloud Architect, Ayurvedic Clinical Consultant, Corporate Litigator..."
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-xs"
                  />
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-emerald-600" />
                <span>How the Adaptive Test Works</span>
              </div>
              <ul className="space-y-1 pl-5 list-disc text-slate-500 text-[11px] leading-relaxed">
                <li>Starts with <strong>Basic Foundations</strong> and increases difficulty on correct answers.</li>
                <li>If you encounter 5 tricky questions, test safely pauses and Groq AI computes a <strong>Realistic Study Timeline</strong> with targeted topics.</li>
                <li>You can skip now to explore your dashboard, but testing is required before applying for opportunities.</li>
              </ul>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              {!requiredForApplication ? (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Skip for Now (Explore Dashboard)
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">Diagnostic required for submission</span>
              )}

              <button
                type="button"
                onClick={handleStartTest}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Calibrating AI Assessment...</span>
                  </>
                ) : (
                  <>
                    <span>Start Adaptive Diagnostic Test</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PHASE 2: ADAPTIVE QUESTION FLOW */}
        {phase === 'test' && currentQ && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      currentQ.difficulty === 'Advanced'
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : currentQ.difficulty === 'Intermediate'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {currentQ.difficulty || (currentQuestionIndex < 2 ? 'Basic' : currentQuestionIndex < 5 ? 'Intermediate' : 'Advanced')}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-800">{currentQ.category}</p>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-600">Mistakes:</span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        i < wrongCount ? 'bg-rose-500' : 'bg-slate-200'
                      }`}
                      title={i < wrongCount ? 'Incorrect answer' : 'Buffer'}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-slate-500 ml-1">{wrongCount} / 5</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                {currentQ.question}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedOption === optIdx;
                let btnStyle = 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-slate-50';

                if (isAnswerSubmitted) {
                  if (optIdx === currentQ.correctIndex) {
                    btnStyle = 'bg-emerald-50 text-emerald-900 border-emerald-500 font-bold';
                  } else if (isSelected && optIdx !== currentQ.correctIndex) {
                    btnStyle = 'bg-rose-50 text-rose-900 border-rose-400 line-through';
                  } else {
                    btnStyle = 'bg-slate-50 text-slate-400 border-slate-100 opacity-60';
                  }
                } else if (isSelected) {
                  btnStyle = 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold';
                }

                return (
                  <button
                    key={optIdx}
                    type="button"
                    disabled={isAnswerSubmitted}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full p-3.5 rounded-2xl text-left text-xs transition-all border flex items-center justify-between font-medium cursor-pointer ${btnStyle}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[11px] bg-black/5">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </div>

                    {isAnswerSubmitted && optIdx === currentQ.correctIndex && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    {isAnswerSubmitted && isSelected && optIdx !== currentQ.correctIndex && (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {isAnswerSubmitted && (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-1 animate-in fade-in ${
                  selectedOption === currentQ.correctIndex
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  {selectedOption === currentQ.correctIndex ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Correct!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Incorrect Concept</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-slate-700">{currentQ.explanation}</p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {currentQuestionIndex + 1} of {questions.length} answered
              </span>

              {!isAnswerSubmitted ? (
                <button
                  type="button"
                  onClick={handleConfirmAnswer}
                  disabled={selectedOption === null}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Confirm Answer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing Performance...</span>
                    </>
                  ) : currentQuestionIndex < questions.length - 1 ? (
                    <>
                      <span>Next Question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Finalize Skill Radar</span>
                      <Award className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* PHASE 3: REALISTIC SCORE, MANDATORY NOTICE & ROADMAP.SH COURSE GUIDANCE (5 MISTAKES) */}
        {phase === 'study_timeline' && studyTimeline && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center shadow-inner">
                <Brain className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Assessment In-Progress: Score & Targeted Course Roadmaps
              </h2>
              <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                You reached 5 challenge milestones. We’ve evaluated your answered questions, calculated your current score, and mapped direct curriculum guidance from <strong>roadmap.sh</strong> to help you bridge these specific concept gaps.
              </p>
            </div>

            {/* SCORE DISPLAY CARD */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    Current Diagnostic Score
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl sm:text-5xl font-black text-white">
                      {studyTimeline.score ?? Math.round(((studyTimeline.correctAnswers ?? 0) / (studyTimeline.totalQuestions || 1)) * 100)}%
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">
                      ({studyTimeline.correctAnswers ?? 0} Correct of {studyTimeline.totalQuestions ?? 5} Answered)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Score evaluated across answered technical challenges in {currentDomain}.
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:self-center">
                  <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/10 text-center">
                    <span className="text-[10px] uppercase text-emerald-300 font-bold block">Correct</span>
                    <span className="text-base font-bold text-white">{studyTimeline.correctAnswers ?? 0}</span>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/10 text-center">
                    <span className="text-[10px] uppercase text-amber-300 font-bold block">Missed</span>
                    <span className="text-base font-bold text-white">{studyTimeline.wrongAnswers ?? 5}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MANDATORY ASSESSMENT NOTICE BANNER */}
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Competency Assessment Mandatory for Opportunities</span>
              </div>
              <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                {studyTimeline.mandatoryNotice || 'The Competency Assessment Test is mandatory before applying for any upcoming or ongoing internships or jobs.'}
              </p>
              <p className="text-[11px] text-amber-800 leading-normal">
                Your score and progress have been saved to your student profile. Rather than restarting blindly, review the targeted <strong className="font-semibold">roadmap.sh</strong> roadmaps below to prepare, and retake the assessment whenever you are ready to certify your score!
              </p>
            </div>

            {/* STUDY SPRINT & RE-ATTEMPT TIMELINE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Recommended Study Sprint
                </span>
                <p className="text-lg font-black text-emerald-950">{studyTimeline.recommendedTimeline}</p>
                <p className="text-[11px] text-emerald-800">
                  Realistic duration to master identified gaps before retrying.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Suggested Re-Attempt Date</span>
                </span>
                <p className="text-lg font-black text-blue-950">
                  {new Date(studyTimeline.retryAfterDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-[11px] text-blue-800">
                  Allows ~{studyTimeline.recommendedDays} days of focused concept drills.
                </p>
              </div>
            </div>

            {/* AI MENTOR ADVICE */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>AI Mentor Guidance</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed italic">
                "{studyTimeline.studyAdvice}"
              </p>
            </div>

            {/* TARGETED TOPICS TO REVIEW */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Identified Concepts to Strengthen</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {studyTimeline.targetedTopics.map((topic, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold"
                  >
                    • {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* ROADMAP.SH COURSE GUIDANCE DIRECTLY ON OUR WEBSITE */}
            {studyTimeline.roadmaps && studyTimeline.roadmaps.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-emerald-600" />
                      <span>Course Guidance & Learning Roadmaps</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Curated developer & technical roadmaps for the topics you are lagging in, powered by <strong>roadmap.sh</strong>
                    </p>
                  </div>
                  <a
                    href="https://roadmap.sh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0"
                  >
                    <span>roadmap.sh</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-4">
                  {studyTimeline.roadmaps.map((rm, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{rm.roadmapTitle || rm.skill}</span>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              roadmap.sh/{rm.roadmapSlug || rm.canonicalRoadmap}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">{rm.description}</p>
                        </div>
                        <a
                          href={rm.roadmapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-[11px] transition-colors inline-flex items-center gap-1.5 shrink-0"
                        >
                          <span>Open Visual Roadmap</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Structured Stages / Modules */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {rm.modules?.map((mod, mIdx) => (
                          <div key={mIdx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-700 block uppercase tracking-wider">
                              {mod.title || mod.stage}
                            </span>
                            {mod.description && <p className="text-[11px] text-slate-600 leading-snug">{mod.description}</p>}
                            <div className="flex flex-wrap gap-1 pt-1">
                              {mod.topics.map((t, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200"
                                >
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

                {/* ATTRIBUTION / CREDIT TO ROADMAP.SH */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-amber-400 text-xs shrink-0">
                      R
                    </div>
                    <div>
                      <span className="font-bold text-white block">Curriculum Credit & Attribution</span>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        Curriculum guidance & developer learning paths provided by{' '}
                        <a href="https://roadmap.sh" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-emerald-400 hover:text-emerald-300">
                          roadmap.sh
                        </a>. All credit and rights belong to roadmap.sh and its open-source community contributors under CC BY-SA 4.0.
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://roadmap.sh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
                  >
                    Visit roadmap.sh ↗
                  </a>
                </div>
              </div>
            )}

            {/* ACTION BUTTONS (RE-ATTEMPT OR STUDY) */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleStartTest}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-attempt Assessment Now</span>
              </button>

              <button
                type="button"
                onClick={onComplete}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Study Roadmaps & Return to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* PHASE 4: EVALUATION RESULTS & RADAR */}
        {phase === 'results' && evaluation && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">AI Skill Diagnostic Complete!</h2>
              <p className="text-xs text-slate-500">
                Your answers have been analyzed by Groq AI against national industry benchmarks for{' '}
                <strong>{currentDomain}</strong>.
              </p>
            </div>

            {/* Mandatory Notice if present */}
            {evaluation.mandatoryNotice && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{evaluation.mandatoryNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
              <div className="md:col-span-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Computed Skill Score</p>
                <div className="text-5xl font-extrabold text-emerald-600">{evaluation.overallScore}</div>
                <p className="text-xs text-slate-600 font-medium">Out of 100</p>
                <div className="inline-flex text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full mt-2">
                  Verified Skill Index
                </div>
              </div>

              <div className="md:col-span-8 flex items-center justify-center overflow-hidden">
                <RadarChart
                  size={320}
                  skills={evaluation.radar.map((r) => {
                    const isVerified = evaluation.overallScore >= 60 && strikes === 0;
                    return {
                      name: r.subject,
                      level: r.score,
                      industryBenchmark: r.benchmark ?? null,
                      verified: isVerified,
                      verificationStatus: isVerified ? ('verified' as const) : ('unverified' as const),
                      category: 'General' as const,
                    };
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <h4 className="text-xs font-bold text-emerald-900 uppercase">Top Competency Strengths</h4>
                <ul className="space-y-1">
                  {evaluation.strengths.map((s, idx) => (
                    <li key={idx} className="text-xs text-emerald-800 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                <h4 className="text-xs font-bold text-amber-900 uppercase">Identified Skill Gaps</h4>
                <ul className="space-y-1">
                  {evaluation.gaps.map((g, idx) => (
                    <li key={idx} className="text-xs text-amber-800 flex items-center justify-between font-medium">
                      <span>{g.skill}</span>
                      <span className="font-bold text-[11px] bg-amber-200/80 px-1.5 py-0.2 rounded text-amber-900">
                        {g.gapPercentage}% gap
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ROADMAP.SH GUIDANCE IN PHASE 4 IF PRESENT */}
            {evaluation.roadmaps && evaluation.roadmaps.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-600" />
                    <span>Targeted Learning Roadmaps (roadmap.sh)</span>
                  </h3>
                  <a
                    href="https://roadmap.sh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span>roadmap.sh</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-3">
                  {evaluation.roadmaps.map((rm, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{rm.skill}</span>
                        <a
                          href={rm.roadmapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-emerald-700 font-semibold hover:underline flex items-center gap-1"
                        >
                          <span>View on roadmap.sh</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-slate-600 text-[11px]">{rm.description}</p>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] flex items-center justify-between">
                  <span>Learning roadmaps provided by roadmap.sh under CC BY-SA 4.0.</span>
                  <a href="https://roadmap.sh" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-bold hover:underline">
                    roadmap.sh ↗
                  </a>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={onComplete}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Proceed to Personalized Dashboard &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
