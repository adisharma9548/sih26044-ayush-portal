import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { BookOpen, CheckCircle2, ArrowRight } from 'lucide-react';

export const PostLearningProgramPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    provider: user?.institution || user?.name || '',
    type: 'certification' as const,
    duration: '4 Weeks',
    skillsCovered: '',
    description: '',
    level: 'Intermediate' as const,
    cost: 'Free',
    ayushDomain: 'Technology & Engineering',
    syllabus: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const skills = formData.skillsCovered.split(',').map((s) => s.trim());
    const syllabusList = formData.syllabus.split('\n').filter(Boolean);

    await api.learning.create({
      title: formData.title,
      provider: formData.provider,
      type: formData.type,
      duration: formData.duration,
      skillsCovered: skills,
      description: formData.description,
      level: formData.level,
      cost: formData.cost,
      ayushDomain: formData.ayushDomain,
      syllabus: syllabusList
    });

    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      navigate('/industry/dashboard');
    }, 1800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">
          INDUSTRY SKILL ACCREDITATION
        </span>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Sponsor / Post Learning Module
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Bridge identified student competency gaps by publishing corporate training programs and certified masterclasses
        </p>
      </div>

      {success ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-lg space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Learning Program Published!</h2>
          <p className="text-xs text-slate-500">
            Scholars with matching skill gaps will receive auto-recommendations to enroll. Redirecting...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Program Title</label>
              <input
                type="text"
                required
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Cloud Native DevOps & Kubernetes Masterclass"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Sponsoring Enterprise / Faculty</label>
              <input
                type="text"
                required
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Program Format</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="certification">Industry Certification</option>
                <option value="workshop">Hands-On Workshop</option>
                <option value="course">Self-Paced Course</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Duration</label>
              <input
                type="text"
                required
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="e.g. 4 Weeks / 20 Hours"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Difficulty Level</label>
              <select
                name="level"
                value={formData.level}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Student Enrollment Fee</label>
              <input
                type="text"
                required
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Targeted Skills Covered (comma separated)
            </label>
            <input
              type="text"
              required
              name="skillsCovered"
              value={formData.skillsCovered}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Program Overview</label>
            <textarea
              required
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe curriculum objectives, practical training, and industry assessment methods..."
              className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Syllabus Modules (one module per line)
            </label>
            <textarea
              rows={3}
              name="syllabus"
              value={formData.syllabus}
              onChange={handleChange}
              className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>{loading ? 'Publishing Program...' : 'Publish Learning Module'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
