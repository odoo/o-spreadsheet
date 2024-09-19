import { ActionSpec } from "../../actions/action";
import { _t } from "../../translation";
import { CellValueType } from "../../types";

export const pivotProperties: ActionSpec = {
  name: _t("Edit Pivot"),
  execute(env) {
    const position = env.model.getters.getActivePosition();
    const pivotId = env.model.getters.getPivotIdFromPosition(position);
    env.openSidePanel("PivotSidePanel", { pivotId });
  },
  isVisible: (env) => {
    const position = env.model.getters.getActivePosition();
    const pivotId = env.model.getters.getPivotIdFromPosition(position);
    return (pivotId && env.model.getters.isExistingPivot(pivotId)) || false;
  },
  icon: "o-spreadsheet-Icon.PIVOT",
};

export const FIX_FORMULAS: ActionSpec = {
  name: _t("Convert to individual formulas"),
  execute(env) {
    const position = env.model.getters.getActivePosition();
    const cell = env.model.getters.getCorrespondingFormulaCell(position);
    const pivotId = env.model.getters.getPivotIdFromPosition(position);
    if (!cell || !pivotId) {
      return;
    }
    const { sheetId, col, row } = env.model.getters.getCellPosition(cell.id);
    const pivot = env.model.getters.getPivot(pivotId);
    pivot.init();
    if (!pivot.isValid()) {
      return;
    }
    env.model.dispatch("SPLIT_PIVOT_FORMULA", {
      sheetId,
      col,
      row,
      pivotId,
    });
  },
  isVisible: (env) => {
    const position = env.model.getters.getActivePosition();
    const pivotId = env.model.getters.getPivotIdFromPosition(position);
    if (!pivotId) {
      return false;
    }
    const pivot = env.model.getters.getPivot(pivotId);
    const cell = env.model.getters.getEvaluatedCell(position);
    return (
      pivot.isValid() &&
      env.model.getters.isSpillPivotFormula(position) &&
      cell.type !== CellValueType.error
    );
  },
  icon: "o-spreadsheet-Icon.PIVOT",
};
