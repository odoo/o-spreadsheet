import { getHtmlContentFromPattern } from "../../components/helpers/html_content_helpers";
import { COMPOSER_ASSISTANT_COLOR } from "../../constants";
import { functionRegistry } from "../../functions";
import { autoCompleteProviders } from "./auto_complete_registry";

autoCompleteProviders.add("functions", {
  sequence: 100,
  autoSelectFirstProposal: true,
  maxDisplayedProposals: 10,
  getProposals(tokenAtCursor) {
    if (tokenAtCursor.type !== "SYMBOL") {
      return [];
    }
    const searchTerm = tokenAtCursor.value;
    if (!this.composer.currentContent.startsWith("=")) {
      return [];
    }
    const values = Object.entries(functionRegistry.content)
      .filter(([_, { hidden }]) => !hidden)
      .map(([text, { description }]) => {
        return {
          text,
          description,
          htmlContent: getHtmlContentFromPattern(
            searchTerm,
            text,
            COMPOSER_ASSISTANT_COLOR,
            "o-semi-bold"
          ),
        };
      })
      .sort((a, b) => {
        return a.text.length - b.text.length || a.text.localeCompare(b.text);
      });
    return values;
  },
  selectProposal(tokenAtCursor, value) {
    let start = tokenAtCursor.end;
    let end = tokenAtCursor.end;

    // shouldn't it be REFERENCE ?
    if (["SYMBOL", "FUNCTION"].includes(tokenAtCursor.type)) {
      start = tokenAtCursor.start;
    }

    const tokens = this.composer.currentTokens;
    value += "(";

    const currentTokenIndex = tokens.map((token) => token.start).indexOf(tokenAtCursor.start);
    if (currentTokenIndex + 1 < tokens.length) {
      const nextToken = tokens[currentTokenIndex + 1];
      if (nextToken?.type === "LEFT_PAREN") {
        end++;
      }
    }
    this.composer.changeComposerCursorSelection(start, end);
    this.composer.replaceComposerCursorSelection(value);
  },
});
