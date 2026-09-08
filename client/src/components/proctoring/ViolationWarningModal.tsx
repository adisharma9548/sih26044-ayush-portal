import React from 'react';
import { AlertOctagon, AlertTriangle, ShieldAlert, Maximize2 } from 'lucide-react';
import { ProctoringViolation } from '../../hooks/useExamProctoring';

interface Props {
  warning: ProctoringViolation | null;
  strikes: number;
  maxStrikes: number;
  onResume: () => void;
  isTerminated?: boolean;
}

export const ViolationWarningModal: React.FC<Props> = ({
  warning,
  strikes,
  maxStrikes,
  onResume,
  isTerminated = false,
}) => {
  if (!warning && !isTerminated) return null;

  const isFinalStrike = strikes >= maxStrikes || isTerminated;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/85 backdrop-blur-lg animate-fadeIn">
      <div className="bg-white rounded-3xl border-2 border-red-500 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto animate-pulse">
          {isFinalStrike ? (
            <AlertOctagon className="w-9 h-9" />
          ) : (
            <ShieldAlert className="w-9 h-9" />
          )}
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {isFinalStrike
                ? 'EXAM TERMINATION TRIGGERED'
                : `INTEGRITY WARNING: STRIKE ${strikes} OF ${maxStrikes}`}
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            {isFinalStrike
              ? 'Assessment Session Terminated'
              : 'Proctoring Lockdown Violation Detected'}
          </h3>

          <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {warning?.details ||
              'A prohibited action was detected by the exam proctoring monitor (such as leaving fullscreen, switching browser tabs, or face leaving camera frame).'}
          </p>
        </div>

        {isFinalStrike ? (
          <div className="space-y-3">
            <p className="text-xs text-red-600 font-semibold">
              You have accumulated {maxStrikes} consecutive integrity violations. Your exam session is being auto-submitted and flagged for academic review.
            </p>
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[11px] text-slate-500">
              You have <strong>{Math.max(0, maxStrikes - strikes)}</strong> warning(s) remaining before automatic disqualification and auto-submission.
            </p>

            <button
              type="button"
              onClick={onResume}
              className="w-full py-3 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Resume Fullscreen Exam & Clear Warning</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};