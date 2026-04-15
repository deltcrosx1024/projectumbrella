import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

// useTheme is a reusable hook for dark/light mode with localStorage persistence.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (globalThis.window === undefined) {
      return 'system';
    }

    const saved = globalThis.window.localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }

    return 'system';
  });

  useEffect(() => {
    const currentWindow = globalThis.window;
    const root = currentWindow.document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      const systemTheme = currentWindow.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      return;
    }
    root.classList.add(theme);
    currentWindow.localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, setTheme };
}
