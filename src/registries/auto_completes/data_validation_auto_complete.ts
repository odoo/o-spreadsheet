import { GRAY_200 } from "@odoo/o-spreadsheet-engine/constants";
import { chipTextColor, isFormula } from "../../helpers";
import { autoCompleteProviders } from "./auto_complete_registry";

autoCompleteProviders.add("dataValidation", {
  displayAllOnInitialContent: true,
  canBeToggled: false,
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
        ? this.getters.getDataValidationRangeValues(sheetId, rule.criterion)
        : rule.criterion.values.map((value) => ({ label: value, value }));

    const isChip = rule.criterion.displayStyle === "chip";
    if (!isChip) {
      return values.map((value) => ({
        text: value.value,
        fuzzySearchKey: value.label,
        htmlContent: [{ value: value.label }],
      }));
    }
    const colors = rule.criterion.colors;
    return values.map((value) => {
      const color = colors?.[value.value];
      return {
        text: value.value,
        htmlContent: [
          {
            value: value.label,
            color: chipTextColor(color || GRAY_200),
            backgroundColor: color || GRAY_200,
            classes: ["badge rounded-pill fs-6 fw-normal w-100 mt-1 text-start"],
          },
        ],
        fuzzySearchKey: value.label,
      };
    });
  },
  selectProposal(tokenAtCursor, proposal) {
    this.composer.setCurrentContent(proposal.text);
    this.composer.stopEdition();
  },
});
