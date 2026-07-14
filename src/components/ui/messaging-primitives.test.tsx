// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from './attachment';
import { Bubble, BubbleContent } from './bubble';
import { Marker, MarkerContent } from './marker';
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from './message';
import {
  MessageScroller,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from './message-scroller';

describe('owned shadcn messaging primitives', () => {
  it('composes message identity, a bubble, status, and attachment slots', () => {
    render(
      <Message align="end">
        <MessageContent>
          <MessageHeader>Abi · 2:51 PM</MessageHeader>
          <Bubble align="end">
            <BubbleContent>Sounds good.</BubbleContent>
          </Bubble>
          <Attachment state="done">
            <AttachmentContent>
              <AttachmentTitle>resume.pdf</AttachmentTitle>
              <AttachmentDescription>248 KB</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
          <MessageFooter>Delivered</MessageFooter>
        </MessageContent>
      </Message>,
    );

    expect(
      screen.getByText('Sounds good.').closest('[data-slot=bubble]'),
    ).toHaveAttribute('data-align', 'end');
    expect(
      screen.getByText('resume.pdf').closest('[data-slot=attachment]'),
    ).toHaveAttribute('data-state', 'done');
    expect(screen.getByText('Delivered')).toHaveAttribute(
      'data-slot',
      'message-footer',
    );
  });

  it('composes markers and a scrollable thread from the official shadcn slots', () => {
    render(
      <MessageScrollerProvider>
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent>
              <Marker variant="separator">
                <MarkerContent>Unread messages</MarkerContent>
              </Marker>
              <MessageScrollerItem id="message-1">Hello</MessageScrollerItem>
            </MessageScrollerContent>
          </MessageScrollerViewport>
        </MessageScroller>
      </MessageScrollerProvider>,
    );

    expect(screen.getByText('Unread messages')).toHaveAttribute(
      'data-slot',
      'marker-content',
    );
    expect(screen.getByText('Hello')).toHaveAttribute(
      'data-slot',
      'message-scroller-item',
    );
  });
});
