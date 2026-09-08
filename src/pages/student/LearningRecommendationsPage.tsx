import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { LearningProgram } from '../../types';
import { BookOpen, Star, Clock, Award, CheckCircle2, ChevronDown, ChevronUp, Sparkles, Play } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const LearningRecommendationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<LearningProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedSyllabus, setExpandedSyllabus] = useState<Record<string, boolean>>({});

  // Enrollment Modal state
  const [enrollingProg, setEnrollingProg] = useState<LearningProgram | null>(null);
  const [enrolledSuccess, setEnrolledSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrograms = async () => {
      setLoading(true);
      const res = await api.learning.getAll();
      setPrograms(res.data);
      setLoading(false);
    };
    fetchPrograms();
  }, []);

  const toggleSyllabus = (id: string) => {
    setExpandedSyllabus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEnroll = async (prog: LearningProgram) => {
    const res = await api.learning.enroll(prog.id);
    setEnrolledSuccess(res.data.message);
  };

  const filteredPrograms = programs.filter((p) => {
    if (filterType === 'all') return true;
    return p.type === filterType;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
            SKILL GAP BRIDGES
          </span>
          <span className="text-xs text-slate-400">National Ayush Curriculum Grid</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Learning & Certification Recommendations
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Targeted modules curated to eliminate competency gaps identified in your skill assessment
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto p-1 bg-white border border-slate-200/80 rounded-xl">
        {[
          { key: 'all', label: 'All Modules' },
          { key: 'certification', label: 'Certifications' },
          { key: 'workshop', label: 'Hands-on Labs' },
          { key: 'course', label: 'Self-Paced Courses' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              filterType === tab.key
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Program Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPrograms.map((prog) => (
          <div
            key={prog.id}
            className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={prog.providerLogo || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=80&auto=format&fit=crop&q=80'}
                    alt={prog.provider}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                  />
                  <div>
                    <span className="text-[11px] font-bold text-slate-500">{prog.provider}</span>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{prog.title}</h3>
                  </div>
                </div>
                <Badge variant={prog.type === 'certification' ? 'purple' : prog.type === 'workshop' ? 'amber' : 'blue'}>
                  {prog.type.toUpperCase()}
                </Badge>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{prog.description}</p>

              {/* Skills covered chips */}
              <div className="flex flex-wrap gap-1.5">
                {prog.skillsCovered.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-semibold"
                  >
                    +{skill}
                  </span>
                ))}
              </div>

              {/* Course Meta Specs */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Duration</span>
                  <span className="font-semibold text-slate-800 text-[11px]">{prog.duration}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Rating</span>
                  <span className="font-semibold text-amber-600 text-[11px] flex items-center justify-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-500" /> {prog.rating}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">Fee</span>
                  <span className="font-bold text-emerald-700 text-[11px]">{prog.cost}</span>
                </div>
              </div>

              {/* Expandable Syllabus */}
              {prog.syllabus && (
                <div className="pt-2">
                  <button
                    onClick={() => toggleSyllabus(prog.id)}
                    className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <span>{expandedSyllabus[prog.id] ? 'Hide Syllabus Modules' : 'View Syllabus Modules (4)'}</span>
                    {expandedSyllabus[prog.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {expandedSyllabus[prog.id] && (
                    <ul className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 animate-in fade-in duration-150">
                      {prog.syllabus.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400 font-medium">
                {prog.enrolledCount.toLocaleString()} scholars enrolled
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/student/learning/course/${prog.id}`)}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Start Course</span>
                </button>
                <button
                  onClick={() => setEnrollingProg(prog)}
                  className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition-colors"
                >
                  Details & Enroll
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enrollment Modal */}
      {enrollingProg && (
        <Modal
          isOpen={true}
          onClose={() => {
            setEnrollingProg(null);
            setEnrolledSuccess(null);
          }}
          title={enrolledSuccess ? 'Enrollment Confirmed!' : `Enroll in ${enrollingProg.title}`}
          subtitle={enrollingProg.provider}
        >
          {enrolledSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-600">{enrolledSuccess}</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    const id = enrollingProg.id;
                    setEnrollingProg(null);
                    setEnrolledSuccess(null);
                    navigate(`/student/learning/course/${id}`);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Launch Course Workspace</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                You are about to register for this government & industry subsidized module. Course completion will automatically add a verified badge to your Ayush Skill Radar.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Program Fee:</span>
                  <span className="font-bold text-emerald-700">{enrollingProg.cost}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-bold text-slate-800">{enrollingProg.duration}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEnrollingProg(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleEnroll(enrollingProg)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Confirm Registration
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
