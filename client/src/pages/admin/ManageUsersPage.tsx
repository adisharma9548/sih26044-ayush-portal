import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  UserCheck,
  Building2,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  ShieldCheck,
  Users
} from 'lucide-react';

export const ManageUsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'partners' | 'students'>('partners');
  const [partners, setPartners] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
  const [actionNotice, setActionNotice] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [partnersRes, studentsRes] = await Promise.all([
          api.admin.getPartners().catch(() => ({ data: [] })),
          api.admin.getStudents().catch(() => ({ data: [] })),
        ]);
        setPartners(partnersRes.data || []);
        setStudents(studentsRes.data || []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleApprove = async (id: string, name: string) => {
    await api.admin.approvePartner(id);
    setPartners((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'Approved' } : p))
    );
    setActionNotice(`Accreditation approved for ${name}.`);
    setTimeout(() => setActionNotice(''), 3000);
  };

  const handleBlock = async (id: string, name: string) => {
    await api.admin.blockPartner(id);
    setPartners((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'Blocked' } : p))
    );
    setActionNotice(`Partner status updated to Blocked for ${name}.`);
    setTimeout(() => setActionNotice(''), 3000);
  };

  const filteredPartners = partners.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const filteredStudents = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.institution && s.institution.toLowerCase().includes(q)) ||
      (s.degree && s.degree.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
            NATIONAL STAKEHOLDER REGISTRY
          </span>
          <span className="text-xs text-slate-400">Directorate Administration</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Manage Users & Industry Partners
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Verify corporate employer registrations, manage university MoUs, and oversee institutional rosters
        </p>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('partners')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'partners'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Industry Partners ({partners.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'students'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Students & Scholars ({students.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={activeTab === 'partners' ? 'Search partner enterprise or sector...' : 'Search student by name, email, degree or institute...'}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Partners Table */}
      {activeTab === 'partners' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Organization Name</th>
                  <th className="py-3.5 px-4">Category Sector</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">MoU Status</th>
                  <th className="py-3.5 px-4">Accreditation</th>
                  <th className="py-3.5 px-4 text-right">Verification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPartners.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-4 px-4 text-slate-600">{p.category}</td>
                    <td className="py-4 px-4 text-slate-500">{p.location}</td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-slate-800 block">{p.mouStatus}</span>
                      <span className="text-[10px] text-slate-400">Valid until {p.mouValidUntil}</span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge
                        variant={p.status === 'Approved' ? 'emerald' : p.status === 'Pending' ? 'amber' : 'rose'}
                        size="sm"
                      >
                        {p.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      {p.status === 'Pending' && (
                        <button
                          onClick={() => handleApprove(p.id, p.name)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                        >
                          Approve Partner
                        </button>
                      )}
                      {p.status === 'Approved' && (
                        <button
                          onClick={() => handleBlock(p.id, p.name)}
                          className="px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs transition-colors"
                        >
                          Block
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedPartner(p)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPartners.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No corporate partners found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Students Table */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Student Name</th>
                    <th className="py-3.5 px-4">Official Email</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Institution</th>
                    <th className="py-3.5 px-4">UGC Degree</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((s: any) => (
                    <tr key={s._id || s.id || s.email} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-900">{s.name}</td>
                      <td className="py-4 px-4 text-slate-600">{s.email}</td>
                      <td className="py-4 px-4">
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {s.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600">{s.institution || '—'}</td>
                      <td className="py-4 px-4 text-slate-600 font-medium">{s.degree || '—'}</td>
                      <td className="py-4 px-4">
                        <Badge variant={s.verified ? 'emerald' : 'slate'} size="sm">
                          {s.verified ? 'VERIFIED' : 'ACTIVE'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center py-12">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Users className="w-7 h-7 text-slate-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">No registered students found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search
                  ? 'No student records matched your search query.'
                  : 'Registered students and job seekers will appear here automatically from MongoDB as they sign up.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Partner Details Modal */}
      {selectedPartner && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedPartner(null)}
          title={`Partner Profile: ${selectedPartner.name}`}
          subtitle={`${selectedPartner.category} • ${selectedPartner.location}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">MoU Status:</span>
                <span className="font-bold text-slate-800">{selectedPartner.mouStatus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Validity:</span>
                <span className="font-bold text-slate-800">{selectedPartner.mouValidUntil}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Students Placed:</span>
                <span className="font-bold text-emerald-700">{selectedPartner.activeInterns} Active / {selectedPartner.totalHired} Cumulative</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Regulatory Accreditation:</span>
                <Badge variant={selectedPartner.status === 'Approved' ? 'emerald' : 'amber'} size="sm">
                  {selectedPartner.status}
                </Badge>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed">
              This enterprise is authorized to recruit interns and graduates under the National Skill Credit Framework. Verified students earn university credits per documented internship completion.
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
