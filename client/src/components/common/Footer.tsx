import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg tracking-tight">AYUSH Portal</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              National collaboration and competency mapping portal connecting traditional medicine, engineering, technology, and health-tech sciences with industry internships and corporate placement pipelines.
            </p>
            <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ministry of Ayush & UGC-Aligned</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Stakeholder Pathways</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/signup?role=student" className="hover:text-emerald-400 transition-colors">University Students (.edu.in)</Link></li>
              <li><Link to="/signup?role=jobseeker" className="hover:text-emerald-400 transition-colors">Job Seekers & Graduates</Link></li>
              <li><Link to="/signup?role=industry" className="hover:text-emerald-400 transition-colors">Enterprise Industry Partners</Link></li>
              <li><Link to="/signup?role=academician" className="hover:text-emerald-400 transition-colors">Faculty & Research Mentors</Link></li>
            </ul>
          </div>

          {/* Frameworks & Domains */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Academic Domains</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="hover:text-slate-200 transition-colors">Ayurveda & Traditional Systems</li>
              <li className="hover:text-slate-200 transition-colors">Yoga & Naturopathy Sciences</li>
              <li className="hover:text-slate-200 transition-colors">Unani, Siddha & Homoeopathy</li>
              <li className="hover:text-slate-200 transition-colors">Technology, Engineering & AI</li>
              <li className="hover:text-slate-200 transition-colors">Health-Tech & Biomedical Informatics</li>
            </ul>
          </div>

          {/* Compliance / Help */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-3">Support & Verification</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a
                  href={`mailto:${import.meta.env.VITE_SUPPORT_EMAIL || 'support@ayushportal.in'}`}
                  className="hover:text-emerald-400 transition-colors"
                >
                  {import.meta.env.VITE_SUPPORT_EMAIL || 'support@ayushportal.in'}
                </a>
              </li>
              <li>256-bit Encrypted Token Authentication</li>
              <li>UGC Degree Recognition Registry</li>
              <li>Direct Directorate MoU Signatures</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 AYUSH Portal / SkillBridge (SIH26044). All Rights Reserved.</p>
          <p className="flex items-center gap-1 text-slate-400">
            Engineered for <span className="text-emerald-400 font-semibold">Integrative Healthcare & Technical Innovation</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
