import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import {
  ShieldAlert,
  Users,
  Building2,
  Award,
  TrendingUp,
  FileCheck,
  Download,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { MouReviewModal } from '../../components/common/MouReviewModal';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [partners, setPartners] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, mRes] = await Promise.all([
        api.admin.getDashboardStats(),
        api.admin.getPartners(),
        api.mous.getProposals(),
      ]);
      setStats(sRes.data);
      setPartners(pRes.data || []);
      setProposals(mRes.data || []);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const isNewUser = (user?.loginCount ?? 1) <= 1;

  return (
    <div className="space-y-8">
      {/* Executive Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>National Directorate Admin Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isNewUser ? 'Welcome to Institutional Oversight Dashboard' : 'Welcome back to Institutional Oversight Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
            Supervising accredited technical & medical institutions, verified student scholars, and active industry collaboration MoUs nationwide.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/admin/reports"
              className="px-4 py-2 rounded-xl bg-white text-purple-950 font-bold text-xs hover:bg-purple-50 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Accreditation Report</span>
            </Link>
            <Link
              to="/admin/users"
              className="px-4 py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 text-white font-semibold text-xs border border-purple-400/30 transition-colors"
            >
              Manage Industry Partners ({partners.filter(p => p.status === 'Pending').length} Pending)
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Scholars"
          value={(stats?.totalStudents ?? 0).toString()}
          subtitle="Verified active students"
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Placement & Internship Rate"
          value={stats?.overallPlacementRate || '0%'}
          subtitle="Verified Industry Absorption"
          icon={Award}
          color="emerald"
        />
        <StatCard
          title="Active Corporate MoUs"
          value={(stats?.mouSignedCount ?? partners.length).toString()}
          subtitle="Approved Enterprise Partnerships"
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="National Avg. Skill Index"
          value={stats?.avgSkillIndex ? `${stats.avgSkillIndex} / 100` : 'Pending Assessment'}
          subtitle="Calculated on verified tests"
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* Industry MoUs Snapshot Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Partner Enterprise MoU Status</h3>
            <p className="text-xs text-slate-500">Corporate accreditation status and current intern quotas</p>
          </div>
          <Link to="/admin/users" className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1">
            <span>Manage All Partners</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="pb-3 px-2">Partner Enterprise</th>
                <th className="pb-3 px-2">Domain Sector</th>
                <th className="pb-3 px-2">MoU Validity</th>
                <th className="pb-3 px-2">Active Interns</th>
                <th className="pb-3 px-2">Total Hired</th>
                <th className="pb-3 px-2 text-right">Accreditation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No corporate partners registered in database yet. New employer applications will appear here for accreditation.
                  </td>
                </tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-2 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3.5 px-2 text-slate-600">{p.category}</td>
                    <td className="py-3.5 px-2 text-slate-500">{p.mouValidUntil}</td>
                    <td className="py-3.5 px-2 font-semibold text-emerald-700">{p.activeInterns} Scholars</td>
                    <td className="py-3.5 px-2 font-bold text-slate-800">{p.totalHired} Placements</td>
                    <td className="py-3.5 px-2 text-right">
                      <Badge variant={p.status === 'Approved' ? 'emerald' : 'amber'} size="sm">
                        {p.status.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Directorate MoU Review & Digital Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                GOVERNANCE LEDGER
              </span>
              <span className="text-xs text-slate-400">Formal Agreements</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Industry-Academia MoU Proposals & Digital Seals
            </h3>
            <p className="text-xs text-slate-500">
              Review collaborative research agreements, verify student internship quotas, and apply official cryptographic seals
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {proposals.length} Total Registered
          </span>
        </div>

        {proposals.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No active MoU proposals pending</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Proposals submitted by academicians or industry partners will appear here for administrative endorsement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-3 px-2">MoU Title</th>
                  <th className="pb-3 px-2">Initiator</th>
                  <th className="pb-3 px-2">Target Organization</th>
                  <th className="pb-3 px-2">Intern Quota</th>
                  <th className="pb-3 px-2">Funding</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proposals.map((prop) => (
                  <tr key={prop._id || prop.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-2">
                      <span className="font-bold text-slate-900 block">{prop.title}</span>
                      {prop.digitalSealId && (
                        <span className="text-[10px] font-mono text-emerald-600 block">
                          Seal: {prop.digitalSealId}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-2 text-slate-700">
                      <span className="font-semibold block">{prop.initiatorName}</span>
                      <span className="text-[10px] text-slate-400">{prop.initiatorInstitution}</span>
                    </td>
                    <td className="py-3.5 px-2 font-medium text-slate-800">
                      {prop.targetOrganization}
                    </td>
                    <td className="py-3.5 px-2 text-slate-700 font-semibold">
                      {prop.internshipQuota} Students
                    </td>
                    <td className="py-3.5 px-2 font-bold text-emerald-700">
                      {prop.grantFunding}
                    </td>
                    <td className="py-3.5 px-2">
                      <Badge
                        variant={
                          prop.status === 'approved'
                            ? 'emerald'
                            : prop.status === 'rejected'
                            ? 'rose'
                            : 'amber'
                        }
                        size="sm"
                      >
                        {prop.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      {prop.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Sealed</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedProposal(prop)}
                          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-xs"
                        >
                          Review & Stamp
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MoU Review Modal */}
      {selectedProposal && (
        <MouReviewModal
          isOpen={true}
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onReviewed={() => {
            fetchAdminData();
            setSelectedProposal(null);
          }}
        />
      )}
    </div>
  );
};
