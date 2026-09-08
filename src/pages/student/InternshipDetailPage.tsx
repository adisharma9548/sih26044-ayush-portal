import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Internship } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useApplicationStore } from '../../store/useApplicationStore';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { AiOnboardingModal } from '../../components/student/AiOnboardingModal';
import {
  Building2,
  MapPin,
  Clock,
  Calendar,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Share2,
  Users,
  AlertCircle
} from 'lucide-react';

export const InternshipDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { applyForOpportunity } = useApplicationStore();

  const [internship, setInternship] = useState<Internship | null>(null);
  const [skillProfile, setSkillProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [intRes, profileRes] = await Promise.allSettled([
          api.internships.getById(id),
          api.skills.getProfile(),
        ]);
        if (intRes.status === 'fulfilled') setInternship(intRes.value.data);
        if (profileRes.status === 'fulfilled') setSkillProfile(profileRes.value.data);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleOpenApply = () => {
    if (!skillProfile || skillProfile.overallScore === 0) {
      setShowDiagnosticModal(true);
      return;
    }
    setShowApplyModal(true);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internship || !user) return;
    await applyForOpportunity({
      opportunityId: internship.id || (internship as any)._id,
      userId: user.id,
      type: 'internship',
      coverNote,
      studentName: user.name,
      studentEmail: user.email
    });
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      setShowApplyModal(false);
      navigate('/student/applications');
    }, 1800);
  };

  if (loading) {
    return <div className="py-24 text-center text-xs text-slate-400">Loading opportunity monograph...</div>;
  }

  if (!internship) {
    return (
      <div className="py-24 text-center space-y-3">
        <h3 className="text-base font-bold text-slate-800">Opportunity Not Found</h3>
        <Link to="/student/internships" className="text-xs text-emerald-600 font-bold hover:underline">
          ← Back to All Internships
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Listings</span>
      </button>

      {/* Main Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <img
              src={internship.companyLogo || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=80&auto=format&fit=crop&q=80'}
              alt={internship.company}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-xs shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{internship.title}</h1>
                <Badge variant="emerald">88% SKILL MATCH</Badge>
              </div>
              <p className="text-sm font-semibold text-slate-700 mt-1">{internship.company}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {internship.location}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {internship.duration}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Apply by {internship.deadline}</span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
            <span className="text-xl font-extrabold text-emerald-700">{internship.stipend}</span>
            <button
              onClick={handleOpenApply}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              Apply for Internship
            </button>
            {(!skillProfile || skillProfile.overallScore === 0) && (
              <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Assessment test mandatory before apply
              </span>
            )}
          </div>
        </div>

        {/* Highlight Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-center">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Discipline</span>
            <span className="font-bold text-slate-800 text-xs">{internship.ayushDomain}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Openings</span>
            <span className="font-bold text-slate-800 text-xs">{internship.openings} Positions</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Work Mode</span>
            <span className="font-bold text-slate-800 text-xs">{internship.isRemote ? 'Remote' : 'On-Site Lab'}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Verification</span>
            <span className="font-bold text-emerald-700 text-xs">Ayush Schedule T</span>
          </div>
        </div>
      </div>

      {/* Description & Responsibilities */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-2">Opportunity Overview</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{internship.description}</p>
        </div>

        {internship.responsibilities && (
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Primary Responsibilities</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              {internship.responsibilities.map((r, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {internship.requirements && (
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Eligibility & Requirements</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              {internship.requirements.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Required Skills */}
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-2">Key Competencies Evaluated</h3>
          <div className="flex flex-wrap gap-2">
            {internship.skillsRequired.map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold"
              >
                ✓ {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowApplyModal(false)}
          title={`Apply for ${internship.title}`}
          subtitle={`${internship.company} • Stipend: ${internship.stipend}`}
        >
          {appliedSuccess ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Application Submitted!</h4>
              <p className="text-xs text-slate-500">
                You can track this opportunity on your "My Applications" dashboard.
              </p>
            </div>
          ) : (
            <form onSubmit={handleApply} className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
                <strong>Verified Profile Attached:</strong> Your university credentials, verified skill score ({skillProfile?.overallScore || 0}/100), and AI competency radar will be transmitted directly to {internship.company}.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Statement of Purpose / Why are you suited for this role?
                </label>
                <textarea
                  required
                  rows={4}
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="Mention your relevant projects, technical coursework, or clinical labs..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  Confirm & Submit
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Mandatory Diagnostic Modal if not assessed */}
      <AiOnboardingModal
        isOpen={showDiagnosticModal}
        requiredForApplication={true}
        onComplete={async () => {
          setShowDiagnosticModal(false);
          const profRes = await api.skills.getProfile();
          setSkillProfile(profRes.data);
          setShowApplyModal(true);
        }}
        onClose={() => setShowDiagnosticModal(false)}
      />
    </div>
  );
};
