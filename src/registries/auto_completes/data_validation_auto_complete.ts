import { CHIP_DEFAULT_COLOR } from "../../constants";
import { chipTextColor, isFormula, isNotNull } from "../../helpers";
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

    if (rule.criterion.type === "isValueInList") {
      const isChip = rule.criterion.displayStyle === "chip";
      if (!isChip) {
        return rule.criterion.values.map((value) => ({ text: value }));
      }
      const colors = rule.criterion.colors;
      return rule.criterion.values.map((value, index) => {
        const color = colors?.[index];
        return {
          text: value,
          htmlContent: [
            {
              value,
              color: color ? chipTextColor(color) : undefined,
              backgroundColor: color || CHIP_DEFAULT_COLOR,
              classes: ["badge rounded-pill"],
            },
          ],
        };
      });
    } else {
      const range = this.getters.getRangeFromSheetXC(position.sheetId, rule.criterion.values[0]);
      return Array.from(
        new Set(
          this.getters
            .getRangeValues(range)
            .filter(isNotNull)
            .map((value) => value.toString())
            .filter((val) => val !== "")
        )
      ).map((value) => ({ text: value }));
    }
  },
  selectProposal(tokenAtCursor, value) {
    this.composer.setCurrentContent(value);
    this.composer.stopEdition();
  },
});
