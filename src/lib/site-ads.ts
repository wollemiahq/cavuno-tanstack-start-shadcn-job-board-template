import adsJson from '@/ads.json';

const SLOT_ID_RE = /^\d{10}$/u;

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

/** Machine-managed `src/ads.json`. Stock has empty slots until an operator fills them. */
export type AdsFile = {
  slots?: Partial<Record<string, AdsSlotFile | null>> | null;
};

function trimmedText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

// SAFETY: ads.json is machine-managed. Stock is `{ slots: {} }`; extra keys
// are ignored. Enablement and publisher id come from `board.context().ads`.
const adsFile = adsJson as AdsFile;

export function adsSlot(placement: string): AdsSlot | null {
  return adsSlotFromFile(adsFile, placement);
}
