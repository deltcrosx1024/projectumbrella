'use client';

import { useTheme } from '@/lib/theme';
import { useEffect } from 'react';

// ThemeProvider is a wrapper component that ensures the theme hook runs on the client.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  // The hook already applies classes to document.documentElement.
  useEffect(() => {
    // This effect exists to keep the component client-only.
  }, [theme]);

  return children;
}
