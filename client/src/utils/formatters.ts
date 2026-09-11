import { ApplicationStatus } from '../types';

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export const getStatusBadgeColor = (status: ApplicationStatus | string) => {
  switch (status) {
    case 'applied':
      return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'Applied' };
    case 'in_review':
      return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'Under Review' };
    case 'shortlisted':
      return { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'Shortlisted' };
    case 'interview_scheduled':
      return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'Interview Scheduled' };
    case 'interview_completed':
      return { bg: 'bg-teal-50 text-teal-700 border-teal-200', text: 'Interview Completed' };
    case 'offered':
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Offer Extended' };
    case 'rejected':
      return { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'Not Selected' };
    case 'active':
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Active' };
    case 'closed':
      return { bg: 'bg-slate-50 text-slate-600 border-slate-200', text: 'Closed' };
    default:
      return { bg: 'bg-slate-100 text-slate-700 border-slate-300', text: status };
  }
};

export const getScoreGrade = (score: number) => {
  if (score >= 85) return { grade: 'Advanced (Tier 1)', color: 'text-emerald-600', ring: 'stroke-emerald-500' };
  if (score >= 70) return { grade: 'Proficient (Tier 2)', color: 'text-blue-600', ring: 'stroke-blue-500' };
  if (score >= 55) return { grade: 'Intermediate (Tier 3)', color: 'text-amber-600', ring: 'stroke-amber-500' };
  return { grade: 'Needs Bridge Course', color: 'text-rose-600', ring: 'stroke-rose-500' };
};
