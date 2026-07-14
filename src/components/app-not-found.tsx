import { Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import * as m from '@/paraglide/messages';

export function NotFound() {
  return (
    <Empty className="mx-auto max-w-md py-24">
      <EmptyHeader>
        <EmptyTitle>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {m.notFound_heading()}
          </h1>
        </EmptyTitle>
        <EmptyDescription>{m.notFound_body()}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link to="/" />} size="lg">
          {m.notFound_browseJobsLink()}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
