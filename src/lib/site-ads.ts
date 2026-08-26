import adsJson from '@/ads.json';

const CLIENT_ID_RE = /^ca-pub-\d{16}$/;
const SLOT_ID_RE = /^\d{10}$/;

export type AdsSlot = {
  slotId: string;
  layout?: string;
  format?: string;
  style?: string;
};

export type AdsSlotFile = {
  enabled?: boolean | null;
  slotId?: string | null;
  layout?: string | null;
  format?: string | null;
  style?: string | null;
};

/** Machine-managed `src/ads.json`. Stock is disabled with empty slots. */
export type AdsFile = {
  enabled?: boolean | null;
  clientId?: string | null;
  slots?: Partial<Record<string, AdsSlotFile | null>> | null;
};

function trimmedText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export type AdsSnapshot = {
  enabled: boolean;
  clientId: string | null;
};

export function readAds(file: AdsFile): AdsSnapshot {
  const clientIdRaw = trimmedText(file.clientId);
  const clientId =
    clientIdRaw && CLIENT_ID_RE.test(clientIdRaw) ? clientIdRaw : null;
  return {
    enabled: file.enabled === true && clientId !== null,
    clientId,
  };
}

export function adsSlotFromFile(
  file: AdsFile,
  placement: string,
): AdsSlot | null {
  const slots = file.slots;
  if (slots == null) return null;
  const entry = slots[placement];
  if (entry == null || entry.enabled !== true) return null;
  const slotId = trimmedText(entry.slotId);
  if (!slotId || !SLOT_ID_RE.test(slotId)) return null;
  const slot: AdsSlot = { slotId };
  const layout = trimmedText(entry.layout);
  const format = trimmedText(entry.format);
  const style = trimmedText(entry.style);
  if (layout) slot.layout = layout;
  if (format) slot.format = format;
  if (style) slot.style = style;
  return slot;
}

// SAFETY: ads.json is machine-managed. Stock is `{ enabled: false, clientId:
// null, slots: {} }`; extra keys are ignored.
const adsFile = adsJson as AdsFile;
const ads = readAds(adsFile);

export function adsEnabled(): boolean {
  return ads.enabled;
}

export function adsClientId(): string | null {
  return ads.clientId;
}

export function adsSlot(placement: string): AdsSlot | null {
  return adsSlotFromFile(adsFile, placement);
}
