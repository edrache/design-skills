// Narrative strings live independently from the story graph. Empty translations
// are deliberately treated as missing so an unfinished locale falls back to English.
export function createI18n(sources, initialLocale = "pl") {
  let locale = initialLocale;

  const hasText = (value) => typeof value !== "string" || value.trim().length > 0;

  return {
    get locale() { return locale; },
    setLocale(next) { locale = next; },
    t(key) {
      const localized = sources[locale]?.[key];
      if (localized !== undefined && localized !== null && hasText(localized)) return localized;

      const fallback = sources.en?.[key];
      if (fallback !== undefined && fallback !== null && hasText(fallback)) return fallback;
      return `[${key}]`;
    },
  };
}
