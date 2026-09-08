import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import {
  Video,
  Calendar,
  Clock,
  User,
  Plus,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  X,
  Loader2,
  Users
} from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { WebRtcVideoRoom } from '../../components/meeting/WebRtcVideoRoom';

interface MeetingItem {
  id: string;
  title: string;
  type: 'interview' | 'mentorship' | 'collaboration' | 'fdp';
  organizerName: string;
  organizerRole: string;
  participantName: string;
  participantEmail: string;
  scheduledAt: string;
  durationMinutes: number;
  roomId: string;
  meetingUrl: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

export const LiveMeetingPage: React.FC = () => {
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeCallRoom, setActiveCallRoom] = useState<MeetingItem | null>(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');

  // Auto-launch room if ?room= parameter is provided in the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roomParam = params.get('room');
    const titleParam = params.get('title');

    if (roomParam) {
      setActiveCallRoom({
        id: roomParam,
        roomId: roomParam,
        title: titleParam || 'Technical Interview Session',
        type: 'interview',
        organizerName: 'Interview Board',
        organizerRole: 'industry',
        participantName: user?.name || 'Participant',
        participantEmail: user?.email || '',
        scheduledAt: new Date().toISOString(),
        durationMinutes: 45,
        meetingUrl: `/meetings?room=${roomParam}`,
        status: 'in_progress',
      });
    }
  }, [location.search, user]);

  const handleCloseRoom = () => {
    setActiveCallRoom(null);
    navigate('/meetings', { replace: true });
  };

  const handleDirectJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;

    let targetRoom = roomCodeInput.trim();
    // Support pasting full URL like http://localhost:5173/meetings?room=xyz or just xyz
    if (targetRoom.includes('room=')) {
      const match = targetRoom.match(/[?&]room=([^&]+)/);
      if (match) targetRoom = decodeURIComponent(match[1]);
    }

    setActiveCallRoom({
      id: targetRoom,
      roomId: targetRoom,
      title: 'Direct Video Session',
      type: 'interview',
      organizerName: 'Direct Peer Room',
      organizerRole: 'industry',
      participantName: user?.name || 'Participant',
      participantEmail: user?.email || '',
      scheduledAt: new Date().toISOString(),
      durationMinutes: 60,
      meetingUrl: `/meetings?room=${targetRoom}`,
      status: 'in_progress',
    });
    setRoomCodeInput('');
  };

  // Scheduling form state
  const [formData, setFormData] = useState({
    title: '',
    type: 'interview' as const,
    participantEmail: '',
    participantName: '',
    scheduledAt: '',
    durationMinutes: 45,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const res = await api.meetings.getMyMeetings();
      setMeetings(res.data || []);
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.meetings.schedule({
        title: formData.title,
        type: formData.type,
        participantEmail: formData.participantEmail,
        participantName: formData.participantName,
        scheduledAt: formData.scheduledAt,
        durationMinutes: Number(formData.durationMinutes),
        notes: formData.notes,
      });
      setShowScheduleModal(false);
      setFormData({
        title: '',
        type: 'interview',
        participantEmail: '',
        participantName: '',
        scheduledAt: '',
        durationMinutes: 45,
        notes: '',
      });
      fetchMeetings();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to schedule meeting');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Live Hiring & Mentorship
            </span>
            <span className="text-xs text-slate-400">Native WebRTC HD Secured (Unlimited)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Live Video Meetings & Interviews</h1>
          <p className="text-xs text-slate-500 mt-1">
            Conduct secure one-on-one technical interviews, academic mentorships, and corporate hiring rounds.
          </p>
        </div>

        {(role === 'industry' || role === 'academician' || role === 'admin') && (
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2 self-start sm:self-auto transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Interview</span>
          </button>
        )}
      </div>

      {/* Built-in Native WebRTC Video Call Room (Zero Jitsi, Unlimited Duration) */}
      {activeCallRoom && user && (
        <WebRtcVideoRoom
          roomId={activeCallRoom.roomId || activeCallRoom.id}
          roomTitle={activeCallRoom.title}
          currentUser={{
            id: user.id,
            name: user.name,
            role: user.role,
          }}
          onClose={handleCloseRoom}
        />
      )}

      {/* Direct Room Code / Link Entry Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <form onSubmit={handleDirectJoin} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs shrink-0">
            <Video className="w-4 h-4 text-emerald-600" />
            <span>Join Room by Code:</span>
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              placeholder="Enter Room Code (e.g. interview-65f... or paste room link)"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
            />
          </div>
          <button
            type="submit"
            disabled={!roomCodeInput.trim()}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
          >
            Enter Call
          </button>
        </form>
      </div>

      {/* Meetings List Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900">Your Scheduled Sessions</h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Loading scheduled conferences...</span>
          </div>
        ) : meetings.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No Meetings Scheduled Yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {role === 'student'
                ? 'When an industry recruiter or faculty mentor schedules an interview with you, it will appear here with an instant 1-click join room link.'
                : 'Click "Schedule New Interview" to arrange a live video meeting with a candidate or scholar.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{m.title}</span>
                    <Badge variant={m.type === 'interview' ? 'emerald' : 'blue'} size="sm">
                      {m.type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(m.scheduledAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(m.scheduledAt).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      ({m.durationMinutes} mins)
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {role === 'student' ? `Host: ${m.organizerName}` : `Candidate: ${m.participantName}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveCallRoom(m)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join Room</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduling Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Schedule Live Meeting</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 my-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Technical Interview Round 1 (Full-Stack & Algorithms)"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Participant Email</label>
                  <input
                    type="email"
                    required
                    placeholder="student@dtu.edu.in"
                    value={formData.participantEmail}
                    onChange={(e) => setFormData({ ...formData, participantEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Participant Name</label>
                  <input
                    type="text"
                    placeholder="Candidate Name"
                    value={formData.participantName}
                    onChange={(e) => setFormData({ ...formData, participantName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Minutes)</label>
                  <select
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Notes / Agenda</label>
                <textarea
                  rows={2}
                  placeholder="Topics to discuss, project review, or coding problems..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Confirm Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
