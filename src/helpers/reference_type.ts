// Helper file for the reference types in Xcs (the $ symbol, eg. A$1)
import { loopThroughReferenceType } from "@odoo/o-spreadsheet-engine/helpers/references";
import { Locale } from "@odoo/o-spreadsheet-engine/types/locale";
import { composerTokenize, EnrichedToken } from "../formulas/composer_tokenizer";

/**
 * Return the cycled reference if any (A1 -> $A$1 -> A$1 -> $A1 -> A1)
 */
export function cycleFixedReference(
  selection: { start: number; end: number },
  content: string,
  locale: Locale
) {
  const currentTokens: EnrichedToken[] = content.startsWith("=")
    ? composerTokenize(content, locale)
    : [];

  const tokens = currentTokens.filter(
    (t) =>
      (t.start <= selection.start && t.end >= selection.start) ||
      (t.start >= selection.start && t.start < selection.end)
  );

  const refTokens = tokens.filter((token) => token.type === "REFERENCE");
  if (refTokens.length === 0) {
    return;
  }

  const updatedReferences = tokens
    .map(loopThroughReferenceType)
    .map((token) => token.value)
    .join("");

  const start = tokens[0].start;
  const end = tokens[tokens.length - 1].end;
  const newContent = content.slice(0, start) + updatedReferences + content.slice(end);
  const lengthDiff = newContent.length - content.length;
  const startOfTokens = refTokens[0].start;
  const endOfTokens = refTokens[refTokens.length - 1].end + lengthDiff;
  const newSelection = { start: startOfTokens, end: endOfTokens };
  if (refTokens.length === 1 && selection.start === selection.end) {
    newSelection.start = newSelection.end;
  }
  return { content: newContent, selection: newSelection };
}
