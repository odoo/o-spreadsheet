import { GRAY_200 } from "../../constants";
import { chipTextColor, isFormula } from "../../helpers";
import { autoCompleteProviders } from "./auto_complete_registry";

autoCompleteProviders.add("dataValidation", {
  displayAllOnInitialContent: true,
  getProposals(tokenAtCursor, content) {
    if (isFormula(content)) {
      return [];
    }
    if (!this.composer.currentEditedCell) {
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
    const sheetId = this.composer.currentEditedCell.sheetId;
    const values =
      rule.criterion.type === "isValueInRange"
        ? Array.from(new Set(this.getters.getDataValidationRangeValues(sheetId, rule.criterion)))
        : rule.criterion.values;

    const isChip = rule.criterion.displayStyle === "chip";
    if (!isChip) {
      return values.map((value) => ({ text: value }));
    }
    const colors = rule.criterion.colors;
    return values.map((value) => {
      const color = colors?.[value];
      return {
        text: value,
        htmlContent: [
          {
            value,
            color: color ? chipTextColor(color) : undefined,
            backgroundColor: color || GRAY_200,
            classes: ["badge rounded-pill fs-6 fw-normal w-100 mt-1 text-start"],
          },
        ],
      };
    });
  },
  selectProposal(tokenAtCursor, value) {
    this.composer.setCurrentContent(value);
    this.composer.stopEdition();
  },
});
