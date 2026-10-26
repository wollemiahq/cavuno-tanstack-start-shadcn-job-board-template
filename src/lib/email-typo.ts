/**
 * "Did you mean …@gmail.com?" for the commonest mistyped mail domains.
 * Download links go to whatever address is typed, so a typo there loses the
 * buyer their files. A fixed table, not fuzzy matching: it only ever
 * suggests a domain we are sure about.
 */
const DOMAIN_FIXES = new Map([
  ['gmial.com', 'gmail.com'],
  ['gmal.com', 'gmail.com'],
  ['gmai.com', 'gmail.com'],
  ['gamil.com', 'gmail.com'],
  ['gmail.co', 'gmail.com'],
  ['gmail.con', 'gmail.com'],
  ['gmail.cm', 'gmail.com'],
  ['gnail.com', 'gmail.com'],
  ['hotmial.com', 'hotmail.com'],
  ['hotmal.com', 'hotmail.com'],
  ['hotmail.co', 'hotmail.com'],
  ['hotmail.con', 'hotmail.com'],
  ['outlok.com', 'outlook.com'],
  ['outlook.co', 'outlook.com'],
  ['outlook.con', 'outlook.com'],
  ['yaho.com', 'yahoo.com'],
  ['yahoo.co', 'yahoo.com'],
  ['yahoo.con', 'yahoo.com'],
  ['iclod.com', 'icloud.com'],
  ['icloud.co', 'icloud.com'],
  ['icloud.con', 'icloud.com'],
]);

/** The corrected address, or null when the domain looks fine. */
export function suggestEmailFix(email: string): string | null {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf('@');
  if (at < 1) return null;
  const domain = trimmed.slice(at + 1).toLowerCase();
  const fix = DOMAIN_FIXES.get(domain);
  return fix ? `${trimmed.slice(0, at)}@${fix}` : null;
}
