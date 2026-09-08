import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { AssessmentQuestion, RoadmapGuidance } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useExamProctoring, ProctoringViolation } from '../../hooks/useExamProctoring';
import { ProctoringHUD } from '../../components/proctoring/ProctoringHUD';
import { ProctoringAgreementModal } from '../../components/proctoring/ProctoringAgreementModal';
import { ViolationWarningModal } from '../../components/proctoring/ViolationWarningModal';
import { DegreeSpecializationPromptModal } from '../../components/student/DegreeSpecializationPromptModal';
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
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const SkillAssessmentPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Degree & Specialization Calibration
  const [degree, setDegree] = useState<string>(user?.degree || '');
  const [specialization, setSpecialization] = useState<string>(user?.specialization || user?.currentDomain || '');
  const [showDegreePrompt, setShowDegreePrompt] = useState<boolean>(false);

  // Proctoring and Lockdown States
  const [examStarted, setExamStarted] = useState<boolean>(false);
  const [showAgreementModal, setShowAgreementModal] = useState<boolean>(false);
  const [isTerminated, setIsTerminated] = useState<boolean>(false);

  // Assessment & Questions States
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [roadmaps, setRoadmaps] = useState<RoadmapGuidance[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Proctoring Hook
  const {
    strikes,
    maxStrikes,
    violationsLog,
    activeWarning,
    requestFullscreen,
    recordViolation,
    clearActiveWarning,
  } = useExamProctoring({
    active: examStarted && !isCompleted && !isTerminated,
    maxStrikes: 3,
    onMaxStrikesReached: (logs) => {
      setIsTerminated(true);
      handleAutoSubmitOnBreach(logs);
    },
  });

  // Fetch AI-Generated Questions strictly tailored to Degree and Specialization
  const fetchQuestionsForDiscipline = useCallback(async (targetDeg: string, targetSpec: string) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.skills.getQuestions(targetDeg, targetSpec);
      if (res.data && res.data.length > 0) {
        setQuestions(res.data);
        setCurrentIndex(0);
        setSelectedAnswers({});
      } else {
        throw new Error('AI was unable to formulate test questions for this discipline. Please retry.');
      }
    } catch (err: any) {
      setFetchError(err.message || 'Unable to generate questions via AI. Please check your network or try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Load: Check if student has degree/specialization
  useEffect(() => {
    const initialDegree = user?.degree?.trim() || '';
    const initialSpec = user?.specialization?.trim() || user?.currentDomain?.trim() || '';

    if (initialDegree && initialSpec) {
      setDegree(initialDegree);
      setSpecialization(initialSpec);
      fetchQuestionsForDiscipline(initialDegree, initialSpec);
    } else {
      setShowDegreePrompt(true);
    }
  }, [user, fetchQuestionsForDiscipline]);

  // Handle Specialization Confirmation from Modal
  const handleConfirmDiscipline = (newDegree: string, newSpec: string) => {
    setDegree(newDegree);
    setSpecialization(newSpec);
    setShowDegreePrompt(false);
    fetchQuestionsForDiscipline(newDegree, newSpec);
  };

  // Begin Exam Flow with Proctoring Agreement
  const handleInitiateExam = () => {
    if (questions.length === 0) return;
    setShowAgreementModal(true);
  };

  const handleStartProctoredExam = async () => {
    setShowAgreementModal(false);
    await requestFullscreen();
    setExamStarted(true);
  };

  const handleSelectOption = (optionIdx: number) => {
    if (!currentQ || !examStarted || isCompleted) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQ.id]: optionIdx,
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

  // Auto-submit if 3 violations reached
  const handleAutoSubmitOnBreach = async (logs: ProctoringViolation[]) => {
    setSubmitting(true);
    try {
      const integrityScore = Math.max(0, 100 - logs.length * 33);
      const res = await api.skills.submitAssessment(
        selectedAnswers,
        {
          violationsCount: logs.length,
          violationsLog: logs,
          terminatedEarly: true,
          integrityScore,
        },
        questions
      );
      setResultScore(res.data.score);
      setIsCompleted(true);
    } catch {
      // Complete gracefully
      setIsCompleted(true);
    } finally {
      setSubmitting(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const integrityScore = Math.max(0, 100 - strikes * 20);
      const res = await api.skills.submitAssessment(
        selectedAnswers,
        {
          violationsCount: strikes,
          violationsLog,
          terminatedEarly: false,
          integrityScore,
        },
        questions
      );

      setResultScore(res.data.score);
      setIsCompleted(true);

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      // Search roadmap.sh for lagging skill categories
      const wrongCategories = questions
        .filter((q) => selectedAnswers[q.id] !== q.correctIndex)
        .map((q) => q.category);
      const uniqueLagging = Array.from(new Set(wrongCategories));
      if (uniqueLagging.length > 0) {
        try {
          const rmRes = await api.ai.getRoadmaps(uniqueLagging, degree);
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

  const currentQ = questions[currentIndex];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-semibold">
            Generating live AI assessment questions for <strong>{specialization || degree || 'your discipline'}</strong>...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Modals */}
      <DegreeSpecializationPromptModal
        isOpen={showDegreePrompt}
        currentDegree={degree}
        currentSpecialization={specialization}
        onConfirm={handleConfirmDiscipline}
        onClose={questions.length > 0 ? () => setShowDegreePrompt(false) : undefined}
      />

      <ProctoringAgreementModal
        isOpen={showAgreementModal}
        degreeName={degree}
        specializationName={specialization}
        onAccept={handleStartProctoredExam}
        onCancel={() => setShowAgreementModal(false)}
      />

      <ViolationWarningModal
        warning={activeWarning}
        strikes={strikes}
        maxStrikes={maxStrikes}
        onResume={async () => {
          clearActiveWarning();
          await requestFullscreen();
        }}
        isTerminated={isTerminated}
      />

      {/* Floating Camera & Proctoring HUD during active exam */}
      {examStarted && !isCompleted && (
        <ProctoringHUD
          isActive={examStarted && !isCompleted}
          strikes={strikes}
          maxStrikes={maxStrikes}
          onViolation={recordViolation}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              AI ADAPTIVE ASSESSMENT
            </span>
            {examStarted && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                PROCTORING LOCKDOWN
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            {specialization || degree ? `${specialization || degree} Examination` : 'Skill Competency Assessment'}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
            <span>
              Target Discipline: <strong className="text-slate-800">{degree || 'Not Set'}</strong>
              {specialization && <> — Track: <strong className="text-emerald-700">{specialization}</strong></>}
            </span>
            {!examStarted && !isCompleted && (
              <button
                type="button"
                onClick={() => setShowDegreePrompt(true)}
                className="text-emerald-600 hover:text-emerald-700 font-bold underline ml-2"
              >
                Change Discipline
              </button>
            )}
          </div>
        </div>

        {examStarted && !isCompleted && questions.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold shrink-0">
            <span>Question {currentIndex + 1} of {questions.length}</span>
          </div>
        )}
      </div>

      {/* Error state */}
      {fetchError ? (
        <div className="bg-white rounded-3xl border border-red-200 p-8 shadow-xs text-center py-12 space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">AI Formulation Failed</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{fetchError}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => fetchQuestionsForDiscipline(degree, specialization)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              Retry AI Generation
            </button>
            <button
              onClick={() => setShowDegreePrompt(true)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Select Different Degree
            </button>
          </div>
        </div>
      ) : !examStarted && !isCompleted ? (
        /* Pre-Exam Ready Card */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs text-center py-12 space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {questions.length} AI-Generated Questions Ready
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-3">
              Ready for Proctored Evaluation in {specialization || degree}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              This exam evaluates your problem-solving abilities across Foundational, Intermediate, and Advanced tiers.
              Tab restrictions and webcam proctoring are strictly enforced throughout.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleInitiateExam}
              className="px-8 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 inline-flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Proceed to Proctoring & Start Exam</span>
            </button>
          </div>
        </div>
      ) : !isCompleted ? (
        /* Active Exam Card */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question Details */}
          {currentQ && (
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
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
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
          )}

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
                    <span>Submit Exam</span>
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
              Evaluated strictly on <strong>{specialization || degree}</strong>. Your competency profile and integrity audit have been preserved.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
            >
              <span>View Verified Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsCompleted(false);
                setExamStarted(false);
                setIsTerminated(false);
                fetchQuestionsForDiscipline(degree, specialization);
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Evaluation</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};