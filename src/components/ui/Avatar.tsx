import { useState } from 'react';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Avatar({ name, src, size = 'sm', className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        aria-label={name}
        title={name}
        className={`inline-flex items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/70 dark:border-indigo-800/70 shrink-0 select-none ${SIZE_CLASSES[size]} ${className}`}
      >
        {getInitials(name)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      title={name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 ${SIZE_CLASSES[size]} ${className}`}
    />
  );
}
