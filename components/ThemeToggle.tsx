'use client';

import { useTheme } from '@/lib/theme';

// Simple theme toggle button for the top navigation.
const iconMap = {
  dark: '☀️',
  light: '🌙',
  system: '🖥️',
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lg transition hover:border-white/20 hover:bg-white/10"
      aria-label="Toggle theme"
    >
      <span>{iconMap[theme] ?? iconMap.system}</span>
    </button>
  );
}
