import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { SkillProfile } from '../../types';
import { RadarChart } from '../../components/common/RadarChart';
import { Badge } from '../../components/common/Badge';
import { Award, ArrowRight, BookOpen, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';

export const SkillProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<SkillProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const res = await api.skills.getProfile();
      setProfile(res.data);
      setLoading(false);
    };
    fetchProfile();
  }, []);

  if (loading || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              NATIONAL SKILL MAPPING
            </span>
            <span className="text-xs text-slate-400">Last Calibrated: {profile.lastAssessmentDate}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Skill Profile & Industry Gap Analysis
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Visual benchmarking of your technical, scientific, and domain competencies against industry hiring benchmarks
          </p>
        </div>

        <Link
          to="/student/assessment"
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors self-start sm:self-auto flex items-center gap-2 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Retake Assessment</span>
        </Link>
      </div>

      {/* Main Grid: Radar Chart + Skill Competency Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Radar Chart Container */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col items-center justify-center text-center">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Competency Radar Overlay</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Green polygon represents your level; Blue dashed line is the industry hiring benchmark.
            </p>
          </div>

          <RadarChart skills={profile.skills} size={340} />
        </div>

        {/* Skill Breakdown List */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Verified Competencies Roster</h3>
          <div className="space-y-4 pt-1">
            {profile.skills.map((s, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{s.name}</span>
                    {s.verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-700">{s.level}%</span>
                </div>

                {/* Progress bar comparing student vs benchmark */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${s.level}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Category: {s.category}</span>
                    <span>Required Benchmark: {s.industryBenchmark}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gap Analysis & Action Recommendations */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Industry Gap Analysis & Bridge Modules</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Targeted training recommendations to bridge detected deficiencies for higher-stipend internships
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-3 px-2">Competency Domain</th>
                <th className="pb-3 px-2">Current Level</th>
                <th className="pb-3 px-2">Industry Standard</th>
                <th className="pb-3 px-2">Gap Delta</th>
                <th className="pb-3 px-2">Action Priority</th>
                <th className="pb-3 px-2 text-right">Recommended Bridge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profile.gapAnalysis.map((gap, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-2 font-bold text-slate-900">{gap.skill}</td>
                  <td className="py-3.5 px-2 text-slate-700 font-semibold">{gap.currentLevel}%</td>
                  <td className="py-3.5 px-2 text-blue-600 font-semibold">{gap.requiredLevel}%</td>
                  <td className="py-3.5 px-2 font-bold text-amber-600">-{gap.gapPercentage}%</td>
                  <td className="py-3.5 px-2">
                    <Badge variant={gap.priority === 'High' ? 'rose' : gap.priority === 'Medium' ? 'amber' : 'blue'}>
                      {gap.priority} Priority
                    </Badge>
                  </td>
                  <td className="py-3.5 px-2 text-right">
                    <Link
                      to="/student/learning"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Start Course</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
