import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Globe,
  Mail,
  Phone,
  BookOpen,
  Award,
  Users,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { api } from '../../services/api';
import { College } from '../../types';

export const CollegeProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [college, setCollege] = useState<College | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [repName, setRepName] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [verCode, setVerCode] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState('');
  const [claimErrorMessage, setClaimErrorMessage] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);

  const fetchCollegeProfile = async (forceRefresh: boolean = false) => {
    if (!slug) return;
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage('');

    try {
      if (forceRefresh) {
        const res = await api.college.refresh(slug);
        setCollege(res.data);
      } else {
        const res = await api.college.getBySlug(slug);
        setCollege(res.data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load college profile.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCollegeProfile();
  }, [slug]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isClaimModalOpen) {
        setIsClaimModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClaimModalOpen]);

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setIsSubmittingClaim(true);
    setClaimErrorMessage('');
    setClaimSuccessMessage('');

    try {
      const res = await api.institution.submitClaim(slug, {
        representativeName: repName,
        email: repEmail,
        verificationCode: verCode,
      });
      setClaimSuccessMessage(res.data.message || 'Institution claim request submitted successfully.');
      setTimeout(() => {
        setIsClaimModalOpen(false);
        setRepName('');
        setRepEmail('');
        setVerCode('');
        setClaimSuccessMessage('');
      }, 3000);
    } catch (err: any) {
      setClaimErrorMessage(err.message || 'Failed to submit claim request.');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" aria-hidden="true" />
        <h2 className="text-xl font-bold text-slate-800">Structuring Institutional Profile...</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm text-center">
          Extracting and verifying official catalogs from {slug}.edu.in...
        </p>
      </div>
    );
  }

  if (errorMessage || !college) {
    return (
      <main className="min-h-screen bg-slate-50 py-16 px-4">
        <div className="max-w-lg mx-auto bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-900">Institution Not Found</h1>
          <p className="text-slate-600 mt-2 text-sm">{errorMessage || `No institutional profile found for '${slug}'.`}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/college"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
            >
              Search Another College
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isVerified = college.verificationStatus === 'VERIFIED';

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/" className="hover:text-slate-800">Home</Link>
          <span>/</span>
          <Link to="/college" className="hover:text-slate-800">Institutions</Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold" aria-current="page">{college.name}</span>
        </nav>

        {/* Hero Header Card */}
        <header className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-extrabold text-2xl flex-shrink-0 border border-emerald-100">
                <Building2 className="w-10 h-10" aria-hidden="true" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {college.name}
                  </h1>
                  {isVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Verified Institution
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      Unclaimed Directory Profile
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600 mt-2">
                  <a
                    href={`https://${college.officialDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-700 font-mono font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
                  >
                    <Globe className="w-4 h-4" aria-hidden="true" />
                    <span>{college.officialDomain}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" aria-hidden="true" />
                  </a>

                  {college.location?.city && (
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <MapPin className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      <span>{college.location.city}, {college.location.state || college.location.country || 'India'}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fetchCollegeProfile(true)}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
                aria-label="Refresh institutional profile data"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} aria-hidden="true" />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
              </button>

              {!isVerified && (
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(true)}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" aria-hidden="true" />
                  <span>Request Institution Onboarding</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Content Sections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Left Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            {college.about && college.about !== 'Not available' && (
              <section aria-labelledby="about-heading" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 id="about-heading" className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <span>About Institution</span>
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{college.about}</p>
              </section>
            )}

            {/* Academic Programs Section */}
            {college.programs && college.programs.length > 0 && (
              <section aria-labelledby="programs-heading" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 id="programs-heading" className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <span>Academic Programs & Degrees</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {college.programs.map((prog: any, idx: number) => {
                    const progName = typeof prog === 'string' ? prog : prog.name || prog.title || 'Program';
                    const progLevel = typeof prog === 'object' ? prog.level || prog.duration : null;
                    return (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                        <span className="text-sm font-semibold text-slate-800">{progName}</span>
                        {progLevel && <span className="text-xs text-emerald-700 font-medium mt-1">{progLevel}</span>}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Departments Section */}
            {college.departments && college.departments.length > 0 && (
              <section aria-labelledby="departments-heading" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 id="departments-heading" className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <span>Departments & Faculties</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {college.departments.map((dept: any, idx: number) => {
                    const deptName = typeof dept === 'string' ? dept : dept.name || 'Department';
                    return (
                      <span key={idx} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                        {deptName}
                      </span>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Placements & Industry Recruiters */}
            {college.placements && college.placements.length > 0 && (
              <section aria-labelledby="placements-heading" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 id="placements-heading" className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <span>Placements & Industry Partners</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {college.placements.map((plc: any, idx: number) => {
                    const company = typeof plc === 'string' ? plc : plc.company || plc.recruiter || 'Recruiter';
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                        <span className="text-xs font-bold text-slate-800">{company}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Collaborations & MoUs */}
            {college.collaborations && college.collaborations.length > 0 && (
              <section aria-labelledby="collaborations-heading" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 id="collaborations-heading" className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <span>Research Collaborations & MoUs</span>
                </h2>
                <div className="space-y-2">
                  {college.collaborations.map((collab: any, idx: number) => {
                    const partner = typeof collab === 'string' ? collab : collab.partner || collab.title || 'MoU Partner';
                    const type = typeof collab === 'object' ? collab.type : null;
                    return (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{partner}</span>
                        {type && <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">{type}</span>}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar Right Column (1 Col) */}
          <div className="space-y-6">
            {/* Contact & Location Info */}
            <section aria-labelledby="contact-heading" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 id="contact-heading" className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>Contact & Location</span>
              </h2>

              <dl className="space-y-3.5 text-xs text-slate-600">
                {college.location?.address && (
                  <div>
                    <dt className="text-slate-400 font-medium">Campus Address</dt>
                    <dd className="text-slate-800 font-medium mt-0.5">{college.location.address}</dd>
                  </div>
                )}
                {college.contact?.email && (
                  <div>
                    <dt className="text-slate-400 font-medium">Institutional Email</dt>
                    <dd className="mt-0.5">
                      <a href={`mailto:${college.contact.email}`} className="text-emerald-700 font-medium hover:underline">
                        {college.contact.email}
                      </a>
                    </dd>
                  </div>
                )}
                {college.contact?.phone && (
                  <div>
                    <dt className="text-slate-400 font-medium">Telephone</dt>
                    <dd className="text-slate-800 font-medium mt-0.5">{college.contact.phone}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-slate-400 font-medium">Official Portal</dt>
                  <dd className="mt-0.5">
                    <a
                      href={`https://${college.officialDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <span>https://{college.officialDomain}</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  </dd>
                </div>
              </dl>
            </section>

            {/* Key Skills & Curriculum Focus */}
            {college.skills && college.skills.length > 0 && (
              <section aria-labelledby="skills-heading" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h2 id="skills-heading" className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  <span>Curriculum Competencies</span>
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {college.skills.map((skill: any, idx: number) => {
                    const skillName = typeof skill === 'string' ? skill : skill.name;
                    return (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                        {skillName}
                      </span>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Source Transparency Box */}
            <section aria-labelledby="sources-heading" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 id="sources-heading" className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Transparency & Sources
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                All data extracted directly from official institutional records. Last verified on:
              </p>
              <div className="text-xs font-mono text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-3">
                {new Date(college.lastUpdated || college.updatedAt).toLocaleString()}
              </div>

              {college.sources && college.sources.length > 0 && (
                <ul className="space-y-1.5 text-xs">
                  {college.sources.map((src, idx) => (
                    <li key={idx} className="truncate">
                      <a
                        href={src.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{src.sourceUrl}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Claim Institution Modal */}
      {isClaimModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="claim-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        >
          <div
            ref={modalRef}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              type="button"
              onClick={() => setIsClaimModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-lg p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Close onboarding modal"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <ShieldCheck className="w-6 h-6" aria-hidden="true" />
              </div>
              <h2 id="claim-modal-title" className="text-xl font-bold text-slate-900">
                Claim {college.name}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Provide your institutional credentials to request official onboarding and verification.
              </p>
            </div>

            {claimSuccessMessage ? (
              <div role="alert" className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm font-semibold text-emerald-800">{claimSuccessMessage}</p>
                <p className="text-xs text-emerald-600 mt-1">Platform administrators will review your verification code.</p>
              </div>
            ) : (
              <form onSubmit={handleClaimSubmit} className="space-y-4">
                <div>
                  <label htmlFor="rep-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Representative Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="rep-name"
                    type="text"
                    required
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    placeholder="Prof. / Dr. / Registrar Name"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="rep-email" className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Institutional Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="rep-email"
                    type="email"
                    required
                    value={repEmail}
                    onChange={(e) => setRepEmail(e.target.value)}
                    placeholder={`e.g. dean@${college.officialDomain}`}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="ver-code" className="block text-xs font-semibold text-slate-700 mb-1">
                    Institution Verification Code / AISHE Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="ver-code"
                    type="text"
                    required
                    value={verCode}
                    onChange={(e) => setVerCode(e.target.value)}
                    placeholder="e.g. AISHE-C-12345 or College Code"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                {claimErrorMessage && (
                  <p role="alert" className="text-xs text-rose-600">
                    {claimErrorMessage}
                  </p>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsClaimModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingClaim}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSubmittingClaim ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      'Submit Claim Request'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
