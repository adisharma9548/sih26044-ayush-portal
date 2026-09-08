import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Job } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useApplicationStore } from '../../store/useApplicationStore';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Search,
  MapPin,
  Briefcase,
  Calendar,
  Building2,
  Sparkles,
  CheckCircle2,
  DollarSign,
  ArrowRight
} from 'lucide-react';

export const JobListPage: React.FC = () => {
  const { user } = useAuth();
  const { applyForOpportunity } = useApplicationStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if student / candidate is in Tech track
  const isTechStudent = Boolean(
    user?.degree?.toLowerCase().includes('tech') ||
    user?.degree?.toLowerCase().includes('engineer') ||
    user?.degree?.toLowerCase().includes('computer') ||
    user?.department?.toLowerCase().includes('computer') ||
    user?.ayushDomain?.toLowerCase().includes('technology') ||
    user?.role === 'jobseeker'
  );

  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState(isTechStudent ? 'Technology & Engineering' : 'All');

  // Fast apply modal
  const [applyingJob, setApplyingJob] = useState<Job | null>(null);
  const [coverNote, setCoverNote] = useState('');
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      const res = await api.jobs.getAll({
        domain: domainFilter,
        search,
      });
      setJobs(res.data || []);
      setLoading(false);
    };
    fetchJobs();
  }, [domainFilter, search]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob || !user) return;
    await applyForOpportunity({
      opportunityId: applyingJob.id,
      userId: user.id,
      type: 'job',
      coverNote,
      studentName: user.name,
      studentEmail: user.email,
    });
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      setApplyingJob(null);
      setCoverNote('');
    }, 1800);
  };

  const domainTabs = [
    { label: isTechStudent ? 'My Field (Tech & Engg)' : 'Tech & Engineering', value: 'Technology & Engineering' },
    { label: 'All Openings', value: 'All' },
    { label: 'AI & Data Science', value: 'Artificial Intelligence & Data Science' },
    { label: 'Cloud & DevOps', value: 'Cloud & DevOps' },
    { label: 'Electronics & IoT', value: 'Electronics & IoT' },
    { label: 'Health-Tech Informatics', value: 'Ayush & Health-Tech' },
    { label: 'Core Engineering', value: 'Core Engineering' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
            GRADUATE & PROFESSIONAL PLACEMENTS
          </span>
          <span className="text-xs text-slate-400">Campus & Direct Industry Hiring</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Full-Time Engineering & Industry Careers
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Permanent career opportunities for graduating engineers, software architects, and technical specialists.
        </p>
      </div>

      {/* Quick Domain Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {domainTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setDomainFilter(tab.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              domainFilter === tab.value
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job title (e.g. Software Engineer, DevOps), company (Tata, Wipro, DRDO), or skill..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Disciplines & Fields</option>
              <option value="Technology & Engineering">Technology & Software Engineering</option>
              <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
              <option value="Cloud & DevOps">Cloud & DevOps</option>
              <option value="Electronics & IoT">Electronics & Embedded IoT</option>
              <option value="Ayush & Health-Tech">Ayush & Health-Tech</option>
              <option value="Core Engineering">Core Engineering</option>
              <option value="Ayurveda">Ayurveda & Bio-Pharma</option>
            </select>
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading placement positions...</div>
        ) : jobs.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
            <p className="text-sm font-bold text-slate-700">No placement jobs posted yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Verified corporate partners have not posted any full-time positions yet. Openings will appear here in real-time as employers publish opportunities.
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 hover:border-emerald-400 hover:shadow-xs transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <img
                    src={job.companyLogo || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=120&auto=format&fit=crop&q=80'}
                    alt={job.company}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/student/jobs/${job.id || (job as any)._id}`}
                        className="text-sm sm:text-base font-bold text-slate-900 hover:text-emerald-700"
                      >
                        {job.title}
                      </Link>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {job.ayushDomain}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-700">{job.company}</p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> {job.location}
                      </span>
                      <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                        <DollarSign className="w-3.5 h-3.5" /> {job.salary}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> Deadline: {job.deadline}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {job.skillsRequired.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/student/jobs/${job.id}`}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => setApplyingJob(job)}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Apply Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Fast Apply Modal */}
      {applyingJob && (
        <Modal
          isOpen={Boolean(applyingJob)}
          onClose={() => setApplyingJob(null)}
          title={`Apply for ${applyingJob.title}`}
        >
          {appliedSuccess ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Application Dispatched!</h3>
              <p className="text-xs text-slate-500">
                Your credentials have been submitted to {applyingJob.company} talent acquisition.
              </p>
            </div>
          ) : (
            <form onSubmit={handleApply} className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <p>Company: <strong className="text-slate-900">{applyingJob.company}</strong></p>
                <p>Package: <strong className="text-emerald-700">{applyingJob.salary}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Candidate Profile Verification
                </label>
                <p className="text-xs text-slate-500">
                  Applying as <strong className="text-slate-800">{user?.name}</strong> ({user?.email})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Candidate Statement / Cover Note
                </label>
                <textarea
                  rows={3}
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="Outline your relevant technical experience, projects, and why you are a fit for this role..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyingJob(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Submit Application
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
};
