'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react';
import * as React from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Resolve the board's ACTIVE color mode the same way the app themes with.
 * `themeModeScript` (src/components/cavuno/board-theme.tsx) toggles the
 * `dark` class on <html> from board config (forcing the OS-`system` case
 * only). We mirror that class here — NOT next-themes, which this app never
 * mounts (so its `theme` would be a permanent `'system'`, making toasts
 * follow the OS instead of the board's configured/forced mode). Re-reads on
 * class changes so a runtime mode flip (system → dark, preview persona
 * switch) re-themes the toasts.
 */
function useResolvedThemeMode(): 'light' | 'dark' {
  const [mode, setMode] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    const root = document.documentElement;
    const read = () =>
      setMode(root.classList.contains('dark') ? 'dark' : 'light');
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return mode;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useResolvedThemeMode();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
