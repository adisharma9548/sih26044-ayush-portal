import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { MentorshipRequest, Workshop } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  CalendarCheck,
  Users,
  Video,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Sparkles
} from 'lucide-react';

export const MentorshipWorkshopPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'mentorship' | 'workshops'>('mentorship');

  const [mentorships, setMentorships] = useState<MentorshipRequest[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  // New Workshop Modal
  const [showNewWorkshopModal, setShowNewWorkshopModal] = useState(false);
  const [aiGeneratingWorkshop, setAiGeneratingWorkshop] = useState(false);
  const [aiWorkshopNotice, setAiWorkshopNotice] = useState('');
  const [workshopForm, setWorkshopForm] = useState({
    title: '',
    date: '',
    time: '02:00 PM - 04:00 PM IST',
    mode: 'Online' as const,
    capacity: 100,
    description: '',
    targetAudience: ''
  });

  const handleAiWorkshopDraft = async () => {
    setAiGeneratingWorkshop(true);
    setAiWorkshopNotice('');
    try {
      const res = await api.ai.generateLearningModuleDraft({
        domain: 'Higher Education & Technical Innovation',
        type: 'workshop',
        prompt: workshopForm.title.trim() || undefined,
      });
      const draft = res.data;
      if (draft) {
        setWorkshopForm((prev) => ({
          ...prev,
          title: draft.title || prev.title,
          description: `${draft.description}\n\nTopics Covered:\n${draft.syllabus?.map((s: string) => `• ${s}`).join('\n')}`,
        }));
        setAiWorkshopNotice('✨ AI auto-drafted workshop curriculum!');
        setTimeout(() => setAiWorkshopNotice(''), 4000);
      }
    } catch (err: any) {
      setAiWorkshopNotice('AI drafting unavailable. Please enter details manually.');
      setTimeout(() => setAiWorkshopNotice(''), 3000);
    } finally {
      setAiGeneratingWorkshop(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [mentRes, wkRes] = await Promise.all([
        api.academician.getMentorshipRequests(),
        api.academician.getWorkshops()
      ]);
      setMentorships(mentRes.data);
      setWorkshops(wkRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleUpdateMentorship = async (id: string, status: MentorshipRequest['status']) => {
    const res = await api.academician.updateMentorshipStatus(id, status);
    setMentorships((prev) => prev.map((m) => (m.id === id ? res.data : m)));
  };

  const handleCreateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.academician.createWorkshop({
      title: workshopForm.title,
      organizer: user?.institution || user?.name || 'Academic Institution',
      facultyName: user?.name || 'Faculty Guide',
      date: workshopForm.date,
      time: workshopForm.time,
      mode: workshopForm.mode,
      capacity: Number(workshopForm.capacity),
      description: workshopForm.description,
      targetAudience: workshopForm.targetAudience
    });
    setWorkshops([res.data, ...workshops]);
    setShowNewWorkshopModal(false);
    setWorkshopForm({
      title: '',
      date: '2026-10-12',
      time: '02:00 PM - 05:00 PM IST',
      mode: 'Online',
      capacity: 150,
      description: '',
      targetAudience: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              ACADEMIC OUTREACH
            </span>
            <span className="text-xs text-slate-400">Institutional Knowledge Dissemination</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Mentorship & Workshop Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Guide student research projects and host certified webinars for students nationwide
          </p>
        </div>

        {activeTab === 'workshops' && (
          <button
            onClick={() => setShowNewWorkshopModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Host New Workshop</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('mentorship')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'mentorship'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student 1-on-1 Mentorship ({mentorships.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('workshops')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'workshops'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Hosted Workshops & Webinars ({workshops.length})</span>
        </button>
      </div>

      {/* Tab 1: Mentorship Requests */}
      {activeTab === 'mentorship' && (
        <div className="space-y-4">
          {mentorships.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{req.studentName}</h3>
                    <Badge variant={req.status === 'accepted' ? 'emerald' : 'amber'} size="sm">
                      {req.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs font-bold text-amber-800 mt-0.5">{req.topic}</p>
                  <p className="text-[11px] text-slate-500">{req.studentEmail} • Requested Slot: {req.preferredDate}</p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {req.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleUpdateMentorship(req.id, 'accepted')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        Accept Request
                      </button>
                      <button
                        onClick={() => handleUpdateMentorship(req.id, 'declined')}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs"
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <a
                      href={req.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Guidance Room</span>
                    </a>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 p-3 bg-slate-50 rounded-xl leading-relaxed">
                "{req.message}"
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Workshops & Webinars */}
      {activeTab === 'workshops' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workshops.map((wk) => (
            <div
              key={wk.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant={wk.mode === 'Online' ? 'blue' : 'emerald'} size="sm">
                    {wk.mode.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-slate-400">{wk.status.toUpperCase()}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{wk.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{wk.description}</p>

                <div className="space-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {wk.date} • {wk.time}</div>
                  {wk.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {wk.location}</div>}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">
                  {wk.registeredCount} / {wk.capacity} Registered
                </span>
                <span className="font-bold text-emerald-700">Open for Registration</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Workshop Modal */}
      {showNewWorkshopModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowNewWorkshopModal(false)}
          title="Host New Technical Workshop / Webinar"
          subtitle="Publish an institutional training session on the National Platform"
        >
          <form onSubmit={handleCreateWorkshop} className="space-y-4 text-xs">
            {/* AI Workshop Curriculum Co-Pilot */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span className="text-[11px] font-bold text-amber-900">AI Workshop Curriculum Co-Pilot</span>
              </div>
              <button
                type="button"
                onClick={handleAiWorkshopDraft}
                disabled={aiGeneratingWorkshop}
                className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <Sparkles className={`w-3 h-3 ${aiGeneratingWorkshop ? 'animate-spin' : ''}`} />
                <span>{aiGeneratingWorkshop ? 'Drafting...' : '✨ Auto-Draft with AI'}</span>
              </button>
            </div>
            {aiWorkshopNotice && (
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{aiWorkshopNotice}</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Workshop Title</label>
              <input
                type="text"
                required
                value={workshopForm.title}
                onChange={(e) => setWorkshopForm({ ...workshopForm, title: e.target.value })}
                placeholder="e.g. Modern Full-Stack Development & Cloud Deployment"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={workshopForm.date}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, date: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Time</label>
                <input
                  type="text"
                  required
                  value={workshopForm.time}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, time: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Mode</label>
                <select
                  value={workshopForm.mode}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, mode: e.target.value as any })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Online">Online Webinar</option>
                  <option value="Offline">On-Campus Lab Hands-on</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Capacity (Max Attendees)</label>
                <input
                  type="number"
                  required
                  value={workshopForm.capacity}
                  onChange={(e) => setWorkshopForm({ ...workshopForm, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Workshop Overview & Syllabus</label>
              <textarea
                required
                rows={3}
                value={workshopForm.description}
                onChange={(e) => setWorkshopForm({ ...workshopForm, description: e.target.value })}
                placeholder="Detail workshop outcomes, practical demonstrations, and institutional takeaways..."
                className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewWorkshopModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Schedule & Publish
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
