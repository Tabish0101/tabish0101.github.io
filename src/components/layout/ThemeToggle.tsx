'use client';

import { Moon, Sun } from 'lucide-react';
import { THEME_STORAGE_KEY } from '@/lib/head-script';
import { useDocumentTheme } from '@/lib/use-theme';

/** Sun/moon, no visible label. Dark is the default; the choice persists in localStorage. */
export function ThemeToggle() {
  const theme = useDocumentTheme();

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the theme still applies for this page view.
    }
  };

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      aria-label="Light theme"
      aria-pressed={theme === 'light'}
      data-magnetic
    >
      {/* Both icons render on the server; CSS shows the right one before hydration. */}
      <Sun className="theme-icon-dark" size={20} strokeWidth={1.5} aria-hidden="true" />
      <Moon className="theme-icon-light" size={20} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}
