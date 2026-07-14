import { m } from '../../paraglide/messages';
import { Avatar } from './avatar';

import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader } from '@/components/ui/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import type { BlockedUser } from '@cavuno/board';

export function BlockedList({
  users,
  pendingUserId,
  onUnblock,
  emptyText,
}: {
  users: BlockedUser[];
  pendingUserId: string | null;
  onUnblock: (boardUserId: string) => void;
  emptyText?: string;
}) {
  if (users.length === 0) {
    return (
      <Empty
        className="flex-1 rounded-none border-0 p-8"
        data-test="blocked-empty"
      >
        <EmptyHeader>
          <EmptyDescription>
            {emptyText ?? m.blockedList_emptyText()}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ItemGroup className="gap-0" data-test="blocked-list">
      {users.map((user) => (
        <Item
          key={user.id}
          role="listitem"
          className="rounded-none border-x-0 border-t-0 px-3 py-3 last:border-b-0"
          data-blocked-user-id={user.boardUserId}
        >
          <ItemMedia>
            <Avatar
              url={user.avatarUrl}
              name={user.displayName}
              className="size-10"
            />
          </ItemMedia>
          <ItemContent className="min-w-0">
            <ItemTitle>{user.displayName}</ItemTitle>
          </ItemContent>
          <ItemActions>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUnblock(user.boardUserId)}
              disabled={pendingUserId === user.boardUserId}
            >
              {pendingUserId === user.boardUserId
                ? m.blockedList_unblockingLabel()
                : m.blockedList_unblockLabel()}
            </Button>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}
