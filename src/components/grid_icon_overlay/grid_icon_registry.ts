import {
  Align,
  CellPosition,
  CellValueType,
  SpreadsheetChildEnv,
  VerticalAlign,
} from "../../types";

import { Registry } from "../../registries/registry";
import { CellPopoverStore } from "../popover";

interface RegistryItem {
  template: string;
  match: (env: SpreadsheetChildEnv, cellPosition: CellPosition) => boolean;
  /** Variables that will be available in the template */
  ctx: (env: SpreadsheetChildEnv, cellPosition: CellPosition) => { [key: string]: any };
  horizontalAlign?: Align;
  verticalAlign?: VerticalAlign;
}

export const gridIconRegistry = new Registry<RegistryItem>();

gridIconRegistry.add("FilterIcon", {
  template: "o-spreadsheet-FilterIcon",
  match: (env, cellPosition) => env.model.getters.isFilterHeader(cellPosition),
  ctx: (env, cellPosition) => ({
    isFilterActive: env.model.getters.isFilterActive(cellPosition),
    onClick: () => {
      const cellPopoverStore = env.getStore(CellPopoverStore);
      const activePopover = cellPopoverStore.persistentCellPopover;
      const { col, row } = cellPosition;
      if (
        activePopover.isOpen &&
        activePopover.col === col &&
        activePopover.row === row &&
        activePopover.type === "FilterMenu"
      ) {
        cellPopoverStore.close();
        return;
      }
      cellPopoverStore.open({ col, row }, "FilterMenu");
    },
  }),
  horizontalAlign: "right",
});

gridIconRegistry.add("DataValidationCheckbox", {
  template: "o-spreadsheet-DataValidationCheckbox",
  match: (env, cellPosition) => {
    const rule = env.model.getters.getValidationRuleForCell(cellPosition);
    const cell = env.model.getters.getEvaluatedCell(cellPosition);
    return (
      rule?.criterion.type === "isBoolean" &&
      (typeof cell?.value === "boolean" || cell.type === CellValueType.empty) &&
      !env.model.getters.isReadonly()
    );
  },
  ctx: (env, cellPosition) => ({
    checkBoxValue: !!env.model.getters.getEvaluatedCell(cellPosition).value,
    isDisabled: !!env.model.getters.getCell(cellPosition)?.isFormula,
    onCheckboxChange: (ev: Event) => {
      const newValue = (ev.target as HTMLInputElement).checked;
      const cellContent = newValue ? "TRUE" : "FALSE";
      env.model.dispatch("UPDATE_CELL", { ...cellPosition, content: cellContent });
    },
  }),
});

gridIconRegistry.add("DataValidationList", {
  template: "o-spreadsheet-DataValidationListIcon",
  match: (env, cellPosition) => {
    const rule = env.model.getters.getValidationRuleForCell(cellPosition);
    return (
      !!rule &&
      (rule.criterion.type === "isValueInList" || rule.criterion.type === "isValueInRange") &&
      rule.criterion.displayStyle === "arrow"
    );
  },
  ctx: (env) => ({ onClick: () => env.startCellEdition("") }),
  horizontalAlign: "right",
});
