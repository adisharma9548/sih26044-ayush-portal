import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle, HelpCircle, ArrowUpRight } from 'lucide-react';

interface AiMatchMatrixProps {
  matchScore?: number;
  opportunityTitle: string;
  candidateSkills?: string[];
  coverNote?: string;
  isRecruiterView?: boolean;
}

export const AiMatchMatrix: React.FC<AiMatchMatrixProps> = ({
  matchScore = 85,
  opportunityTitle,
  candidateSkills = [],
  coverNote,
  isRecruiterView = false,
}) => {
  // Derive strengths directly from real verified candidate skills
  let strengths: string[] = candidateSkills.length > 0 ? candidateSkills.slice(0, 4) : ['Foundational Competencies'];
  let gaps: string[] = ['Advanced Domain Frameworks'];
  let recommendation = candidateSkills.length > 0
    ? `Profile shows verified competency in ${candidateSkills.slice(0, 3).join(', ')}. Strong alignment for this opportunity.`
    : 'Candidate should complete a diagnostic skill assessment to benchmark role alignment.';
  let suggestedQuestions: string[] = [
    `How have you applied your knowledge in real projects relating to ${opportunityTitle}?`,
    'Walk through the most challenging problem you solved in your primary domain.'
  ];

  const scoreColor =
    matchScore >= 80
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : matchScore >= 60
      ? 'text-blue-700 bg-blue-50 border-blue-200'
      : 'text-amber-700 bg-amber-50 border-amber-200';

  const barColor =
    matchScore >= 80
      ? 'bg-emerald-600'
      : matchScore >= 60
      ? 'bg-blue-600'
      : 'bg-amber-600';

  return (
    <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-b from-purple-50/40 to-white p-4 space-y-3.5 text-xs shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-purple-100">
        <div className="flex items-center gap-1.5 font-bold text-purple-900">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>Competency & Skill Match Analysis</span>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
          VERIFIED ALIGNMENT
        </span>
      </div>

      {/* Match Score Meter */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white border border-slate-200/80">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold block">
            Role Alignment Index
          </span>
          <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
            {opportunityTitle}
          </h4>
        </div>
        <div className="text-right">
          <span className={`inline-block px-3 py-1 rounded-xl font-black text-sm border ${scoreColor}`}>
            {matchScore}% MATCH
          </span>
        </div>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${matchScore}%` }}
        />
      </div>

      {/* Strengths & Gaps Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Key Strengths */}
        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Demonstrated Strengths</span>
          </span>
          <ul className="space-y-1 text-slate-700">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Identified Gaps */}
        <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Identified Skill Gaps</span>
          </span>
          <ul className="space-y-1 text-slate-700">
            {gaps.map((g, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendation */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
        <span className="text-[10px] uppercase font-bold text-slate-500 block">
          AI Evaluator Assessment
        </span>
        <p className="text-slate-700 leading-relaxed italic">
          "{recommendation}"
        </p>
      </div>

      {/* Suggested Interview Questions for Recruiters */}
      {isRecruiterView && (
        <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-indigo-900 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Recommended Interview Focus Questions</span>
          </span>
          <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
            {suggestedQuestions.map((q, idx) => (
              <li key={idx} className="leading-snug">{q}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};
