import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { StudentCertificate, StudentProject } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  ShieldCheck,
  Award,
  Leaf,
  Plus,
  ExternalLink,
  Download,
  Calendar,
  Sparkles,
  FileCheck2,
  FolderGit2,
  CheckCircle2
} from 'lucide-react';

export const DigitalPortfolioPage: React.FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);
  const [projects, setProjects] = useState<StudentProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Add project modal
  const [showAddProject, setShowAddProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    role: 'Lead Student Researcher',
    technologies: '',
    description: '',
    link: '',
    startDate: 'Jan 2026',
    endDate: 'May 2026'
  });

  // Certificate preview modal
  const [previewCert, setPreviewCert] = useState<StudentCertificate | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      setLoading(true);
      const res = await api.skills.getPortfolioData(user?.id);
      setCertificates(res.data.certificates);
      setProjects(res.data.projects);
      setLoading(false);
    };
    fetchPortfolio();
  }, [user]);

  const handleAddProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const techArray = projectForm.technologies.split(',').map((t) => t.trim());
    const res = await api.skills.addPortfolioProject({
      title: projectForm.title,
      role: projectForm.role,
      technologies: techArray,
      description: projectForm.description,
      link: projectForm.link || undefined,
      startDate: projectForm.startDate,
      endDate: projectForm.endDate
    });
    setProjects([res.data, ...projects]);
    setShowAddProject(false);
    setProjectForm({
      title: '',
      role: 'Lead Student Researcher',
      technologies: '',
      description: '',
      link: '',
      startDate: 'Jan 2026',
      endDate: 'May 2026'
    });
  };

  const downloadCV = () => {
    alert('Generating signed Digital CV with verified credentials...');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              NATIONAL VERIFIED PORTFOLIO
            </span>
            <span className="text-xs text-slate-400">SkillBridge Verified</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Digital Portfolio & Credentials
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Your verified competencies, academic projects, and certified badges
          </p>
        </div>

        <button
          onClick={downloadCV}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-2 self-start sm:self-auto shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Verified CV (PDF)</span>
        </button>
      </div>

      {/* Verified Badges Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">National Certified Badges</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically signed micro-credentials verified by accredited regulatory councils
          </p>
        </div>

        {certificates.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            No certified badges earned yet. Complete assessments or bridge courses to earn verified badges.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                onClick={() => setPreviewCert(cert)}
                className="p-5 rounded-2xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-xs cursor-pointer transition-all bg-slate-50/50 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <Badge variant="emerald" size="sm">VERIFIED</Badge>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{cert.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">{cert.issuer}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Issued: {cert.issueDate}</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    View <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Research & Academic Projects Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Technical & Research Projects</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Software repositories, laboratory trials, and academic projects
            </p>
          </div>

          <button
            onClick={() => setShowAddProject(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
          </button>
        </div>

        <div className="space-y-4 pt-2">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all bg-white space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{proj.title}</h4>
                  <p className="text-xs font-semibold text-emerald-700 mt-0.5">{proj.role}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{proj.startDate} - {proj.endDate}</span>
                  {proj.link && (
                    <a
                      href={proj.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-600 hover:text-emerald-600 p-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{proj.description}</p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {proj.technologies.map((tech, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Project Modal */}
      {showAddProject && (
        <Modal
          isOpen={true}
          onClose={() => setShowAddProject(false)}
          title="Add Research Project"
          subtitle="Showcase your laboratory investigations to industry recruiters"
        >
          <form onSubmit={handleAddProjectSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Project Title</label>
              <input
                type="text"
                required
                value={projectForm.title}
                onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                placeholder="e.g. Phytochemical Standardization of Guduchi"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Your Role</label>
                <input
                  type="text"
                  required
                  value={projectForm.role}
                  onChange={(e) => setProjectForm({ ...projectForm, role: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">DOI or Paper Link</label>
                <input
                  type="url"
                  value={projectForm.link}
                  onChange={(e) => setProjectForm({ ...projectForm, link: e.target.value })}
                  placeholder="https://doi.org/..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Analytical Techniques / Tools (comma separated)
              </label>
              <input
                type="text"
                required
                value={projectForm.technologies}
                onChange={(e) => setProjectForm({ ...projectForm, technologies: e.target.value })}
                placeholder="HPTLC, Soxhlet, HPLC, GCP, Ayurvedic Pharmacopoeia"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Brief Methodology & Findings</label>
              <textarea
                required
                rows={3}
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Describe objectives, botanical specimens tested, and key outcomes..."
                className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddProject(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Save Project
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Certificate View Modal */}
      {previewCert && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewCert(null)}
          title={previewCert.title}
          subtitle={`Issued by ${previewCert.issuer}`}
        >
          <div className="space-y-4 text-xs text-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-500/30 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">{previewCert.title}</h4>
              <p className="text-slate-500 mt-1">{previewCert.issuer} • {previewCert.issueDate}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 font-mono text-[11px]">
              Credential ID: SKILLBRIDGE-CERT-908123-VERIFIED
            </div>
            <p className="text-slate-400">
              This credential has been verified against the National Higher Education & Skills Registry.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
