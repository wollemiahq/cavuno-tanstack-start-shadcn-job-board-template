import { Link } from '@tanstack/react-router';

import { buttonVariants } from '@/components/ui/button';
import { m } from '@/paraglide/messages';

/** How a visitor reaches the board's operator. */
export type BoardContact = {
  boardName: string;
  /** The board publishes a `/contact` page (`contactEnabled`). */
  contactPage: boolean;
  /** The board's contact email (`footer.contactEmail`). */
  email: string | null;
};

/** Whether `BoardContactButton` has anywhere to send the visitor. */
export function canContactBoard(
  contact: BoardContact | null | undefined,
): contact is BoardContact {
  return Boolean(contact && (contact.contactPage || contact.email));
}

/**
 * "Contact {board}": the board's contact page when it has one, else its
 * contact email, else nothing. Offered where only the operator can unblock
 * the visitor, such as a board that takes no job posts.
 */
export function BoardContactButton({
  contact,
}: {
  contact: BoardContact | null | undefined;
}) {
  if (!canContactBoard(contact)) return null;
  const label = m.postJob_contactBoardLabel({ board: contact.boardName });
  // Filled, like the Post a job action it stands in for.
  const className = buttonVariants();
  if (contact.contactPage) {
    return (
      <Link to="/contact" className={className}>
        {label}
      </Link>
    );
  }
  return (
    <a href={`mailto:${contact.email}`} className={className}>
      {label}
    </a>
  );
}
