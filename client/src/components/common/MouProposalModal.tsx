import React, { useState } from 'react';
import { Building2, FileText, Award, CheckCircle2, DollarSign, Users, Calendar, ShieldCheck, X, Sparkles, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

interface MouProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initiatorRole: 'academician' | 'industry';
  defaultTargetOrg?: string;
}

export const MouProposalModal: React.FC<MouProposalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initiatorRole,
  defaultTargetOrg = '',
}) => {
  const [targetOrg, setTargetOrg] = useState(defaultTargetOrg);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('');
  const [ipTerms, setIpTerms] = useState('50/50 Joint Commercialization & Research Publication Rights');
  const [internshipQuota, setInternshipQuota] = useState(25);
  const [grantFunding, setGrantFunding] = useState('₹15,00,000 Annual Innovation Grant');
  const [validityYears, setValidityYears] = useState(3);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // AI MoU Synthesis
  const [aiSynthesizing, setAiSynthesizing] = useState(false);
  const [aiNotice, setAiNotice] = useState('');

  const handleAiSynthesize = async () => {
    setAiSynthesizing(true);
    setAiNotice('');
    try {
      const res = await api.ai.synthesizeMouTerms({
        initiatorRole,
        targetOrg: targetOrg || (initiatorRole === 'academician' ? 'Industry Corporate Partner' : 'Accredited University'),
        focusArea: title.trim() || undefined,
      });

      const draft = res.data;
      if (draft) {
        if (draft.title) setTitle(draft.title);
        if (draft.scope) setScope(draft.scope);
        if (draft.ipTerms) setIpTerms(draft.ipTerms);
        if (draft.internshipQuota) setInternshipQuota(draft.internshipQuota);
        if (draft.grantFunding) setGrantFunding(draft.grantFunding);
        if (draft.validityYears) setValidityYears(draft.validityYears);
        setAiNotice('✨ AI synthesized balanced, UGC/AICTE-compliant bilateral MoU terms!');
        setTimeout(() => setAiNotice(''), 5000);
      }
    } catch (err: any) {
      setAiNotice('AI MoU synthesis is temporarily offline. You can fill terms manually.');
      setTimeout(() => setAiNotice(''), 4000);
    } finally {
      setAiSynthesizing(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrg || !title || !scope) {
      setError('Please fill in all mandatory MoU proposal terms.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.mous.createProposal({
        targetOrganization: targetOrg,
        title,
        scope,
        ipTerms,
        internshipQuota,
        grantFunding,
        validityYears,
      });

      setSubmitted(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to transmit MoU proposal to directorate.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Initiate Industry-Academia MoU Proposal
              </h2>
              <p className="text-[10px] text-slate-400">
                Official Institutional Agreement Protocol (SIH26044 Compliance)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">MoU Proposal Transmitted!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your proposal has been logged in the national ledger. The Institutional Directorate has been notified for administrative review and digital sealing.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* AI Bilateral Agreement Synthesizer */}
              <div className="p-3 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/30 border border-purple-400/40 text-purple-200 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-white block">
                      AI Bilateral Agreement Synthesizer
                    </span>
                    <span className="text-[10px] text-purple-200">
                      Auto-generate balanced UGC/AICTE-compliant terms, joint IP clauses, and student quotas
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAiSynthesize}
                  disabled={aiSynthesizing}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer"
                >
                  <Sparkles className={`w-3 h-3 ${aiSynthesizing ? 'animate-spin' : ''}`} />
                  <span>{aiSynthesizing ? 'Synthesizing...' : '✨ Auto-Draft MoU with AI'}</span>
                </button>
              </div>

              {aiNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{aiNotice}</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700">MoU Proposal Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Joint Phyto-Analytics R&D and 50-Intern Annual Pipeline"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    {initiatorRole === 'academician' ? 'Target Industry Partner *' : 'Target University / Institution *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={targetOrg}
                    onChange={(e) => setTargetOrg(e.target.value)}
                    placeholder={initiatorRole === 'academician' ? 'e.g. Dabur Research Foundation' : 'e.g. All India Institute of Ayurveda'}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Internship Quota (Annual)</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={internshipQuota}
                    onChange={(e) => setInternshipQuota(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700">Scope of Collaborative Activities *</label>
                  <textarea
                    rows={3}
                    required
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    placeholder="Describe specific joint research projects, guest faculty lectures, laboratory testing access, and student internship credit policies..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Intellectual Property (IP) Sharing Terms</label>
                  <input
                    type="text"
                    value={ipTerms}
                    onChange={(e) => setIpTerms(e.target.value)}
                    placeholder="e.g. 50/50 Joint Commercialization Rights"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Research Grant / Funding Support</label>
                  <input
                    type="text"
                    value={grantFunding}
                    onChange={(e) => setGrantFunding(e.target.value)}
                    placeholder="e.g. ₹25,00,000 Annual Innovation Grant"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Agreement Validity (Years)</label>
                  <select
                    value={validityYears}
                    onChange={(e) => setValidityYears(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value={1}>1 Year (Pilot)</option>
                    <option value={2}>2 Years</option>
                    <option value={3}>3 Years (Recommended)</option>
                    <option value={5}>5 Years (Strategic Strategic Alliance)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Transmits to National Accreditation Registry
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors shadow-xs disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Transmit MoU Proposal'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
