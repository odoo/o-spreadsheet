import { SortDirection, SpreadsheetChildEnv } from "../..";
import { ActionSpec } from "../../actions/action";
import { _t } from "../../translation";
import { CellValueType } from "../../types";
import { deepEquals } from "../misc";
import { domainToColRowDomain } from "./pivot_domain_helpers";

export const pivotProperties: ActionSpec = {
  name: _t("Edit pivot"),
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

export const pivotSortingAsc: ActionSpec = {
  name: _t("Ascending"),
  execute: (env) => sortPivot(env, "asc"),
  isActive: (env) => isPivotSortMenuItemActive(env, "asc"),
};

export const pivotSortingDesc: ActionSpec = {
  name: _t("Descending"),
  execute: (env) => sortPivot(env, "desc"),
  isActive: (env) => isPivotSortMenuItemActive(env, "desc"),
};

export const noPivotSorting: ActionSpec = {
  name: _t("No sorting"),
  execute: (env) => sortPivot(env, "none"),
  isActive: (env) => isPivotSortMenuItemActive(env, "none"),
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

export function canSortPivot(env: SpreadsheetChildEnv): boolean {
  const position = env.model.getters.getActivePosition();
  const pivotId = env.model.getters.getPivotIdFromPosition(position);
  if (
    !pivotId ||
    !env.model.getters.isExistingPivot(pivotId) ||
    !env.model.getters.isSpillPivotFormula(position)
  ) {
    return false;
  }
  const pivot = env.model.getters.getPivot(pivotId);
  if (!pivot.isValid()) {
    return false;
  }
  const pivotCell = env.model.getters.getPivotCellFromPosition(position);
  return pivotCell.type === "VALUE" || pivotCell.type === "MEASURE_HEADER";
}

function sortPivot(env: SpreadsheetChildEnv, order: SortDirection | "none") {
  const position = env.model.getters.getActivePosition();
  const pivotId = env.model.getters.getPivotIdFromPosition(position);
  const pivotCell = env.model.getters.getPivotCellFromPosition(position);
  if (pivotCell.type === "EMPTY" || pivotCell.type === "HEADER" || !pivotId) {
    return;
  }

  if (order === "none") {
    env.model.dispatch("UPDATE_PIVOT", {
      pivotId: pivotId,
      pivot: {
        ...env.model.getters.getPivotCoreDefinition(pivotId),
        sortedCol: undefined,
      },
    });
    return;
  }

  const pivot = env.model.getters.getPivot(pivotId);
  const colDomain = domainToColRowDomain(pivot, pivotCell.domain).colDomain;
  env.model.dispatch("UPDATE_PIVOT", {
    pivotId: pivotId,
    pivot: {
      ...env.model.getters.getPivotCoreDefinition(pivotId),
      sortedCol: { domain: colDomain, order, measure: pivotCell.measure },
    },
  });
}

function isPivotSortMenuItemActive(
  env: SpreadsheetChildEnv,
  order: SortDirection | "none"
): boolean {
  const position = env.model.getters.getActivePosition();
  const pivotId = env.model.getters.getPivotIdFromPosition(position);
  const pivotCell = env.model.getters.getPivotCellFromPosition(position);
  if (pivotCell.type === "EMPTY" || pivotCell.type === "HEADER" || !pivotId) {
    return false;
  }
  const pivot = env.model.getters.getPivot(pivotId);
  const colDomain = domainToColRowDomain(pivot, pivotCell.domain).colDomain;
  const sortedCol = pivot.definition.sortedCol;

  if (order === "none") {
    return !sortedCol;
  }

  if (!sortedCol || sortedCol.order !== order) {
    return false;
  }
  return sortedCol.measure === pivotCell.measure && deepEquals(sortedCol.domain, colDomain);
}
