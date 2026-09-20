/* eslint-disable anti-slop/no-runtime-typeof -- This module validates untrusted JSON catalog values at the file-input boundary. */
/**
 * Validate a translated message catalog against the base catalog.
 *
 * The checker is deliberately pure so scripts and tests enforce the same
 * activation contract without coupling it to filesystem layout.
 */

const messageKeys = (catalog) =>
  Object.keys(catalog).filter((key) => !key.startsWith('$'));

const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const tokens = (value) => ({
  placeholders: [...(value.match(/\{\{[^{}]+\}\}|\{[^{}]+\}/g) ?? [])].sort(),
  tags: [...(value.match(/<\/?[A-Za-z][^>]*>/g) ?? [])].sort(),
});

function mergeTokens(values) {
  const merged = values.reduce(
    (merged, value) => {
      const next = tokens(value);
      merged.placeholders.push(...next.placeholders);
      merged.tags.push(...next.tags);
      return merged;
    },
    { placeholders: [], tags: [] },
  );
  merged.placeholders = [...new Set(merged.placeholders)].sort();
  merged.tags = [...new Set(merged.tags)].sort();
  return merged;
}

function checkText(source, target, path, errors, strictPlaceholders = true) {
  if (typeof target !== 'string') {
    errors.push(`${path} must be a string`);
    return;
  }
  if (target.trim().length === 0) errors.push(`${path} must not be empty`);
  const sourceTokens = tokens(source);
  const targetTokens = tokens(target);
  const placeholdersMatch = strictPlaceholders
    ? JSON.stringify(sourceTokens.placeholders) ===
      JSON.stringify(targetTokens.placeholders)
    : targetTokens.placeholders.every((token) =>
        sourceTokens.placeholders.includes(token),
      );
  if (
    !placeholdersMatch ||
    JSON.stringify(sourceTokens.tags) !== JSON.stringify(targetTokens.tags)
  ) {
    errors.push(`${path} changed interpolation or tag tokens`);
  }
}

function sourceArmFor(targetArm, sourceMatch, selector) {
  if (targetArm in sourceMatch) return targetArm;
  return (
    Object.keys(sourceMatch).find((arm) => arm === `${selector}=*`) ??
    Object.keys(sourceMatch)[0]
  );
}

function checkVariant(source, target, path, errors) {
  if (!isRecord(target)) {
    errors.push(`${path} must be a variant object`);
    return;
  }
  if (
    JSON.stringify(source.declarations) !== JSON.stringify(target.declarations)
  )
    errors.push(`${path}.declarations changed`);
  if (JSON.stringify(source.selectors) !== JSON.stringify(target.selectors))
    errors.push(`${path}.selectors changed`);

  const sourceMatch = source.match;
  const targetMatch = target.match;
  if (!isRecord(sourceMatch) || !isRecord(targetMatch)) {
    errors.push(`${path}.match must be an object`);
    return;
  }

  for (const arm of Object.keys(sourceMatch)) {
    if (!(arm in targetMatch)) errors.push(`${path}.match is missing ${arm}`);
  }
  const selector = Array.isArray(source.selectors)
    ? source.selectors[0]
    : undefined;
  for (const arm of Object.keys(targetMatch)) {
    if (selector && !arm.startsWith(`${selector}=`)) {
      errors.push(`${path}.match has unexpected arm ${arm}`);
      continue;
    }
    const sourceArm = sourceArmFor(arm, sourceMatch, selector);
    if (sourceArm === undefined) continue;
    checkText(
      sourceMatch[sourceArm],
      targetMatch[arm],
      `${path}.match.${arm}`,
      errors,
      false,
    );
  }
  const sourceTokens = mergeTokens(Object.values(sourceMatch));
  const targetTokens = mergeTokens(Object.values(targetMatch));
  if (JSON.stringify(sourceTokens) !== JSON.stringify(targetTokens)) {
    errors.push(`${path}.match changed interpolation or tag tokens`);
  }
}

function checkEntry(source, target, path, errors) {
  if (typeof source === 'string') {
    if (typeof target !== 'string') {
      errors.push(`${path} changed from string to variant`);
      return;
    }
    checkText(source, target, path, errors);
    return;
  }
  if (!Array.isArray(source)) {
    errors.push(`${path} has an unsupported base shape`);
    return;
  }
  if (!Array.isArray(target)) {
    errors.push(`${path} changed from variant to string`);
    return;
  }
  if (source.length !== target.length) {
    errors.push(`${path} changed variant count`);
  }
  for (const [index, sourceVariant] of source.entries()) {
    const targetVariant = target[index];
    if (targetVariant === undefined) continue;
    checkVariant(sourceVariant, targetVariant, `${path}[${index}]`, errors);
  }
}

/**
 * @param {Record<string, unknown>} source
 * @param {Record<string, unknown>} target
 * @param {string} [locale]
 * @returns {string[]}
 */
export function validateCatalog(source, target, locale = 'catalog') {
  const prefix = locale ? `${locale}: ` : '';
  const errors = [];
  if (!isRecord(source) || !isRecord(target)) {
    return [`${prefix}catalog must be a JSON object`];
  }

  const sourceKeys = messageKeys(source);
  const targetKeys = messageKeys(target);
  for (const key of sourceKeys) {
    if (!(key in target)) errors.push(`${prefix}missing key ${key}`);
  }
  for (const key of targetKeys) {
    if (!(key in source)) errors.push(`${prefix}unexpected key ${key}`);
  }
  for (const key of sourceKeys) {
    if (key in target)
      checkEntry(source[key], target[key], `${prefix}${key}`, errors);
  }
  return errors;
}
