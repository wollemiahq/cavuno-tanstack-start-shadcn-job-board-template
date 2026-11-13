/** What a twin builder answers: the Markdown, a move, or no such page. */
export type MarkdownTwinResult =
  | {
      type: 'markdown';
      body: string;
      /** The HTML page's canonical URL, for the `Link` header. */
      canonical: string;
    }
  | { type: 'redirect'; location: string }
  | { type: 'notFound' };
