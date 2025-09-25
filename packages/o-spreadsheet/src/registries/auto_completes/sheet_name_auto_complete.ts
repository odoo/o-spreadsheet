import { getCanonicalSymbolName } from "../../helpers";
import { autoCompleteProviders } from "./auto_complete_registry";

autoCompleteProviders.add("sheet_names", {
  sequence: 150,
  autoSelectFirstProposal: true,
  getProposals(tokenAtCursor) {
    if (
      tokenAtCursor.type === "SYMBOL" ||
      (tokenAtCursor.type === "UNKNOWN" && tokenAtCursor.value.startsWith("'"))
    ) {
      return this.getters.getSheetIds().map((sheetId) => {
        const sheetName = getCanonicalSymbolName(this.getters.getSheetName(sheetId));
        return {
          text: sheetName,
          fuzzySearchKey: sheetName.startsWith("'") ? sheetName : "'" + sheetName, // typing a single quote is a way to avoid matching function names
        };
      });
    }
    return [];
  },
  selectProposal(tokenAtCursor, value) {
    const start = tokenAtCursor.start;
    const end = tokenAtCursor.end;
    this.composer.changeComposerCursorSelection(start, end);
    this.composer.replaceComposerCursorSelection(value + "!");
  },
});
