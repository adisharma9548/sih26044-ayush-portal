import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import {
  PlusCircle,
  CheckCircle2,
  ArrowRight,
  Building2,
  Briefcase,
  School,
  Award,
  Sparkles,
  Wand2,
  RefreshCw,
} from 'lucide-react';

export const PostOpportunityPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [oppType, setOppType] = useState<'internship' | 'job' | 'faculty'>('internship');
  const [facultySubtype, setFacultySubtype] = useState<'Immersion' | 'FDP' | 'Research Collaboration' | 'Consultancy'>('Immersion');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiNotice, setAiNotice] = useState('');

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

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    setAiNotice('');
    try {
      const res = await api.ai.generateOpportunityDraft({
        oppType,
        facultySubtype: oppType === 'faculty' ? facultySubtype : undefined,
        domain: formData.ayushDomain,
        organization: formData.company,
        prompt: aiPrompt.trim() || undefined,
      });

      const draft = res.data;
      if (draft) {
        setFormData((prev) => ({
          ...prev,
          title: draft.title || prev.title,
          stipendOrSalary: draft.stipendOrSalary || prev.stipendOrSalary,
          durationOrExp: draft.durationOrExp || prev.durationOrExp,
          openings: draft.openings || prev.openings,
          skillsRequired: Array.isArray(draft.skillsRequired)
            ? draft.skillsRequired.join(', ')
            : draft.skillsRequired || prev.skillsRequired,
          description: draft.description || prev.description,
          responsibilities: Array.isArray(draft.responsibilities)
            ? draft.responsibilities.join('\n')
            : draft.responsibilities || prev.responsibilities,
          requirements: Array.isArray(draft.requirements)
            ? draft.requirements.join('\n')
            : draft.requirements || prev.requirements,
        }));
        setAiNotice(`✨ AI populated dynamic requirements for ${formData.ayushDomain} (${oppType === 'faculty' ? facultySubtype : oppType})!`);
        setTimeout(() => setAiNotice(''), 6000);
      }
    } catch (err: any) {
      setAiNotice('AI draft generation is temporarily offline. You can fill the fields manually.');
      setTimeout(() => setAiNotice(''), 4000);
    } finally {
      setAiGenerating(false);
    }
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
    } else if (oppType === 'job') {
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
    } else {
      // Faculty Immersion / FDP / Research Collaboration
      await api.academician.createFacultyOpportunity({
        title: formData.title,
        organization: formData.company,
        type: facultySubtype,
        stipendOrGrant: formData.stipendOrSalary,
        duration: formData.durationOrExp,
        deadline: formData.deadline,
        description: formData.description,
        requirements: requirements.length > 0 ? requirements : ['Ph.D. or Master degree in relevant domain', 'Minimum 3 years teaching/research experience', 'Institutional NOC required'],
        ayushDomain: formData.ayushDomain,
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
            <label className="block font-bold text-slate-700 mb-2">Opportunity Target Category</label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setOppType('internship');
                  setFormData({ ...formData, stipendOrSalary: '₹22,000 / month', durationOrExp: '6 Months' });
                }}
                className={`py-2 rounded-lg font-bold transition-all text-center ${
                  oppType === 'internship' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Student Internship
              </button>
              <button
                type="button"
                onClick={() => {
                  setOppType('job');
                  setFormData({ ...formData, stipendOrSalary: '₹7.5 - 10.0 LPA', durationOrExp: 'Fresher to 1 Year' });
                }}
                className={`py-2 rounded-lg font-bold transition-all text-center ${
                  oppType === 'job' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Full-Time Placement
              </button>
              <button
                type="button"
                onClick={() => {
                  setOppType('faculty');
                  setFormData({ ...formData, stipendOrSalary: '₹60,000 / month Fellowship', durationOrExp: '4 Weeks Sabbatical' });
                }}
                className={`py-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  oppType === 'faculty' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-100/60'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                <span>Faculty Immersion / FDP</span>
              </button>
            </div>
          </div>

          {oppType === 'faculty' && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-bold text-amber-900">NEP 2020 & AICTE Industry-Academia Synergy</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Host university professors in your industrial facilities for sabbatical immersion, fund institutional research grants, or conduct accredited Faculty Development Programs.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {(['Immersion', 'FDP', 'Research Collaboration', 'Consultancy'] as const).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setFacultySubtype(sub)}
                    className={`py-1.5 px-2 rounded-lg font-bold text-center text-[11px] transition-all border ${
                      facultySubtype === sub
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                    }`}
                  >
                    {sub === 'Immersion' ? 'Faculty Immersion' : sub === 'FDP' ? 'Upskilling FDP' : sub === 'Research Collaboration' ? 'Joint Grant' : 'Consultancy'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Opportunity Studio (Powered by Groq LLM) */}
          <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl border border-indigo-100/90 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    AI Opportunity Studio <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-indigo-200 text-indigo-800">GROQ LLM</span>
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Auto-generate dynamic job, internship, or sabbatical specifications tailored to your sector
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={aiGenerating}
                onClick={handleAiGenerate}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {aiGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing with AI...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>✨ Auto-Draft with AI</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Optional AI Prompt: Specify special technical angle or leave blank for domain auto-draft"
                className="flex-1 px-3 py-1.5 bg-white rounded-xl border border-indigo-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {aiNotice && (
              <div className="p-2 bg-emerald-100/70 border border-emerald-300 text-emerald-900 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>{aiNotice}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {oppType === 'faculty' ? 'Faculty Program / Sabbatical Title' : 'Position Title'}
              </label>
              <input
                type="text"
                required
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter title or use ✨ Auto-Draft with AI"
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
                placeholder="Enterprise or Institution Name"
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
                placeholder="City, Campus, or Remote"
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
                {oppType === 'faculty'
                  ? 'Grant / Fellowship Amount'
                  : oppType === 'internship'
                  ? 'Monthly Stipend'
                  : 'Annual CTC / Salary'}
              </label>
              <input
                type="text"
                required
                name="stipendOrSalary"
                value={formData.stipendOrSalary}
                onChange={handleChange}
                placeholder="Compensation or grant amount"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {oppType === 'faculty'
                  ? 'Program Duration / Tenure'
                  : oppType === 'internship'
                  ? 'Duration'
                  : 'Experience Level'}
              </label>
              <input
                type="text"
                required
                name="durationOrExp"
                value={formData.durationOrExp}
                onChange={handleChange}
                placeholder="Duration or experience level"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {oppType === 'faculty' ? 'Faculty Intake Capacity' : 'Number of Openings'}
              </label>
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
              {oppType === 'faculty' ? 'Target Expertise & Academic Specializations' : 'Required Skills & Competencies (comma separated)'}
            </label>
            <input
              type="text"
              required
              name="skillsRequired"
              value={formData.skillsRequired}
              onChange={handleChange}
              placeholder="Skills, competencies, or technical disciplines (comma separated)"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              {oppType === 'faculty' ? 'Program Scope & Laboratory Exposure' : 'Opportunity Description'}
            </label>
            <textarea
              required
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide a detailed overview of the role, laboratory facilities, and scope of work"
              className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {oppType === 'faculty' ? 'Institutional Outcomes (one per line)' : 'Key Responsibilities (one per line)'}
              </label>
              <textarea
                rows={3}
                name="responsibilities"
                value={formData.responsibilities}
                onChange={handleChange}
                placeholder="Enter key responsibilities or deliverables (one per line)"
                className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                {oppType === 'faculty' ? 'Academic Eligibility & Prerequisites (one per line)' : 'Requirements & Eligibility (one per line)'}
              </label>
              <textarea
                rows={3}
                name="requirements"
                value={formData.requirements}
                onChange={handleChange}
                placeholder="Enter eligibility criteria, prerequisites, or required credentials (one per line)"
                className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-3 rounded-xl font-bold text-xs shadow-md transition-colors flex items-center gap-2 ${
                oppType === 'faculty'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>
                {loading
                  ? 'Publishing Opportunity...'
                  : oppType === 'faculty'
                  ? 'Publish Faculty Program / Grant'
                  : `Publish ${oppType.toUpperCase()}`}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
