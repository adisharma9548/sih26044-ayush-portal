import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Award, Building, FileText, Calendar, DollarSign, X } from 'lucide-react';
import { api } from '../../services/api';

interface MouReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: any;
  onReviewed: (updated: any) => void;
}

export const MouReviewModal: React.FC<MouReviewModalProps> = ({
  isOpen,
  onClose,
  proposal,
  onReviewed,
}) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !proposal) return null;

  const handleAction = async (status: 'approved' | 'rejected') => {
    setProcessing(true);
    setError('');
    try {
      const res = await api.mous.reviewProposal(proposal._id || proposal.id, status, reviewNotes);
      onReviewed(res.data);
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to ${status} proposal.`);
    } finally {
      setProcessing(false);
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
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Institutional Directorate MoU Review
              </h2>
              <p className="text-[10px] text-slate-400">
                Official Validation & Digital Sealing Authority
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

        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl">
              {error}
            </div>
          )}

          {/* Proposal Summary Card */}
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-700 block">
                  Proposal Document
                </span>
                <h3 className="text-base font-extrabold text-slate-900">{proposal.title}</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                {proposal.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">Initiated By</span>
                <span className="font-semibold text-slate-900">
                  {proposal.initiatorName} ({proposal.initiatorRole})
                </span>
                <p className="text-[11px] text-slate-500">{proposal.initiatorInstitution}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">Target Organization</span>
                <span className="font-semibold text-slate-900">{proposal.targetOrganization}</span>
              </div>
            </div>
          </div>

          {/* Detailed Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Annual Student Quota
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {proposal.internshipQuota} Students / Year
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Grant / Research Allocation
              </span>
              <span className="font-bold text-emerald-700 text-sm">
                {proposal.grantFunding}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5 sm:col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                IP Commercialization & Publication Terms
              </span>
              <span className="font-medium text-slate-800">{proposal.ipTerms}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5 sm:col-span-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Scope & Research Deliverables
              </span>
              <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                {proposal.scope}
              </p>
            </div>
          </div>

          {/* Review Notes Input */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Directorate Endorsement / Review Notes</label>
            <textarea
              rows={2}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add official administrative remarks, accreditation conditions, or audit notes..."
              className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={processing}
                onClick={() => handleAction('rejected')}
                className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold transition-colors disabled:opacity-50"
              >
                Reject Proposal
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={() => handleAction('approved')}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{processing ? 'Applying Seal...' : 'Digitally Stamp & Approve'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
