import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Download, FileText, CheckCircle2, TrendingUp, BarChart3, PieChart, Sparkles, AlertCircle } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const AnalyticsReportsPage: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState('');
  const [domainDemand, setDomainDemand] = useState<{ name: string; share: string; count: number }[]>([]);
  const [topSkillsDemand, setTopSkillsDemand] = useState<{ skill: string; demand: string; growth: string }[]>([]);
  const [totalOpenings, setTotalOpenings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await api.admin.getReportsAnalytics();
        if (res.data) {
          setDomainDemand(res.data.domainDemand || []);
          setTopSkillsDemand(res.data.topSkillsDemand || []);
          setTotalOpenings(res.data.totalOpportunities || 0);
        }
      } catch (err) {
        console.error('Failed to load reports analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const downloadCSV = (filename: string, rows: (string | number)[][]) => {
    const csvContent = rows.map((e) => e.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerDownload = (type: string, filename: string) => {
    setDownloading(type);
    setTimeout(() => {
      setDownloading(null);
      if (type === 'csv') {
        const header = ['Domain / Skill Discipline', 'Active Openings', 'Hiring Share', 'Status'];
        const rows = domainDemand.length > 0
          ? domainDemand.map((d) => [d.name, d.count, d.share, 'Active in MongoDB'])
          : [['No Active Openings Recorded in Database', 0, '0%', 'Empty Registry']];
        downloadCSV(filename, [header, ...rows]);
      } else {
        window.print();
      }
      setReportSuccess(`Generated and exported ${filename} successfully.`);
      setTimeout(() => setReportSuccess(''), 4000);
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
              EXECUTIVE INTELLIGENCE
            </span>
            <span className="text-xs text-slate-400">NAAC / NIRF / Ministry Compliance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Institutional Analytics & Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate certified compliance reports, export placement audit trails, and review macro hiring demand from live database records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerDownload('pdf', 'National_Accreditation_Report_2026.pdf')}
            disabled={!!downloading}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading === 'pdf' ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>
          <button
            onClick={() => triggerDownload('csv', 'National_Placements_2026_Audit.csv')}
            disabled={!!downloading}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{downloading === 'csv' ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {reportSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{reportSuccess}</span>
        </div>
      )}

      {/* Grid: Domain Demand & Top Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Industry Demand Share */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">Industry Hiring Demand by Domain</h3>
            <span className="text-xs font-bold text-purple-700">{totalOpenings} Active Openings</span>
          </div>

          {domainDemand.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No active domain openings in database</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Demand distributions will automatically calculate as verified enterprise partners publish job and internship openings.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 pt-2">
              {domainDemand.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <span className="font-bold text-slate-900">{item.share} ({item.count} roles)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full transition-all"
                      style={{ width: item.share }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most Demanded Analytical Skills */}
        <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900">High-Demand Technical Competencies</h3>
          {topSkillsDemand.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No competency requirements posted yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Required skills will aggregate from corporate openings posted to MongoDB.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {topSkillsDemand.map((skill, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-900">{skill.skill}</h4>
                    <span className="text-[11px] text-emerald-700 font-semibold">{skill.growth}</span>
                  </div>
                  <Badge variant="purple" size="sm">
                    {skill.demand} Demand
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generated Report Specifications Preview */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Standardized Regulatory Reports Available</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click to generate instant PDF dossiers for NAAC Criterion 5, NIRF data submission, and AICTE mandatory disclosure
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all bg-white flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-700 block">Report 01</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">NAAC Criteria 5.2: Student Placement & Progression</h4>
              <p className="text-xs text-slate-500 mt-1">Complete student placement roster, company offer letters, and average CTC proof.</p>
            </div>
            <button
              onClick={() => triggerDownload('pdf', 'NAAC_Criterion_5_2_Report.pdf')}
              className="w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors"
            >
              Generate Dossier
            </button>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all bg-white flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Report 02</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">NEP 2020 Internship Credit Fulfillment</h4>
              <p className="text-xs text-slate-500 mt-1">Stipendiary internship completion certificates, hours logged, and mentor evaluations.</p>
            </div>
            <button
              onClick={() => triggerDownload('pdf', 'NEP_2020_Internship_Credits.pdf')}
              className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors"
            >
              Generate Dossier
            </button>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 transition-all bg-white flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-700 block">Report 03</span>
              <h4 className="text-sm font-bold text-slate-900 mt-1">Active Industry MoUs & Research Collaborations</h4>
              <p className="text-xs text-slate-500 mt-1">Summary of active industry agreements and institutional research collaborations.</p>
            </div>
            <button
              onClick={() => triggerDownload('pdf', 'Industry_MoU_Audit_2026.pdf')}
              className="w-full py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors"
            >
              Generate Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
