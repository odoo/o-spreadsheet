import { CellPosition, CellValue, Getters } from "../..";
import { positions } from "../../helpers";
import { autoCompleteProviders } from "./auto_complete_registry";

autoCompleteProviders.add("dataValidation", {
  displayAllOnInitialContent: true,
  getProposals(tokenAtCursor, content) {
    if (content.startsWith("=")) {
      return [];
    }
    if (!this.composer.currentEditedCell) {
      return [];
    }

    return getProposedValues(this.getters, this.composer.currentEditedCell).map((value) => ({
      text: value.value?.toString() || "",
      htmlContent: [{ value: value.label }],
      fuzzySearchKey: value.label,
    }));
  },
  selectProposal(tokenAtCursor, value) {
    this.composer.setCurrentContent(value);
    this.composer.stopEdition();
  },
});

function getProposedValues(
  getters: Getters,
  position: CellPosition
): { label: string; value: CellValue }[] {
  const rule = getters.getValidationRuleForCell(position);
  if (
    !rule ||
    (rule.criterion.type !== "isValueInList" && rule.criterion.type !== "isValueInRange")
  ) {
    return [];
  }

  let values: { label: string; value: CellValue }[] = [];
  if (rule.criterion.type === "isValueInList") {
    values = rule.criterion.values.map((value) => ({ label: value, value }));
  } else {
    const labelsSet = new Set<string>();
    const range = getters.getRangeFromSheetXC(position.sheetId, rule.criterion.values[0]);
    for (const p of positions(range.zone)) {
      const cell = getters.getEvaluatedCell({ ...p, sheetId: range.sheetId });
      if (cell.formattedValue && !labelsSet.has(cell.formattedValue)) {
        labelsSet.add(cell.formattedValue);
        values.push({ label: cell.formattedValue, value: cell.value });
      }
    }
  }

  return values;
}
