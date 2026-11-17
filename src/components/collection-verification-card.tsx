'use client';

import { m } from '../paraglide/messages';
import {
  ItemVerificationTick,
  type ItemVerificationActions,
} from './item-verification';
import { ItemVerificationDetails } from './item-verification-details';

import { collectionVerifiableItems } from '@/board/collection-verification';
import {
  canRequestVerification,
  type VerifiableItem,
} from '@/board/item-verification';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import type {
  MyItemVerification,
  ProfileObjectReferences,
} from '@cavuno/board';

/** Moves to the item's empty details in the profile form. */
function AddDetailsButton({ item }: { item: VerifiableItem }) {
  return (
    <Badge
      variant="outline"
      render={
        <button
          type="button"
          aria-label={m.itemVerification_addDetailsAriaLabel({
            item: item.label,
          })}
          data-test="item-verification-add-details"
          onClick={() => {
            const section = document.getElementById(
              item.missingDetailsId ?? '',
            );
            section?.scrollIntoView({ block: 'center' });
            section
              ?.querySelector<HTMLElement>(
                'input:not([type=hidden]):not([readonly]), textarea, [role=combobox], [contenteditable=true]',
              )
              ?.focus({ preventScroll: true });
          }}
        />
      }
    >
      {m.itemVerification_addDetailsLabel()}
    </Badge>
  );
}

/**
 * The collection items a board verifies, each with the details the check
 * covers and its indicator. An item with a checked detail still empty asks
 * for it ("Add details") instead of offering to verify. Renders nothing
 * when the board verifies none of the stored selections.
 */
export function ItemVerificationCard({
  items,
  actions,
}: {
  items: readonly VerifiableItem[];
  actions?: ItemVerificationActions;
}) {
  if (items.length === 0) return null;
  return (
    <Card id="verification" data-test="item-verification-card">
      <CardHeader>
        <CardTitle>
          <h2>{m.itemVerification_heading()}</h2>
        </CardTitle>
        <CardDescription>{m.itemVerification_intro()}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <Item
              key={item.itemKey}
              variant="outline"
              size="sm"
              render={<li />}
            >
              <ItemContent>
                <ItemTitle className="flex-wrap gap-1.5">
                  {item.label}
                  {item.missingDetailsId &&
                  canRequestVerification(item.verification) ? (
                    <AddDetailsButton item={item} />
                  ) : (
                    <ItemVerificationTick item={item} actions={actions} />
                  )}
                </ItemTitle>
                <ItemVerificationDetails details={item.details} />
              </ItemContent>
            </Item>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * The verification card for a profile's collection fields, from the owner
 * reads. The profile pages load it on its own, only when a field verifies.
 */
export function CollectionVerificationCard({
  objectReferences,
  verifications,
  emailDomain,
  actions,
}: {
  objectReferences: ProfileObjectReferences | null | undefined;
  verifications: ReadonlyMap<string, MyItemVerification>;
  /** Whether items can be checked by email (talent profiles only). */
  emailDomain: boolean;
  actions?: ItemVerificationActions;
}) {
  return (
    <ItemVerificationCard
      items={collectionVerifiableItems(objectReferences, verifications, {
        emailDomain,
      })}
      actions={actions}
    />
  );
}
