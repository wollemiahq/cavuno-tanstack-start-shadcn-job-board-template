'use client';
import { useEffect, useState } from 'react';
/** Ad units must not request impressions while hidden by a breakpoint. */
export function useAdMedia(query?: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (!query) {
      setMatches(true);
      return;
    }
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}
