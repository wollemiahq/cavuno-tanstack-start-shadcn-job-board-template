// TS 7.0's default export exposes only `version`; its compiler API moved to
// unstable/* subpaths and won't stabilise until 7.1. This runtime AST scan
// stays on the TS 6 API via the official @typescript/typescript6 compat
// package while the project's tsc/editor run on TypeScript 7.
import ts from 'typescript-6';
import { describe, expect, it } from 'vitest';

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Finds user-visible string literals in source: JSX text with letters,
 * string literals in known user-visible attributes, and bare literals in
 * JSX expression containers. Hardcoded copy renders English on every
 * locale and is invisible on /en-XA/ (unbracketed).
 */

const ROOT = join(import.meta.dirname, '..');
const SRC_ROOT = join(ROOT, 'src');

const USER_VISIBLE_ATTRS = new Set([
  'placeholder',
  'aria-label',
  'title',
  'alt',
  'label',
]);

/** Generated output and non-UI sources the scan skips. */
const SKIP_DIRS = new Set([
  'paraglide',
  // Application-owned page prose (legal/about, …). Operators edit these
  // files in place; they are not UI chrome and must not route through
  // Paraglide. See src/content/legal/.
  'content',
]);
const SKIP_FILES = /\.test\.tsx?$|routeTree\.gen\.ts$/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(entry.name) && !SKIP_FILES.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

function scanFile(path: string): string[] {
  const violations: string[] = [];
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const report = (node: ts.Node, text: string) => {
    const trimmed = text.trim();
    if (!/[A-Za-z]{2,}/.test(trimmed)) return; // symbols/single letters: not copy
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    violations.push(`:${line + 1} — ${JSON.stringify(trimmed)}`);
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      report(node, node.text);
    } else if (
      ts.isJsxAttribute(node) &&
      USER_VISIBLE_ATTRS.has(node.name.getText()) &&
      node.initializer
    ) {
      if (ts.isStringLiteral(node.initializer)) {
        report(node, node.initializer.text);
      } else if (
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression &&
        ts.isStringLiteral(node.initializer.expression)
      ) {
        report(node, node.initializer.expression.text);
      }
    } else if (
      ts.isJsxExpression(node) &&
      node.expression &&
      ts.isStringLiteral(node.expression) &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
    ) {
      report(node, node.expression.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return violations;
}

function scan(): Map<string, string[]> {
  const byFile = new Map<string, string[]>();
  for (const path of sourceFiles(SRC_ROOT)) {
    const violations = scanFile(path);
    if (violations.length > 0) {
      byFile.set(relative(ROOT, path), violations);
    }
  }
  return byFile;
}

describe('hardcoded-copy guard (en-XA coverage companion)', () => {
  const results = scan();

  it('routes user-visible strings through the localization seams', () => {
    const violations = [...results.entries()].flatMap(([file, hits]) =>
      hits.map((hit) => `${file}${hit}`),
    );
    expect(
      violations,
      `Hardcoded user-visible copy — route it through Paraglide messages ` +
        `(messages/en.json + de/fr, npm run gen:messages) or the boardCopy ` +
        `seam:\n${violations.join('\n')}`,
    ).toEqual([]);
  });
});
