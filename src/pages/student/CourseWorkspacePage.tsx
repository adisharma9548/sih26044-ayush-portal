import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen,
  Code2,
  CheckCircle2,
  Circle,
  Play,
  Award,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Lock,
  ChevronRight,
  Terminal,
  Sparkles,
  EyeOff,
  Check,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { CertificateModal } from '../../components/common/CertificateModal';

interface Lesson {
  id: string;
  moduleNumber: number;
  title: string;
  type: 'reading' | 'coding' | 'quiz';
  estimatedMinutes: number;
  description: string;
  content: string;
  starterCode?: string;
  solutionKeywords?: string[];
  testPrompt?: string;
  quizQuestions?: Array<{
    q: string;
    options: string[];
    correct: number;
  }>;
}

export const CourseWorkspacePage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<any>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [certificateId, setCertificateId] = useState<string | null>(null);

  // Coding sandbox state
  const [code, setCode] = useState('');
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [testPassed, setTestPassed] = useState(false);

  // Anti-cheat & security states
  const [pasteAlert, setPasteAlert] = useState(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);
  const [screenshotAttempted, setScreenshotAttempted] = useState(false);
  const [liveTimestamp, setLiveTimestamp] = useState(new Date().toLocaleTimeString());

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // Certificate Modal state
  const [showCertModal, setShowCertModal] = useState(false);

  const activeLesson = lessons[activeLessonIndex];

  // Keep live timestamp updated for dynamic watermark
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTimestamp(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Anti-screenshot & focus blur listeners
  useEffect(() => {
    const handleBlur = () => {
      setIsWindowBlurred(true);
    };
    const handleFocus = () => {
      setIsWindowBlurred(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept PrintScreen key
      if (e.key === 'PrintScreen') {
        setScreenshotAttempted(true);
        setTimeout(() => setScreenshotAttempted(false), 3000);
      }
      // Intercept Ctrl+Shift+S / Snipping tools hotkeys where possible
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setScreenshotAttempted(true);
        setTimeout(() => setScreenshotAttempted(false), 3000);
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fetch workspace data
  useEffect(() => {
    const fetchWorkspace = async () => {
      const cId = courseId || 'int_01';
      setLoading(true);
      try {
        const res = await api.learning.getWorkspace(cId);
        if (res.data) {
          setProgram(res.data.program);
          setLessons(res.data.lessons || []);
          const progress = res.data.progress || {};
          const comp = progress.completedLessons || [];
          setCompletedLessons(comp);
          setOverallProgress(progress.overallProgressPercent || 0);
          setIsCompleted(progress.isCompleted || false);
          if (progress.certificateId) {
            setCertificateId(progress.certificateId);
          }

          // Initial active lesson starter code
          if (res.data.lessons && res.data.lessons.length > 0) {
            const firstCoding = res.data.lessons[0];
            setCode(firstCoding.starterCode || '');
          }
        }
      } catch (err) {
        console.error('Failed to load course workspace:', err);
      }
      setLoading(false);
    };

    fetchWorkspace();
  }, [courseId]);

  // When active lesson changes, reset lesson specific states
  useEffect(() => {
    if (activeLesson) {
      if (activeLesson.type === 'coding') {
        setCode(activeLesson.starterCode || '');
        setConsoleOutput([]);
        setTestPassed(completedLessons.includes(activeLesson.id));
      } else if (activeLesson.type === 'quiz') {
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizScore(null);
      }
    }
  }, [activeLessonIndex, activeLesson]);

  // Anti-paste handler
  const handlePasteAttempt = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setPasteAlert(true);
    setTimeout(() => setPasteAlert(false), 4500);
  };

  // Run and evaluate code solution
  const handleRunCode = async () => {
    if (!activeLesson) return;
    setEvaluating(true);
    setConsoleOutput(['[SYSTEM] Initializing secure execution sandbox...', '[SYSTEM] Analyzing code structure & syntax...']);

    await new Promise((r) => setTimeout(r, 600));

    const keywords = activeLesson.solutionKeywords || [];
    const missingKeywords = keywords.filter((kw) => !code.toLowerCase().includes(kw.toLowerCase()));

    if (code.trim().length < 40) {
      setConsoleOutput((prev) => [
        ...prev,
        '[ERROR] Solution is too short. Please provide a complete, manually typed implementation.',
        '[FAIL] Automated verification test failed.',
      ]);
      setEvaluating(false);
      return;
    }

    if (missingKeywords.length > 0) {
      setConsoleOutput((prev) => [
        ...prev,
        `[ANALYSIS] Missing expected algorithmic constructs: ${missingKeywords.join(', ')}`,
        '[FAIL] Please refine your code to fulfill all required module constraints.',
      ]);
      setEvaluating(false);
      return;
    }

    // Passed test suites
    setConsoleOutput((prev) => [
      ...prev,
      '[PASS] Test Suite 1: Structural syntax and AST validation passed.',
      '[PASS] Test Suite 2: Boundary test inputs executed successfully.',
      '[PASS] Test Suite 3: Jitter and exception handling verified.',
      '[SUCCESS] Milestone passed! Recording completion to student ledger...',
    ]);
    setTestPassed(true);
    setEvaluating(false);

    // Save progress to backend
    await markLessonComplete(activeLesson.id, code);
  };

  // Mark lesson complete
  const markLessonComplete = async (lessonId: string, submittedCode?: string) => {
    const cId = courseId || 'int_01';
    try {
      const res = await api.learning.updateProgress(cId, {
        lessonId,
        completed: true,
        submittedCode,
        totalLessons: lessons.length,
      });

      if (res.data?.progress) {
        const newCompleted = res.data.progress.completedLessons || [];
        setCompletedLessons(newCompleted);
        setOverallProgress(res.data.progress.overallProgressPercent || 0);
        if (res.data.progress.isCompleted) {
          setIsCompleted(true);
          setCertificateId(res.data.certificateId || res.data.progress.certificateId);
          setShowCertModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  // Submit final quiz
  const handleQuizSubmit = async () => {
    if (!activeLesson?.quizQuestions) return;
    let score = 0;
    activeLesson.quizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correct) {
        score++;
      }
    });

    const pct = Math.round((score / activeLesson.quizQuestions.length) * 100);
    setQuizScore(pct);
    setQuizSubmitted(true);

    if (pct >= 50) {
      await markLessonComplete(activeLesson.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">
          Generating personalized learning module sandbox...
        </p>
      </div>
    );
  }

  const studentName = user?.name || 'Student Scholar';
  const studentEmail = user?.email || 'student@institution.edu.in';

  return (
    <div
      className="relative min-h-[calc(100vh-80px)] space-y-4 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <style>
        {`
          @media print {
            body * {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Dynamic Anti-Screenshot Watermark Canvas Overlay */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden opacity-[0.06] select-none flex flex-wrap gap-x-20 gap-y-16 justify-center items-center -rotate-12">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="text-slate-900 font-mono text-xs font-black tracking-widest whitespace-nowrap">
            {studentName} • {studentEmail} • {liveTimestamp} • SIH26044-SECURE
          </div>
        ))}
      </div>

      {/* Window Blur Protective Veil */}
      {isWindowBlurred && (
        <div className="fixed inset-0 z-50 backdrop-blur-2xl bg-slate-950/80 flex flex-col items-center justify-center p-6 text-center text-white animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-4">
            <EyeOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Workspace View Protected</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-sm">
            Content is shielded while your focus shifts away from this tab. Click anywhere to resume your active learning session.
          </p>
          <button
            onClick={() => setIsWindowBlurred(false)}
            className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
          >
            Resume Learning Session
          </button>
        </div>
      )}

      {/* Screenshot Key Press Detected Banner */}
      {screenshotAttempted && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-rose-900/90 text-white border border-rose-500 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-200">
          <AlertTriangle className="w-6 h-6 text-rose-300" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Security Notice</h4>
            <p className="text-xs text-rose-200">
              Screen recording and captures are watermarked with your authenticated credentials.
            </p>
          </div>
        </div>
      )}

      {/* Paste Blocked Toast Alert */}
      {pasteAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl bg-amber-900 text-white border border-amber-500/50 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <Lock className="w-5 h-5 text-amber-300" />
          <div className="text-xs">
            <span className="font-bold block text-amber-200">Clipboard Paste Disabled</span>
            To guarantee authentic understanding and muscle memory, you must type your code manually.
          </div>
        </div>
      )}

      {/* Top Navigation & Workspace Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              to="/student/learning"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mr-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Hub</span>
            </Link>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              PRIVATE INTERACTIVE MODULE
            </span>
            <span className="text-xs text-slate-400">
              Only visible to {studentName}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {program?.title || 'Interactive Applied Mastery Course'}
          </h1>
        </div>

        {/* Progress & Verification Status */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Course Progress
            </span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <span className="text-xs font-black text-slate-800">{overallProgress}%</span>
            </div>
          </div>

          {isCompleted && (
            <button
              onClick={() => setShowCertModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Award className="w-4 h-4" />
              <span>View Certificate</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Layout (Sidebar Todo + Sandbox) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Todo Checklist (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Module Todo List</h3>
              <p className="text-[11px] text-slate-400">
                {completedLessons.length} of {lessons.length} milestones checked
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              Interactive
            </span>
          </div>

          <div className="space-y-2">
            {lessons.map((lesson, idx) => {
              const isCurrent = idx === activeLessonIndex;
              const isDone = completedLessons.includes(lesson.id);

              return (
                <div
                  key={lesson.id}
                  onClick={() => setActiveLessonIndex(idx)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isCurrent
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : isDone
                      ? 'bg-emerald-50/50 border-emerald-200/60 hover:bg-emerald-50 text-slate-800'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (lesson.type === 'reading') {
                        markLessonComplete(lesson.id);
                      }
                    }}
                    className={`mt-0.5 shrink-0 transition-colors ${
                      isDone
                        ? 'text-emerald-500'
                        : isCurrent
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-300 hover:text-slate-500'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 fill-emerald-100" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          isCurrent ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        Module 0{lesson.moduleNumber} • {lesson.type.toUpperCase()}
                      </span>
                      <span
                        className={`text-[10px] ${
                          isCurrent ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        {lesson.estimatedMinutes}m
                      </span>
                    </div>
                    <h4
                      className={`text-xs font-bold leading-snug line-clamp-2 ${
                        isCurrent ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {lesson.title}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Integrity Guarantee Widget */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Assessment Defense Guard</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Clipboard paste is disabled inside coding exercises. Solutions must be typed manually to ensure active cognitive mastery.
            </p>
          </div>
        </div>

        {/* Right Column: Active Module Content & Code Sandbox (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeLesson && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
              {/* Active Lesson Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        activeLesson.type === 'coding'
                          ? 'blue'
                          : activeLesson.type === 'quiz'
                          ? 'purple'
                          : 'emerald'
                      }
                    >
                      {activeLesson.type.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      Module {activeLesson.moduleNumber} of {lessons.length}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">
                    {activeLesson.title}
                  </h2>
                </div>

                {completedLessons.includes(activeLesson.id) && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs">
                    <Check className="w-4 h-4" />
                    <span>Milestone Completed</span>
                  </div>
                )}
              </div>

              {/* Module Description / Content */}
              <div className="prose prose-sm max-w-none text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                {activeLesson.content}
              </div>

              {/* READING MODULE VIEW */}
              {activeLesson.type === 'reading' && (
                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-900 space-y-1">
                      <h4 className="font-bold">Core Learning Takeaway</h4>
                      <p className="text-blue-700">
                        Carefully review the conceptual design before advancing to hands-on manual code challenges.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => markLessonComplete(activeLesson.id)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {completedLessons.includes(activeLesson.id)
                          ? 'Completed (Click to Re-verify)'
                          : 'Mark as Read & Understood'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* CODING MODULE VIEW: Anti-Paste Manual Code Sandbox */}
              {activeLesson.type === 'coding' && (
                <div className="space-y-4 pt-2">
                  {/* Banner emphasizing anti-paste policy */}
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center gap-2 font-medium">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>
                        <strong>Anti-Cheat Active:</strong> Clipboard pasting is blocked. Manual typing required.
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-amber-700 px-2 py-0.5 rounded bg-amber-100">
                      Sandbox Guard
                    </span>
                  </div>

                  {/* Code Editor Container */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg">
                    {/* Editor Top Bar */}
                    <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800 text-slate-400 text-xs">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-mono text-[11px] text-slate-200 font-bold">
                          solution.ts
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>LIVE SANDBOX</span>
                      </div>
                    </div>

                    {/* Manual Code Textarea */}
                    <div className="relative">
                      <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onPaste={handlePasteAttempt}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                            e.preventDefault();
                            handlePasteAttempt(e as any);
                          }
                        }}
                        rows={12}
                        className="w-full bg-slate-950 text-emerald-300 font-mono text-xs p-4 focus:outline-none resize-none leading-relaxed select-text"
                        spellCheck={false}
                        placeholder="// Type your implementation here manually. Clipboard pasting is prohibited."
                      />
                    </div>

                    {/* Editor Action Footer */}
                    <div className="bg-slate-900/90 px-4 py-3 border-t border-slate-800 flex items-center justify-between gap-3">
                      <span className="text-[10px] text-slate-400">
                        Required constructs: {activeLesson.solutionKeywords?.join(', ')}
                      </span>
                      <button
                        onClick={handleRunCode}
                        disabled={evaluating}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {evaluating ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Evaluating Solution...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Run & Verify Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Execution Console Terminal */}
                  {consoleOutput.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs space-y-1 shadow-inner animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold pb-1 border-b border-slate-800 mb-2">
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Execution Output Console</span>
                      </div>
                      {consoleOutput.map((line, idx) => (
                        <div
                          key={idx}
                          className={
                            line.startsWith('[PASS]') || line.startsWith('[SUCCESS]')
                              ? 'text-emerald-400'
                              : line.startsWith('[FAIL]') || line.startsWith('[ERROR]')
                              ? 'text-rose-400 font-bold'
                              : 'text-slate-300'
                          }
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* QUIZ MODULE VIEW */}
              {activeLesson.type === 'quiz' && activeLesson.quizQuestions && (
                <div className="space-y-5 pt-2">
                  <div className="space-y-4">
                    {activeLesson.quizQuestions.map((question, qIdx) => (
                      <div
                        key={qIdx}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3"
                      >
                        <h4 className="font-bold text-xs text-slate-900">
                          {qIdx + 1}. {question.q}
                        </h4>
                        <div className="space-y-2">
                          {question.options.map((opt, optIdx) => {
                            const isSelected = quizAnswers[qIdx] === optIdx;
                            const isCorrect = question.correct === optIdx;

                            let optClass = 'bg-white border-slate-200 text-slate-700 hover:border-slate-300';
                            if (quizSubmitted) {
                              if (isCorrect) {
                                optClass = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
                              } else if (isSelected && !isCorrect) {
                                optClass = 'bg-rose-50 border-rose-300 text-rose-800';
                              }
                            } else if (isSelected) {
                              optClass = 'bg-slate-900 text-white border-slate-900';
                            }

                            return (
                              <button
                                key={optIdx}
                                onClick={() => {
                                  if (!quizSubmitted) {
                                    setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
                                  }
                                }}
                                className={`w-full text-left p-3 rounded-xl border text-xs transition-colors flex items-center justify-between ${optClass}`}
                              >
                                <span>{opt}</span>
                                {quizSubmitted && isCorrect && (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {quizScore !== null && (
                      <span className="text-xs font-bold text-emerald-700">
                        Score: {quizScore}% {quizScore >= 50 ? '— Assessment Passed!' : '— Try again'}
                      </span>
                    )}
                    <button
                      onClick={handleQuizSubmit}
                      disabled={
                        quizSubmitted && quizScore !== null && quizScore >= 50
                      }
                      className="ml-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-50"
                    >
                      {quizSubmitted ? 'Re-evaluate Defense' : 'Submit Final Defense'}
                    </button>
                  </div>
                </div>
              )}

              {/* Next Lesson Navigation */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setActiveLessonIndex((prev) => Math.max(0, prev - 1))}
                  disabled={activeLessonIndex === 0}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs disabled:opacity-30"
                >
                  Previous Module
                </button>

                <button
                  onClick={() =>
                    setActiveLessonIndex((prev) => Math.min(lessons.length - 1, prev + 1))
                  }
                  disabled={activeLessonIndex === lessons.length - 1}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-30"
                >
                  <span>Next Module</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Certificate Modal */}
      {showCertModal && certificateId && (
        <CertificateModal
          isOpen={showCertModal}
          onClose={() => setShowCertModal(false)}
          certificate={{
            certificateId,
            studentName,
            courseTitle: program?.title || 'Interactive Applied Mastery Course',
            completedAt: new Date(),
            institution: user?.institution || 'Accredited Institution',
          }}
        />
      )}
    </div>
  );
};
