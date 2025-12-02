import { COMPOSER_ASSISTANT_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { functionRegistry } from "@odoo/o-spreadsheet-engine/functions/function_registry";
import { getHtmlContentFromPattern } from "../../components/helpers/html_content_helpers";
import { isFormula } from "../../helpers";
import { AutoCompleteProposal, autoCompleteProviders } from "./auto_complete_registry";

type FunctionAutoCompleteProposal = AutoCompleteProposal & { type: "function" | "named_range" };

autoCompleteProviders.add("functions_and_named_ranges", {
  sequence: 100,
  autoSelectFirstProposal: true,
  maxDisplayedProposals: 10,
  getProposals(tokenAtCursor) {
    if (tokenAtCursor.type !== "SYMBOL") {
      return [];
    }
    const searchTerm = tokenAtCursor.value;
    if (!isFormula(this.composer.currentContent)) {
      return [];
    }
    const values: FunctionAutoCompleteProposal[] = Object.entries(functionRegistry.content)
      .filter(([_, { hidden }]) => !hidden)
      .map(([text, { description }]) => {
        return {
          type: "function",
          text,
          description,
          htmlContent: getHtmlContentFromPattern(
            searchTerm,
            text,
            COMPOSER_ASSISTANT_COLOR,
            "o-semi-bold"
          ),
        };
      });

    values.push(
      ...this.getters.getNamedRanges().map((namedRange) => ({
        type: "named_range" as const,
        text: namedRange.name,
        description: this.getters.getRangeString(namedRange.range),
        icon: "o-spreadsheet-Icon.NAMED_RANGE",
        htmlContent: getHtmlContentFromPattern(
          searchTerm,
          namedRange.name,
          COMPOSER_ASSISTANT_COLOR,
          "o-semi-bold"
        ),
      }))
    );
    values.sort((a, b) => {
      return a.text.length - b.text.length || a.text.localeCompare(b.text);
    });
    return values;
  },
  selectProposal(tokenAtCursor, proposal: FunctionAutoCompleteProposal) {
    let start = tokenAtCursor.end;
    let end = tokenAtCursor.end;

    // shouldn't it be REFERENCE ?
    if (["SYMBOL", "FUNCTION"].includes(tokenAtCursor.type)) {
      start = tokenAtCursor.start;
    }

    const tokens = this.composer.currentTokens;
    let value = proposal.text;
    if (proposal.type === "function") {
      value += "(";

      const currentTokenIndex = tokens.map((token) => token.start).indexOf(tokenAtCursor.start);
      if (currentTokenIndex + 1 < tokens.length) {
        const nextToken = tokens[currentTokenIndex + 1];
        if (nextToken?.type === "LEFT_PAREN") {
          end++;
        }
      }
    }
    this.composer.changeComposerCursorSelection(start, end);
    this.composer.replaceComposerCursorSelection(value);
  },
});
