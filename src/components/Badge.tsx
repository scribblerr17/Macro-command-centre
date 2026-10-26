import React from 'react';
import { BadgeVariant } from '../types/macro';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  [BadgeVariant.Green]: 'bg-[#10b981]/18 text-[#6ee7b7] border-[#10b981]/40',
  [BadgeVariant.Amber]: 'bg-[#f59e0b]/18 text-[#fcd34d] border-[#f59e0b]/40',
  [BadgeVariant.Red]: 'bg-[#ef4444]/20 text-[#fca5a5] border-[#ef4444]/45',
  [BadgeVariant.Blue]: 'bg-[#38bdf8]/18 text-[#38bdf8] border-[#38bdf8]/40',
};

export const Badge: React.FC<BadgeProps> = ({ variant, children }) => {
  return (
    <span
      className={`inline-block rounded-[4px] border px-2 py-[3px] font-mono text-[0.72rem] font-bold ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
};
