import type { VerifiableItem } from '@/board/item-verification';

/** The checked details of an item, label over value. */
export function ItemVerificationDetails({
  details,
}: {
  details: VerifiableItem['details'];
}) {
  if (!details?.length) return null;
  return (
    <dl className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {details.map((detail) => (
        <div key={detail.label} className="flex gap-1.5">
          <dt className="font-medium">{detail.label}</dt>
          <dd className="wrap-anywhere">{detail.text}</dd>
        </div>
      ))}
    </dl>
  );
}
