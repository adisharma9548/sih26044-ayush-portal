import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { PlusCircle, CheckCircle2, ArrowRight, Building2, Briefcase } from 'lucide-react';

export const PostOpportunityPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [oppType, setOppType] = useState<'internship' | 'job'>('internship');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    company: user?.institution || user?.name || '',
    location: user?.location || '',
    isRemote: false,
    stipendOrSalary: '',
    durationOrExp: '6 Months',
    openings: 1,
    ayushDomain: 'Technology & Engineering',
    skillsRequired: '',
    description: '',
    responsibilities: '',
    requirements: '',
    deadline: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const skills = formData.skillsRequired.split(',').map((s) => s.trim());
    const responsibilities = formData.responsibilities.split('\n').filter(Boolean);
    const requirements = formData.requirements.split('\n').filter(Boolean);

    if (oppType === 'internship') {
      await api.internships.create({
        title: formData.title,
        company: formData.company,
        location: formData.location,
        isRemote: formData.isRemote,
        stipend: formData.stipendOrSalary,
        duration: formData.durationOrExp,
        skillsRequired: skills,
        description: formData.description,
        responsibilities,
        requirements,
        deadline: formData.deadline,
        ayushDomain: formData.ayushDomain,
        openings: Number(formData.openings),
        postedBy: user?.id,
      });
    } else {
      await api.jobs.create({
        title: formData.title,
        company: formData.company,
        location: formData.location,
        isRemote: formData.isRemote,
        salary: formData.stipendOrSalary,
        experienceLevel: formData.durationOrExp,
        skillsRequired: skills,
        description: formData.description,
        responsibilities,
        requirements,
        deadline: formData.deadline,
        ayushDomain: formData.ayushDomain,
        openings: Number(formData.openings),
        postedBy: user?.id,
      });
    }

    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      navigate('/industry/dashboard');
    }, 1800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
          ENTERPRISE HIRING
        </span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Post Internship or Full-Time Placement
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Reach thousands of pre-assessed candidates and qualified graduates nationwide
        </p>
      </div>

      {success ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-lg space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Position Successfully Published!</h2>
          <p className="text-xs text-slate-500">
            The opening is now live across the student and jobseeker network. Redirecting to your dashboard...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5 text-xs">
          {/* Opportunity Type Switcher */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">Opportunity Type</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl max-w-sm">
              <button
                type="button"
                onClick={() => {
                  setOppType('internship');
                  setFormData({ ...formData, stipendOrSalary: '₹22,000 / month', durationOrExp: '6 Months' });
                }}
                className={`py-2 rounded-lg font-bold transition-all ${
                  oppType === 'internship' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Stipendiary Internship
              </button>
              <button
                type="button"
                onClick={() => {
                  setOppType('job');
                  setFormData({ ...formData, stipendOrSalary: '₹7.5 - 10.0 LPA', durationOrExp: 'Fresher to 1 Year' });
                }}
                className={`py-2 rounded-lg font-bold transition-all ${
                  oppType === 'job' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Full-Time Job
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Position Title</label>
              <input
                type="text"
                required
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Phytochemical Quality Control Fellow"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Publishing Company / Enterprise</label>
              <input
                type="text"
                required
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Location</label>
              <input
                type="text"
                required
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Ghaziabad / Bengaluru"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Domain & Industry Sector</label>
              <select
                name="ayushDomain"
                value={formData.ayushDomain}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Technology & Engineering">Technology & Software Engineering</option>
                <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
                <option value="Cloud & DevOps">Cloud & DevOps</option>
                <option value="Electronics & IoT">Electronics & IoT</option>
                <option value="Core Engineering">Core Engineering</option>
                <option value="Ayush & Health-Tech">Health-Tech Informatics</option>
                <option value="Interdisciplinary">Interdisciplinary</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {oppType === 'internship' ? 'Monthly Stipend' : 'Annual CTC / Salary'}
              </label>
              <input
                type="text"
                required
                name="stipendOrSalary"
                value={formData.stipendOrSalary}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {oppType === 'internship' ? 'Duration' : 'Experience Level'}
              </label>
              <input
                type="text"
                required
                name="durationOrExp"
                value={formData.durationOrExp}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Number of Openings</label>
              <input
                type="number"
                required
                name="openings"
                value={formData.openings}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Application Deadline</label>
              <input
                type="date"
                required
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Required Skills & Competencies (comma separated)
            </label>
            <input
              type="text"
              required
              name="skillsRequired"
              value={formData.skillsRequired}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Opportunity Description</label>
            <textarea
              required
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Outline the scope of work, lab exposure, and mentorship provided..."
              className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Key Responsibilities (one per line)</label>
              <textarea
                rows={3}
                name="responsibilities"
                value={formData.responsibilities}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Requirements & Eligibility (one per line)</label>
              <textarea
                rows={3}
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{loading ? 'Publishing Opportunity...' : `Publish ${oppType.toUpperCase()}`}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
