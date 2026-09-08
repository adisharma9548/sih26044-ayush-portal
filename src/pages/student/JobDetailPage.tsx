import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Job } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useApplicationStore } from '../../store/useApplicationStore';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { AiOnboardingModal } from '../../components/student/AiOnboardingModal';
import {
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Users,
  AlertCircle
} from 'lucide-react';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { applyForOpportunity } = useApplicationStore();

  const [job, setJob] = useState<Job | null>(null);
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
        const [jobRes, profRes] = await Promise.allSettled([
          api.jobs.getById(id),
          api.skills.getProfile(),
        ]);
        if (jobRes.status === 'fulfilled') setJob(jobRes.value.data);
        if (profRes.status === 'fulfilled') setSkillProfile(profRes.value.data);
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
    if (!job || !user) return;
    await applyForOpportunity({
      opportunityId: job.id || (job as any)._id,
      userId: user.id,
      type: 'job',
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
    return <div className="py-24 text-center text-xs text-slate-400">Loading placement specifications...</div>;
  }

  if (!job) {
    return (
      <div className="py-24 text-center space-y-3">
        <h3 className="text-base font-bold text-slate-800">Job Not Found</h3>
        <Link to="/student/jobs" className="text-xs text-emerald-600 font-bold hover:underline">
          ← Back to All Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Placement Listings</span>
      </button>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <img
              src={job.companyLogo || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=80&auto=format&fit=crop&q=80'}
              alt={job.company}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-xs shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{job.title}</h1>
                <Badge variant="blue">FULL-TIME CAREER</Badge>
              </div>
              <p className="text-sm font-semibold text-slate-700 mt-1">{job.company}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {job.location}</span>
                <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {job.experienceLevel}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Apply by {job.deadline}</span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
            <span className="text-xl font-extrabold text-emerald-700">{job.salary}</span>
            <button
              onClick={handleOpenApply}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              Apply for Role
            </button>
            {(!skillProfile || skillProfile.overallScore === 0) && (
              <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Assessment test mandatory before apply
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 text-center">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Discipline</span>
            <span className="font-bold text-slate-800 text-xs">{job.ayushDomain}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Openings</span>
            <span className="font-bold text-slate-800 text-xs">{job.openings} Positions</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
            <span className="font-bold text-slate-800 text-xs">Pharma R&D / QC</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Hiring Mode</span>
            <span className="font-bold text-emerald-700 text-xs">Direct Industry</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-2">Job Description</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{job.description}</p>
        </div>

        {job.responsibilities && (
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Key Accountabilities</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              {job.responsibilities.map((r, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-base font-bold text-slate-900 mb-2">Required Competencies</h3>
          <div className="flex flex-wrap gap-2">
            {job.skillsRequired.map((skill, idx) => (
              <span key={idx} className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                ✓ {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {showApplyModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowApplyModal(false)}
          title={`Apply for ${job.title}`}
          subtitle={`${job.company} • Remuneration: ${job.salary}`}
        >
          {appliedSuccess ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Application Submitted!</h4>
              <p className="text-xs text-slate-500">Track status in My Applications.</p>
            </div>
          ) : (
            <form onSubmit={handleApply} className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800">
                <strong>Campus / Direct Hire:</strong> Your university-verified credentials and verified AI Skill Gap Radar score ({skillProfile?.overallScore || 0}/100) will be transmitted directly to {job.company}.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Statement of Purpose</label>
                <textarea
                  required
                  rows={4}
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="Explain why you wish to join this enterprise..."
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
                  Submit Application
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
          const prof = await api.skills.getProfile();
          setSkillProfile(prof.data);
          setShowApplyModal(true);
        }}
        onClose={() => setShowDiagnosticModal(false)}
      />
    </div>
  );
};
