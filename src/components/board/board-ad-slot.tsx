'use client';

import { useEffect } from 'react';

import { adsSlot } from '@/lib/site-ads';

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
  clientId,
  className,
  layout = 'responsive',
}: {
  placement: string;
  clientId: string;
  className?: string;
  layout?: 'responsive' | 'rail';
}) {
  const slot = adsSlot(placement);
  const slotId = slot?.slotId ?? null;
  const isRail = layout === 'rail';

  useEffect(() => {
    if (!slotId) return;
    ensureAdSenseScript(clientId);
    // SAFETY: adsbygoogle is the publisher queue AdSense attaches to window;
    // we only push an empty object onto that array.
    const w = window as Window & { adsbygoogle?: unknown[] };
    w.adsbygoogle = w.adsbygoogle ?? [];
    w.adsbygoogle.push({});
  }, [clientId, slotId]);

  if (!slot || !slotId) return null;

  return (
    <div data-ad-placement={placement} className={className}>
      <ins
        className="adsbygoogle"
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format={slot.format}
        data-ad-layout={slot.layout}
        data-full-width-responsive={isRail ? undefined : 'true'}
        style={
          isRail
            ? { display: 'block', width: '160px', height: '600px' }
            : { display: 'block' }
        }
      />
    </div>
  );
}
