import { isNotNull } from "../../helpers";
import { autoCompleteProviders } from "./auto_complete_registry";

autoCompleteProviders.add("dataValidation", {
  getProposals(tokenAtCursor, content) {
    if (content.startsWith("=")) {
      return [];
    }
    const position = this.composer.currentEditedCell;
    const rule = this.getters.getValidationRuleForCell(position);
    if (
      !rule ||
      (rule.criterion.type !== "isValueInList" && rule.criterion.type !== "isValueInRange")
    ) {
      return [];
    }

    let values: string[];
    if (rule.criterion.type === "isValueInList") {
      values = rule.criterion.values;
    } else {
      const range = this.getters.getRangeFromSheetXC(position.sheetId, rule.criterion.values[0]);
      values = this.getters
        .getRangeValues(range)
        .filter(isNotNull)
        .map((value) => value.toString())
        .filter((val) => val !== "");
    }
    return values.map((value) => ({ text: value }));
  },
  selectProposal(tokenAtCursor, value) {
    this.composer.setCurrentContent(value);
    this.composer.stopEdition();
  },
});
