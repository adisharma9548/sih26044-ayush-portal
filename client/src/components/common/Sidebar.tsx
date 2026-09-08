import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Award,
  Radar,
  BookOpen,
  Briefcase,
  FileCheck,
  FolderGit2,
  PlusCircle,
  Users,
  Search,
  School,
  CalendarCheck,
  LineChart,
  UserCheck,
  Settings,
  GraduationCap,
  Video
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const { role } = useAuth();

  const studentNav = [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Skill Assessment', path: '/student/assessment', icon: Award },
    { label: 'Skill Gap Radar', path: '/student/skills', icon: Radar },
    { label: 'Live Video Meetings', path: '/meetings', icon: Video },
    { label: 'Learning Paths', path: '/student/learning', icon: BookOpen },
    { label: 'Internships', path: '/student/internships', icon: Briefcase },
    { label: 'Placement Jobs', path: '/student/jobs', icon: GraduationCap },
    { label: 'My Applications', path: '/student/applications', icon: FileCheck },
    { label: 'Digital Portfolio', path: '/student/portfolio', icon: FolderGit2 },
  ];

  const industryNav = [
    { label: 'Recruiter Dashboard', path: '/industry/dashboard', icon: LayoutDashboard },
    { label: 'Live Video Interviews', path: '/meetings', icon: Video },
    { label: 'Post Internship / Job', path: '/industry/post', icon: PlusCircle },
    { label: 'Post Learning Module', path: '/industry/post-program', icon: BookOpen },
    { label: 'Manage Applicants', path: '/industry/applicants', icon: Users },
    { label: 'Candidate Search', path: '/industry/candidates', icon: Search },
  ];

  const academicianNav = [
    { label: 'Faculty Dashboard', path: '/academician/dashboard', icon: LayoutDashboard },
    { label: 'Live Mentorship Meetings', path: '/meetings', icon: Video },
    { label: 'Industry Immersion & FDP', path: '/academician/opportunities', icon: School },
    { label: 'Mentorship & Workshops', path: '/academician/mentorship', icon: CalendarCheck },
  ];

  const adminNav = [
    { label: 'Executive Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Live Video Conferences', path: '/meetings', icon: Video },
    { label: 'Student & Faculty Progress', path: '/admin/progress', icon: LineChart },
    { label: 'Analytics & Reports', path: '/admin/reports', icon: Award },
    { label: 'Users & Industry Partners', path: '/admin/users', icon: UserCheck },
  ];

  const getNavLinks = () => {
    switch (role) {
      case 'student': return studentNav;
      case 'industry': return industryNav;
      case 'academician': return academicianNav;
      case 'admin': return adminNav;
      default: return studentNav;
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside
      className={`fixed lg:sticky top-16 z-30 h-[calc(100vh-4rem)] w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="p-4 space-y-6 overflow-y-auto">
        {/* Navigation group */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3">
            {role.toUpperCase()} MENU
          </span>
          <nav className="mt-2 space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Global section */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3">
            ACCOUNT
          </span>
          <nav className="mt-2 space-y-1">
            <NavLink
              to="/profile"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Profile & Settings</span>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Institutional verification footer card */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[11px] font-medium text-slate-600">SkillBridge Connected</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">National Placement Portal v1.0</p>
      </div>
    </aside>
  );
};
