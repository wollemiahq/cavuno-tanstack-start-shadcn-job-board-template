import { Folder } from 'lucide-react';

import type { PublicHelpCategory } from '@cavuno/board';

/**
 * A help category's icon in a square tile: the operator's emoji, built-in
 * icon or uploaded image. A category without one, or with a kind this site
 * does not know, shows a folder so the cards line up. It is decoration: the
 * category's name is beside it.
 */
export function HelpCategoryIcon({
  icon,
}: {
  icon: PublicHelpCategory['icon'];
}) {
  return (
    <span
      aria-hidden
      data-slot="help-category-icon"
      className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
    >
      <HelpCategoryIconMark icon={icon} />
    </span>
  );
}

function HelpCategoryIconMark({ icon }: { icon: PublicHelpCategory['icon'] }) {
  if (icon?.type === 'emoji') {
    return <span className="text-lg leading-none">{icon.value}</span>;
  }
  if (icon?.type === 'icon') {
    // The Board API sends the drawing itself, so this site keeps no table of
    // icon names. It is `1em` square and drawn in `currentColor`: the font
    // size here sets its size and the tile's text colour sets its colour.
    return (
      <span
        data-slot="help-category-icon-drawing"
        className="flex text-lg leading-none"
        dangerouslySetInnerHTML={{ __html: icon.svg }}
      />
    );
  }
  if (icon?.type === 'image') {
    return (
      <img
        src={icon.url}
        alt=""
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
    );
  }
  return <Folder className="size-4.5" />;
}
