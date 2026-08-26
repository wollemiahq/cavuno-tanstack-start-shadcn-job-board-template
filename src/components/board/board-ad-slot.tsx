'use client';

import { useEffect } from 'react';

import { adsClientId, adsEnabled, adsSlot } from '@/lib/site-ads';

const ADSENSE_SCRIPT_ID = 'cavuno-adsense-loader';

function ensureAdSenseScript(clientId: string) {
  if (document.getElementById(ADSENSE_SCRIPT_ID)) return;
  const script = document.createElement('script');
  script.id = ADSENSE_SCRIPT_ID;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
  document.head.appendChild(script);
}

export function BoardAdSlot({
  placement,
  className,
}: {
  placement: string;
  className?: string;
}) {
  const enabled = adsEnabled();
  const clientId = adsClientId();
  const slot = adsSlot(placement);
  const active = enabled && clientId !== null && slot !== null;

  useEffect(() => {
    if (!active || !clientId) return;
    ensureAdSenseScript(clientId);
    // SAFETY: adsbygoogle is the publisher queue AdSense attaches to window;
    // we only push an empty object onto that array.
    const w = window as Window & { adsbygoogle?: unknown[] };
    w.adsbygoogle = w.adsbygoogle ?? [];
    w.adsbygoogle.push({});
  }, [active, clientId]);

  if (!active || !clientId || !slot) return null;

  return (
    <div data-ad-placement={placement} className={className}>
      <ins
        className="adsbygoogle"
        data-ad-client={clientId}
        data-ad-slot={slot.slotId}
        data-full-width-responsive="true"
        style={{ display: 'block' }}
      />
    </div>
  );
}
