import React from 'react';
import { Award, TrendingUp } from 'lucide-react';
import { getScoreGrade } from '../../utils/formatters';

interface GaugeScoreProps {
  score: number;
  percentile?: number;
  size?: number;
  strokeWidth?: number;
  showDetails?: boolean;
}

export const GaugeScore: React.FC<GaugeScoreProps> = ({
  score,
  percentile = 92,
  size = 180,
  strokeWidth = 14,
  showDetails = true
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Use a 270 degree arc for gauge look
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const gradeInfo = getScoreGrade(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`transition-all duration-1000 ease-out ${gradeInfo.ring}`}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{score}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-0.5">out of 100</span>
          <span className={`text-xs font-medium mt-1 ${gradeInfo.color}`}>
            {gradeInfo.grade.split(' ')[0]}
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
            <Award className="w-3.5 h-3.5" />
            <span>Top {100 - percentile}% Nationally</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Verified Skill Index</span>
          </div>
        </div>
      )}
    </div>
  );
};
