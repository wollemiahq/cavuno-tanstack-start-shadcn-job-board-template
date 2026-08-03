import type { BoardLabelOverrides } from '@cavuno/board/format';

export type MessageFn = (inputs?: Record<string, unknown>) => string;
export type CopyOverrides = Record<string, string | null | undefined>;

export function resolveCopyGroup(
  messages: ReadonlyArray<readonly [string, MessageFn]>,
  overrides?: CopyOverrides,
  params: Record<string, string> = {},
  templates: Record<string, string[]> = {},
): Record<string, unknown> {
  const copy: Record<string, unknown> = {};

  for (const [key, message] of messages) {
    const param = params[key];
    const templateTokens = templates[key];
    const value = param
      ? (input: unknown) => message({ [param]: input })
      : templateTokens
        ? message(
            Object.fromEntries(
              templateTokens.map((token) => [token, `{{${token}}}`]),
            ),
          )
        : message();
    const override = overrides?.[key];
    copy[key] =
      typeof value === 'string' &&
      typeof override === 'string' &&
      override.trim() !== ''
        ? override
        : value;
  }

  return copy;
}

export type { BoardLabelOverrides };
