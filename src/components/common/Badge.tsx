import React from 'react';
import { getStatusBadgeColor } from '../../utils/formatters';

interface BadgeProps {
  status?: string;
  variant?: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'slate';
  children?: React.ReactNode;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, variant, children, size = 'sm' }) => {
  const sizeClass = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  if (status) {
    const config = getStatusBadgeColor(status);
    return (
      <span className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${sizeClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70"></span>
        {children || config.text}
      </span>
    );
  }

  const variantMap = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${variant ? variantMap[variant] : variantMap.emerald} ${sizeClass}`}>
      {children}
    </span>
  );
};
