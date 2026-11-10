type TranslationTree = Record<string, unknown>;

/** Keys that could change Object.prototype if merged; translation files never need them. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isPlainObject = (value: unknown): value is TranslationTree =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

const mergeInto = (target: TranslationTree, source: TranslationTree) => {
  for (const [key, value] of Object.entries(source)) {
    if (UNSAFE_KEYS.has(key)) {
      continue;
    }
    const existing = target[key];
    if (isPlainObject(value)) {
      const branch: TranslationTree = isPlainObject(existing) ? existing : {};
      target[key] = mergeInto(branch, value);
    } else {
      target[key] = value;
    }
  }
  return target;
};

/**
 * Deep-merges translation files into one object. Later files win on conflicting leaf keys.
 * The inputs are never modified.
 */
export const mergeTranslations = (files: unknown[]): TranslationTree => {
  const result: TranslationTree = {};
  for (const file of files) {
    if (isPlainObject(file)) {
      mergeInto(result, structuredClone(file));
    }
  }
  return result;
};
