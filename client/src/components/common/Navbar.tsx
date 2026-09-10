import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationStore } from '../../store/useNotificationStore';
import {
  Bell,
  User as UserIcon,
  LogOut,
  Settings,
  CheckCircle,
  Sparkles,
  Menu,
  X,
  ExternalLink,
  Shield
} from 'lucide-react';
import { Badge } from './Badge';
import { UserAvatar } from './UserAvatar';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  const { user, role, isAuthenticated, logout } = useAuth();
  const { notifications, unreadCount, fetchNotifications, markAsRead } = useNotificationStore();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    switch (role) {
      case 'student':
      case 'jobseeker':
        return '/student/dashboard';
      case 'industry': return '/industry/dashboard';
      case 'academician': return '/academician/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand / Logo */}
          <div className="flex items-center gap-3">
            {isAuthenticated && onToggleMobileMenu && (
              <button
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <Link to={isAuthenticated ? getDashboardPath() : '/'} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg text-slate-900 tracking-tight">NodalConnector</span>
                  <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                    NATIONAL
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 hidden sm:block">
                  Multi-Disciplinary Skills & Placement Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Notification Bell Dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifs(!showNotifs)}
                    className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg relative transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifs && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">
                          {role === 'admin' ? 'Administrative Alerts' : 'Notifications'}
                        </span>
                        <span className="text-xs text-emerald-600 font-medium">
                          {unreadCount} unread
                        </span>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-slate-400">
                            {role === 'admin' ? 'No administrative alerts pending' : 'No notifications yet'}
                          </div>
                        ) : (
                          notifications.slice(0, 4).map((n) => (
                            <div
                              key={n.id}
                              onClick={() => {
                                markAsRead(n.id);
                                if (n.link) navigate(n.link);
                                setShowNotifs(false);
                              }}
                              className={`px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                                !n.read ? 'bg-emerald-50/40' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs font-bold text-slate-800">{n.title}</h4>
                                <span className="text-[10px] text-slate-400 shrink-0">{n.timestamp}</span>
                              </div>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="px-4 py-2 border-t border-slate-100 text-center">
                        <Link
                          to="/notifications"
                          onClick={() => setShowNotifs(false)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                        >
                          {role === 'admin' ? 'View all governance alerts →' : 'View all notifications →'}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Role Badge Indicator */}
                <div className="hidden sm:flex items-center">
                  <Badge
                    variant={
                      role === 'student' ? 'emerald' :
                      role === 'industry' ? 'blue' :
                      role === 'academician' ? 'amber' : 'purple'
                    }
                  >
                    {role.toUpperCase()}
                  </Badge>
                </div>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2.5 p-1 rounded-full hover:ring-2 hover:ring-emerald-500/30 transition-all"
                  >
                    <UserAvatar user={user} size="sm" />
                    <span className="hidden md:block text-xs font-bold text-slate-800 max-w-[120px] truncate">
                      {user?.name || 'My Account'}
                    </span>
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>Profile & Settings</span>
                      </Link>

                      <Link
                        to="/notifications"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-700"
                      >
                        <Bell className="w-4 h-4" />
                        <span>Notification Preferences</span>
                      </Link>

                      <div className="border-t border-slate-100 my-1"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="text-xs font-bold text-slate-700 hover:text-emerald-600 px-3 py-2"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
