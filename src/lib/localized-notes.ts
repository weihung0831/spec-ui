/**
 * Extracts the localized section from bilingual release notes.
 * Format: English section first, then "\n---\n", then Chinese section.
 * Falls back to full text if no separator found.
 */
export function getLocalizedNotes(notes: string, lang: string): string {
  const parts = notes.split(/\n---\n/)
  if (parts.length < 2) return notes
  return lang.startsWith("zh") ? parts[1].trim() : parts[0].trim()
}
