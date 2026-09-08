import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LineChart, Users, AlertTriangle, CheckCircle2, TrendingUp, BookOpen } from 'lucide-react';

export const StudentFacultyProgressPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bridgeTriggered, setBridgeTriggered] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await api.admin.getProgressAnalytics();
      setData(res.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleTriggerBridge = (studentName: string) => {
    setBridgeTriggered((prev) => ({ ...prev, [studentName]: true }));
  };

  if (loading || !data) {
    return <div className="py-24 text-center text-xs text-slate-400">Compiling institutional progress matrix...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
            NEP 2020 CREDIT MONITORING
          </span>
          <span className="text-xs text-slate-400">Institutional Cohort Diagnostics</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Student & Faculty Progress Analytics
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor departmental skill score averages, track growth trajectories, and trigger targeted bridge interventions
        </p>
      </div>

      {/* Grid: Department Score Averages & Monthly Growth Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Department Averages */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">Departmental Competency Averages</h3>
          {data.departmentAverages?.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No departmental assessment data available</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Department competency scores will compute automatically as registered students complete diagnostic evaluations.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {data.departmentAverages.map((dept: any, idx: number) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-800">{dept.department}</span>
                    <span className="font-bold text-purple-700">{dept.score}% ({dept.students} Scholars)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
                      style={{ width: `${dept.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trend Bar Visual */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">National Cohort Skill Trajectory</h3>
            <p className="text-xs text-slate-500 mt-0.5">Average Skill Index growth over recorded months</p>
          </div>

          {data.skillTrend?.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl my-auto">
              <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No historical trend data recorded yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Monthly progression trajectory will plot automatically as assessment attempts are logged in the database.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between gap-4 h-48 pt-6 border-b border-slate-100 px-2">
                {data.skillTrend.map((t: any, idx: number) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700">{t.index}%</span>
                    <div
                      className="w-full bg-emerald-500 rounded-t-xl transition-all duration-500 hover:bg-emerald-600"
                      style={{ height: `${Math.max(12, (t.index / 100) * 140)}px` }}
                    />
                    <span className="text-[10px] font-bold text-slate-400">{t.month}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Real-time cohort competency trajectory from verified student test evaluations.</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* At-Risk Scholars Intervention Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Scholars Requiring Skill Remediation</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Students whose skill score falls below the 60% industry hiring threshold
          </p>
        </div>

        {data.atRiskStudents?.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-800">All Registered Scholars Meet Benchmarks</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              No students currently below the 60% competency threshold requiring mandatory intervention.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-2">Student Name</th>
                  <th className="pb-3 px-2">Affiliated College</th>
                  <th className="pb-3 px-2">Current Score</th>
                  <th className="pb-3 px-2">Primary Gap</th>
                  <th className="pb-3 px-2 text-right">Intervention Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.atRiskStudents.map((st: any, idx: number) => {
                  const assigned = bridgeTriggered[st.name];
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-2 font-bold text-slate-900">{st.name}</td>
                      <td className="py-3.5 px-2 text-slate-600">{st.institute}</td>
                      <td className="py-3.5 px-2 font-bold text-rose-600">{st.score}%</td>
                      <td className="py-3.5 px-2 text-slate-700">{st.gap}</td>
                      <td className="py-3.5 px-2 text-right">
                        {assigned ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Bridge Enrolled
                          </span>
                        ) : (
                          <button
                            onClick={() => handleTriggerBridge(st.name)}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition-colors cursor-pointer"
                          >
                            Auto-Assign Bridge
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
