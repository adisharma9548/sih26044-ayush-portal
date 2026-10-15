import React from 'react';
import { TrendingUp, Users, Search, Building2, Briefcase, CheckCircle2 } from 'lucide-react';

interface FunnelItem {
  stage: string;
  count: number;
  color: string;
}

export const ApplicationFunnelChart: React.FC<{
  applied: number;
  reviewed: number;
  shortlisted: number;
  rejected: number;
}> = ({ applied, reviewed, shortlisted, rejected }) => {
  const total = Math.max(applied + reviewed + shortlisted + rejected, 1);
  const items: FunnelItem[] = [
    { stage: 'Applied', count: applied, color: 'bg-blue-500' },
    { stage: 'Under Review', count: reviewed, color: 'bg-amber-500' },
    { stage: 'Shortlisted', count: shortlisted, color: 'bg-emerald-500' },
    { stage: 'Rejected', count: rejected, color: 'bg-slate-400' },
  ];

  const hasData = applied > 0 || reviewed > 0 || shortlisted > 0 || rejected > 0;

  if (!hasData) {
    return (
      <div className="py-8 text-center text-slate-400 text-sm">
        <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
        <p>No application funnel data yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="region" aria-label="Application Funnel Pipeline">
      {items.map((item, idx) => {
        const pct = Math.round((item.count / total) * 100);
        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>{item.stage}</span>
              <span>{item.count} ({pct}%)</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${item.color} transition-all duration-500`}
                style={{ width: `${Math.max(pct, item.count > 0 ? 4 : 0)}%` }}
                role="progressbar"
                aria-valuenow={item.count}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-label={`${item.stage}: ${item.count} candidates`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const UserGrowthBarChart: React.FC<{
  growth: Array<{ month: string; count: number }>;
}> = ({ growth }) => {
  if (!growth || growth.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400 text-sm">
        <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
        <p>No user growth cohorts recorded yet.</p>
      </div>
    );
  }

  const maxCount = Math.max(...growth.map((g) => g.count), 1);

  return (
    <div className="space-y-4" role="region" aria-label="Monthly User Growth Chart">
      <div className="flex items-end justify-between gap-2 h-44 pt-6 px-2">
        {growth.map((item, idx) => {
          const heightPct = Math.round((item.count / maxCount) * 100);
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
              <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.count}
              </span>
              <div
                className="w-full max-w-[36px] bg-gradient-to-t from-purple-700 to-indigo-500 rounded-t-lg transition-all duration-300 hover:from-purple-800 hover:to-indigo-600"
                style={{ height: `${Math.max(heightPct, 6)}%` }}
                role="img"
                aria-label={`${item.month}: ${item.count} registered users`}
              />
              <span className="text-[10px] font-medium text-slate-500 truncate max-w-full">
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const TopSkillsDistribution: React.FC<{
  skills: Array<{ skill: string; count: number }>;
}> = ({ skills }) => {
  if (!skills || skills.length === 0) {
    return (
      <div className="py-6 text-center text-slate-400 text-sm">
        <p>No skill requirements recorded in active postings.</p>
      </div>
    );
  }

  const maxCount = Math.max(...skills.map((s) => s.count), 1);

  return (
    <div className="space-y-2.5" role="region" aria-label="Top In-Demand Skills">
      {skills.map((s, idx) => {
        const pct = Math.round((s.count / maxCount) * 100);
        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>{s.skill}</span>
              <span className="text-slate-500 font-normal">{s.count} postings</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const ProfileCompletionCard: React.FC<{
  completion: number;
}> = ({ completion }) => {
  const isComplete = completion >= 100;
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
      <div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Profile Strength
        </span>
        <h3 className="text-xl font-bold text-slate-900 mt-0.5">
          {completion}% Completed
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {isComplete
            ? 'Your profile is fully verified for recruiters.'
            : 'Complete remaining fields to increase recruiter discovery.'}
        </p>
      </div>

      <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-slate-100"
            strokeWidth="3.5"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className={isComplete ? 'text-emerald-500' : 'text-emerald-600'}
            strokeDasharray={`${completion}, 100`}
            strokeWidth="3.5"
            strokeLinecap="round"
            stroke="currentColor"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <span className="absolute text-xs font-bold text-slate-800">
          {completion}%
        </span>
      </div>
    </div>
  );
};
