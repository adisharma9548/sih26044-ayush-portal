import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useAuth } from '../../hooks/useAuth';
import { Bell, Check, Trash2, ExternalLink, Calendar, Briefcase, Award, ShieldAlert, Building2, Users, Sparkles } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, clearAll, isLoading } = useNotificationStore();
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const isAdmin = user?.role === 'admin';

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'application': return Briefcase;
      case 'mentorship': return Calendar;
      case 'match': return Award;
      case 'alert': return ShieldAlert;
      case 'achievement': return Users;
      default: return isAdmin ? Sparkles : ShieldAlert;
    }
  };

  const tabs = isAdmin
    ? [
        { key: 'all', label: 'All Alerts' },
        { key: 'alert', label: 'Accreditation Actions' },
        { key: 'system', label: 'System & MoUs' },
        { key: 'achievement', label: 'Scholar Rosters' },
      ]
    : [
        { key: 'all', label: 'All Updates' },
        { key: 'application', label: 'Applications' },
        { key: 'match', label: 'Skill Matches' },
        { key: 'mentorship', label: 'Mentorship' },
        { key: 'system', label: 'System' },
      ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isAdmin ? 'Administrative Alerts & System Oversight' : 'Notification Center'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Real-time administrative oversight regarding employer accreditations, MoU proposals, scholar registries, and platform security'
              : 'Real-time updates regarding your applications, interview invites, and skill recommendations'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => markAllAsRead()}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark All as Read</span>
          </button>
          <button
            onClick={() => clearAll()}
            className="px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto p-1 bg-white border border-slate-200/80 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              filter === tab.key
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredNotifs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Notifications</h3>
            <p className="text-xs text-slate-400 mt-1">You are completely up to date.</p>
          </div>
        ) : (
          filteredNotifs.map((n) => {
            const Icon = getIcon(n.type);
            return (
              <div
                key={n.id}
                className={`p-5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 ${
                  !n.read ? 'bg-emerald-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    !n.read ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      )}
                      <Badge variant="slate" size="sm">
                        {n.type.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                    <span className="text-[11px] text-slate-400 mt-2 block">{n.timestamp}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {n.link && (
                    <button
                      onClick={() => {
                        markAsRead(n.id);
                        navigate(n.link!);
                      }}
                      className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                  {!n.read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Mark as Read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
