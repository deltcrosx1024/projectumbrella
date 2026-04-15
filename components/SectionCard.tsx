import type { ReactNode } from 'react';

interface SectionCardProps {
  readonly title: string;
  readonly description: string;
  readonly children?: ReactNode;
  readonly highlight?: boolean;
}

// Reusable card component used across the homepage and dashboard.
export function SectionCard({
  title,
  description,
  children,
  highlight = false,
}: SectionCardProps) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/5 backdrop-blur transition-all duration-200 ${
        highlight ? 'border-blue-400/30 bg-blue-500/10' : 'hover:border-white/20 hover:bg-white/10'
      }`}
    >
      <h2 className="mb-3 text-xl font-semibold text-white">{title}</h2>
      <p className="mb-4 max-w-xl leading-7 text-zinc-300">{description}</p>
      {children}
    </div>
  );
}
