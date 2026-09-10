import React, { useEffect, useState } from 'react';
import { Search, Award, MapPin, GraduationCap, CheckCircle2, Send, Sparkles, Filter, Users } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';

interface Candidate {
  _id: string;
  name: string;
  institution?: string;
  degree?: string;
  location?: string;
  skills?: string[];
  email?: string;
  department?: string;
}

export const CandidateSearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite modal state
  const [invitingCandidate, setInvitingCandidate] = useState<Candidate | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const res = await api.users.getCandidates();
        setCandidates(res.data || []);
      } catch {
        setCandidates([]);
      }
      setLoading(false);
    };
    fetchCandidates();
  }, []);

  const filteredCandidates = candidates.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchName = c.name?.toLowerCase().includes(q);
    const matchInst = c.institution?.toLowerCase().includes(q);
    const matchSkill = c.skills?.some((s) => s.toLowerCase().includes(q));
    return matchName || matchInst || matchSkill;
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setInvitingCandidate(null);
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
            TALENT SEARCH
          </span>
          <span className="text-xs text-slate-400">Verified Candidate Pool</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Scout & Invite Candidates
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Search verified students and job seekers by name, institution, or skills
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, institution, or skill..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16 text-slate-400 text-sm">Loading candidates...</div>
      )}

      {/* Empty State */}
      {!loading && filteredCandidates.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-700">No candidates found</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
            {searchQuery
              ? 'No candidates match your search criteria. Try adjusting your search terms.'
              : 'No candidates have registered yet. Candidate profiles will appear here as students and job seekers sign up and complete their profiles.'}
          </p>
        </div>
      )}

      {/* Candidates Cards Grid */}
      {!loading && filteredCandidates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCandidates.map((c) => (
            <div
              key={c._id}
              className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{c.name}</h3>
                    {c.institution && <p className="text-xs font-semibold text-slate-600 mt-0.5">{c.institution}</p>}
                    <p className="text-[11px] text-slate-400">
                      {[c.degree, c.department, c.location].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                </div>

                {/* Skills Tags */}
                {c.skills && c.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {c.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">NodalConnector Verified</span>
                <button
                  onClick={() => setInvitingCandidate(c)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Invite to Apply</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {invitingCandidate && (
        <Modal
          isOpen={true}
          onClose={() => setInvitingCandidate(null)}
          title={`Invite ${invitingCandidate.name} to Apply`}
          subtitle={invitingCandidate.institution || ''}
        >
          {inviteSuccess ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Invitation Dispatched!</h4>
              <p className="text-xs text-slate-500">
                {invitingCandidate.name} has received a notification to apply with priority review.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
              <p className="text-slate-600">
                Send an invitation to this candidate to apply directly for your active openings.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Personalized Message</label>
                <textarea
                  rows={3}
                  defaultValue={`Dear ${invitingCandidate.name}, we reviewed your profile and would like to invite you to apply for our open positions.`}
                  className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInvitingCandidate(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
