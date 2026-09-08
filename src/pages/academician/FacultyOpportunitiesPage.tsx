import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { FacultyOpportunity } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { School, Award, Calendar, Clock, CheckCircle2, ArrowRight, DollarSign } from 'lucide-react';

export const FacultyOpportunitiesPage: React.FC = () => {
  const [opportunities, setOpportunities] = useState<FacultyOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  // Proposal modal
  const [selectedOpp, setSelectedOpp] = useState<FacultyOpportunity | null>(null);
  const [proposalSubmitted, setProposalSubmitted] = useState(false);
  const [proposalText, setProposalText] = useState('');

  useEffect(() => {
    const fetchOpps = async () => {
      setLoading(true);
      const res = await api.academician.getFacultyOpportunities();
      setOpportunities(res.data);
      setLoading(false);
    };
    fetchOpps();
  }, []);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setProposalSubmitted(true);
    setTimeout(() => {
      setProposalSubmitted(false);
      setSelectedOpp(null);
      setProposalText('');
    }, 1800);
  };

  const filtered = opportunities.filter((o) => {
    if (filterType === 'all') return true;
    return o.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
            INDUSTRY-ACADEMIA SYNERGY
          </span>
          <span className="text-xs text-slate-400">Sponsored by National Research Foundations & Corporate Partners</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Faculty Immersion & Joint Research Grants
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Sabbaticals, corporate consultancy mandates, and multi-centric trial grants for professors and researchers
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto p-1 bg-white border border-slate-200/80 rounded-xl">
        {[
          { key: 'all', label: 'All Opportunities' },
          { key: 'Immersion', label: 'Industry Immersion' },
          { key: 'Research Collaboration', label: 'Joint Grants' },
          { key: 'FDP', label: 'Faculty Dev Programs' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              filterType === tab.key
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Opportunities List */}
      <div className="space-y-4">
        {filtered.map((opp) => (
          <div
            key={opp.id}
            className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:border-amber-400 transition-all space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{opp.title}</h3>
                  <Badge variant="purple" size="sm">{opp.type}</Badge>
                </div>
                <p className="text-xs font-semibold text-slate-600 mt-1">{opp.organization}</p>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                  <span>Duration: {opp.duration}</span>
                  <span>Apply by: {opp.deadline}</span>
                  <span className="font-bold text-emerald-700 text-xs">{opp.stipendOrGrant}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedOpp(opp)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors self-start sm:self-auto shrink-0 shadow-xs"
              >
                Express Interest / Apply
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{opp.description}</p>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700 block mb-1">Eligibility Criteria:</span>
              <ul className="space-y-1 text-xs text-slate-600">
                {opp.requirements.map((req, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Grant Application Modal */}
      {selectedOpp && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedOpp(null)}
          title={`Submit Proposal: ${selectedOpp.title}`}
          subtitle={`${selectedOpp.organization} • ${selectedOpp.stipendOrGrant}`}
        >
          {proposalSubmitted ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Proposal Dispatched!</h4>
              <p className="text-xs text-slate-500">
                The technical review committee at {selectedOpp.organization} will review your institutional NOC and CV.
              </p>
            </div>
          ) : (
            <form onSubmit={handleApply} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Brief Abstract / Proposed Research Plan</label>
                <textarea
                  required
                  rows={4}
                  value={proposalText}
                  onChange={(e) => setProposalText(e.target.value)}
                  placeholder="Outline your proposed laboratory methodology, phyto-chemical scope, or student integration plan..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedOpp(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Submit Proposal
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};
