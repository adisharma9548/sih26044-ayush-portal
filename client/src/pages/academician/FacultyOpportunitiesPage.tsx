import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { FacultyOpportunity } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../hooks/useAuth';
import {
  School,
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  Sparkles,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

export const FacultyOpportunitiesPage: React.FC = () => {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<FacultyOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  // Proposal modal
  const [selectedOpp, setSelectedOpp] = useState<FacultyOpportunity | null>(null);
  const [proposalSubmitted, setProposalSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [proposalText, setProposalText] = useState('');
  const [experience, setExperience] = useState('');
  const [cvLink, setCvLink] = useState('');
  const [aiDrafting, setAiDrafting] = useState(false);
  const [facultyFocus, setFacultyFocus] = useState('');
  const [aiDrafted, setAiDrafted] = useState(false);

  const fetchOpps = async () => {
    setLoading(true);
    const res = await api.academician.getFacultyOpportunities();
    setOpportunities(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOpps();
  }, []);

  const handleAiProposalDraft = async () => {
    if (!selectedOpp) return;
    setAiDrafting(true);
    setApplyError('');
    try {
      const res = await api.ai.generateProposalDraft({
        opportunityTitle: selectedOpp.title,
        organization: selectedOpp.organization,
        opportunityType: selectedOpp.type,
        description: selectedOpp.description,
        requirements: selectedOpp.requirements,
        focusArea: facultyFocus.trim() || undefined,
      });

      const draft = res.data;
      const deliverablesText = draft.expectedDeliverables && draft.expectedDeliverables.length > 0
        ? `\n\nKey Research Deliverables:\n${draft.expectedDeliverables.map((o: string) => `• ${o}`).join('\n')}`
        : '';
      const formattedProposal = `${draft.proposalText}${deliverablesText}`;
      setProposalText(formattedProposal);
      if (draft.experience && !experience) {
        setExperience(draft.experience);
      }
      setAiDrafted(true);
    } catch (err: any) {
      setApplyError(err?.message || 'Failed to auto-draft proposal. Please try again.');
    } finally {
      setAiDrafting(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp) return;
    setSubmitting(true);
    setApplyError('');

    try {
      await api.academician.applyFacultyOpportunity(selectedOpp.id, {
        proposalText,
        experience,
        cvLink,
      });
      setProposalSubmitted(true);
      await fetchOpps();
      setTimeout(() => {
        setProposalSubmitted(false);
        setSelectedOpp(null);
        setProposalText('');
        setExperience('');
        setCvLink('');
        setFacultyFocus('');
        setAiDrafted(false);
      }, 2000);
    } catch (err: any) {
      setApplyError(err?.message || 'Failed to submit proposal. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400">
            Loading faculty opportunities & corporate immersion grants...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400">
            No active faculty immersion or FDP opportunities in this category.
          </div>
        ) : (
          filtered.map((opp) => {
            const userApp = opp.applications?.find(
              (a) =>
                a.facultyId === user?.id ||
                (a as any).facultyEmail?.toLowerCase() === user?.email?.toLowerCase()
            );

            return (
              <div
                key={opp.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:border-amber-400 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{opp.title}</h3>
                      <Badge variant="purple" size="sm">
                        {opp.type}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 mt-1">{opp.organization}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                      <span>Duration: {opp.duration}</span>
                      <span>Apply by: {opp.deadline}</span>
                      <span className="font-bold text-emerald-700 text-xs">{opp.stipendOrGrant}</span>
                    </div>
                  </div>

                  {userApp ? (
                    <div className="self-start sm:self-auto shrink-0">
                      {userApp.status === 'pending' && (
                        <span className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                          <span>Proposal Under Review</span>
                        </span>
                      )}
                      {userApp.status === 'shortlisted' && (
                        <span className="px-3.5 py-1.5 rounded-xl bg-purple-50 border border-purple-300 text-purple-900 font-bold text-xs flex items-center gap-1.5 shadow-xs">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          <span>Proposal Shortlisted</span>
                        </span>
                      )}
                      {userApp.status === 'accepted' && (
                        <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center gap-1.5 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Grant Awarded / Sabbatical Approved</span>
                        </span>
                      )}
                      {userApp.status === 'rejected' && (
                        <span className="px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs shadow-xs">
                          Application Closed
                        </span>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedOpp(opp);
                        setApplyError('');
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors self-start sm:self-auto shrink-0 shadow-xs"
                    >
                      Express Interest / Apply
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{opp.description}</p>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">
                    Eligibility Criteria & Requirements:
                  </span>
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
            );
          })
        )}
      </div>

      {/* Grant Application Modal */}
      {selectedOpp && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!submitting) {
              setSelectedOpp(null);
              setApplyError('');
              setFacultyFocus('');
              setAiDrafted(false);
            }
          }}
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
                The technical review committee at {selectedOpp.organization} has been notified and will review your proposal dossier.
              </p>
            </div>
          ) : (
            <form onSubmit={handleApply} className="space-y-4 text-xs">
              {applyError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{applyError}</span>
                </div>
              )}

              {/* AI Research Proposal Co-Pilot Banner */}
              <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-amber-700/10 rounded-2xl border border-amber-300/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                    <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                    <span>AI Research Proposal Co-Pilot</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                    Groq LLM
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Synthesize a comprehensive research abstract, methodology, and sabbatical roadmap tailored specifically to {selectedOpp.organization}'s scope.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={facultyFocus}
                    onChange={(e) => setFacultyFocus(e.target.value)}
                    placeholder="Optional: Specify your lab focus or special equipment (e.g. AI-assisted analytics, multi-centric trials)"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAiProposalDraft}
                    disabled={aiDrafting}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${aiDrafting ? 'animate-spin' : ''}`} />
                    <span>{aiDrafting ? 'Synthesizing...' : '✨ Auto-Draft with AI'}</span>
                  </button>
                </div>
                {aiDrafted && (
                  <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5 pt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Draft generated with Groq AI! Review and refine the scope below before submitting.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Proposed Research Plan / Sabbatical Scope <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={proposalText}
                  onChange={(e) => setProposalText(e.target.value)}
                  placeholder="Outline your proposed methodology, core research questions, student integration plan, or institutional outcomes..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none font-sans text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Academic Credentials & Research Background
                </label>
                <input
                  type="text"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="e.g. Associate Professor, Department of Computer Science / AYUSH, 8+ years research experience"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Institutional NOC / Google Scholar / CV URL
                </label>
                <input
                  type="url"
                  value={cvLink}
                  onChange={(e) => setCvLink(e.target.value)}
                  placeholder="https://scholar.google.com/citations?user=... or Drive link"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setSelectedOpp(null);
                    setFacultyFocus('');
                    setAiDrafted(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 shadow-xs"
                >
                  {submitting ? 'Submitting...' : 'Submit Proposal'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};
