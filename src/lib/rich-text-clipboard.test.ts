import { describe, expect, it } from 'vitest';

import {
  importedFileToHtml,
  plainTextToHtml,
  shouldPastePlainText,
} from './rich-text-clipboard';

describe('shouldPastePlainText', () => {
  it('uses plain text when the clipboard has no HTML', () => {
    expect(shouldPastePlainText('', 'Hello role')).toBe(true);
  });

  it('uses plain text for Microsoft Word markup', () => {
    expect(
      shouldPastePlainText(
        '<html xmlns:o="urn:schemas-microsoft-com:office:office"><body><p>Engineer</p></body></html>',
        'Engineer',
      ),
    ).toBe(true);
  });

  it('uses plain text when HTML has no visible characters', () => {
    expect(
      shouldPastePlainText('<img src="blob:desc">', 'Staff Engineer'),
    ).toBe(true);
  });

  it('leaves ordinary HTML paste to the editor', () => {
    expect(
      shouldPastePlainText('<p>Staff Engineer</p>', 'Staff Engineer'),
    ).toBe(false);
  });

  it('does not force a paste when there is no plain text', () => {
    expect(shouldPastePlainText('<p>Hi</p>', '   ')).toBe(false);
  });
});

describe('plainTextToHtml', () => {
  it('turns blank lines into paragraphs and keeps single breaks', () => {
    expect(plainTextToHtml('One\nline\n\nTwo')).toBe(
      '<p>One<br>line</p><p>Two</p>',
    );
  });

  it('escapes HTML in pasted plain text', () => {
    expect(plainTextToHtml('<script>x</script>')).toBe(
      '<p>&lt;script&gt;x&lt;/script&gt;</p>',
    );
  });
});

describe('importedFileToHtml', () => {
  it('wraps text and markdown files as paragraphs', () => {
    expect(importedFileToHtml('role.txt', 'Hello\n\nWorld')).toBe(
      '<p>Hello</p><p>World</p>',
    );
    expect(importedFileToHtml('role.md', 'Hello')).toBe('<p>Hello</p>');
  });

  it('passes HTML files through', () => {
    expect(importedFileToHtml('role.html', '<h2>Hello</h2>')).toBe(
      '<h2>Hello</h2>',
    );
  });

  it('rejects files the editor cannot parse locally', () => {
    expect(importedFileToHtml('role.docx', 'PK\u0003\u0004')).toBeNull();
    expect(importedFileToHtml('role.pdf', '%PDF')).toBeNull();
  });
});
