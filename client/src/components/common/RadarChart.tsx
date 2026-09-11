import React from 'react';
import { SkillItem } from '../../types';

interface RadarChartProps {
  skills: SkillItem[];
  size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({ skills, size = 380 }) => {
  if (!skills || skills.length === 0) return null;

  const center = size / 2;
  const radius = center - 50;
  const totalAxes = skills.length;
  const angleSlice = (Math.PI * 2) / totalAxes;

  // Concentric levels (20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Helper to compute coordinates on the radar grid
  const getCoordinates = (value: number, index: number, maxRadius: number) => {
    const angle = index * angleSlice - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Build polygon path for student skill levels
  const studentPoints = skills
    .map((s, i) => {
      const { x, y } = getCoordinates(s.level, i, radius);
      return `${x},${y}`;
    })
    .join(' ');

  // Industry benchmark handling: Only plot when real benchmark data exists
  const benchmarkedSkillsCount = skills.filter(
    (s) => typeof s.industryBenchmark === 'number' && s.industryBenchmark !== null
  ).length;
  const hasBenchmarks = benchmarkedSkillsCount > 0;

  // Build benchmark points: interpolate center (0) if benchmark is unavailable on that axis
  const benchmarkPoints = hasBenchmarks
    ? skills
        .map((s, i) => {
          const val =
            typeof s.industryBenchmark === 'number' && s.industryBenchmark !== null
              ? s.industryBenchmark
              : 0;
          const { x, y } = getCoordinates(val, i, radius);
          return `${x},${y}`;
        })
        .join(' ')
    : '';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background circular / polygon webs */}
        {levels.map((level, lvlIdx) => {
          const levelRadius = radius * level;
          const levelPoints = skills
            .map((_, i) => {
              const angle = i * angleSlice - Math.PI / 2;
              const x = center + levelRadius * Math.cos(angle);
              const y = center + levelRadius * Math.sin(angle);
              return `${x},${y}`;
            })
            .join(' ');

          return (
            <g key={lvlIdx}>
              <polygon
                points={levelPoints}
                fill="transparent"
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray={lvlIdx === levels.length - 1 ? 'none' : '3 3'}
              />
              <text
                x={center + 5}
                y={center - levelRadius + 12}
                fill="#94a3b8"
                fontSize="10"
                fontWeight="500"
              >
                {Math.round(level * 100)}%
              </text>
            </g>
          );
        })}

        {/* Axes lines */}
        {skills.map((_, i) => {
          const angle = i * angleSlice - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Industry Benchmark Polygon (rendered only if real data exists) */}
        {hasBenchmarks && (
          <polygon
            points={benchmarkPoints}
            fill="rgba(59, 130, 246, 0.12)"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        )}

        {/* Student Level Polygon */}
        <polygon
          points={studentPoints}
          fill="rgba(16, 185, 129, 0.25)"
          stroke="#10b981"
          strokeWidth="2.5"
        />

        {/* Data points for student */}
        {skills.map((s, i) => {
          const { x, y } = getCoordinates(s.level, i, radius);
          return (
            <circle
              key={`student-pt-${i}`}
              cx={x}
              cy={y}
              r="4.5"
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="2"
            />
          );
        })}

        {/* Data points for industry benchmark if present */}
        {skills.map((s, i) => {
          if (typeof s.industryBenchmark !== 'number' || s.industryBenchmark === null) return null;
          const { x, y } = getCoordinates(s.industryBenchmark, i, radius);
          return (
            <circle
              key={`benchmark-pt-${i}`}
              cx={x}
              cy={y}
              r="3.5"
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Axis Labels */}
        {skills.map((s, i) => {
          const angle = i * angleSlice - Math.PI / 2;
          const labelDist = radius + 24;
          const x = center + labelDist * Math.cos(angle);
          const y = center + labelDist * Math.sin(angle);

          const isRight = Math.cos(angle) > 0.1;
          const isLeft = Math.cos(angle) < -0.1;
          const anchor = isRight ? 'start' : isLeft ? 'end' : 'middle';

          const hasBench = typeof s.industryBenchmark === 'number' && s.industryBenchmark !== null;

          return (
            <g key={`label-${i}`}>
              <text
                x={x}
                y={y}
                textAnchor={anchor}
                className="fill-slate-700 text-[11px] font-medium select-none"
              >
                {s.name.length > 20 ? `${s.name.slice(0, 18)}...` : s.name}
              </text>
              <text
                x={x}
                y={y + 12}
                textAnchor={anchor}
                className="fill-emerald-600 font-bold text-[10px]"
              >
                {s.level}%{' '}
                {hasBench ? (
                  <tspan className="fill-blue-500 font-normal">({s.industryBenchmark}%)</tspan>
                ) : (
                  <tspan className="fill-slate-400 font-normal italic">(No Benchmark)</tspan>
                )}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-emerald-500/20 border-2 border-emerald-500"></div>
          <span className="text-slate-700 font-medium">Your Competency Score</span>
        </div>
        {hasBenchmarks ? (
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded bg-blue-500/20 border-2 border-dashed border-blue-500"></div>
            <span className="text-slate-700 font-medium">Industry Benchmark ({benchmarkedSkillsCount} of {skills.length} available)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400 italic text-[11px]">
            <span>(No active industry benchmarks published for current skills)</span>
          </div>
        )}
      </div>
    </div>
  );
};
