import {
  CellPosition,
  FunctionResultObject,
  Getters,
  SortDirection,
  SpreadsheetChildEnv,
} from "../..";
import { ActionSpec } from "../../actions/action";
import { _t } from "../../translation";
import { CellValueType } from "../../types";
import { deepEquals } from "../misc";
import { domainToColRowDomain } from "./pivot_domain_helpers";

export const pivotProperties: ActionSpec = {
  name: _t("See pivot properties"),
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
  isReadonlyAllowed: true,
  icon: "o-spreadsheet-Icon.PIVOT",
};

export const pivotSortingAsc: ActionSpec = {
  name: _t("Ascending"),
  execute: (env) => sortPivot(env, env.model.getters.getActivePosition(), "asc"),
  isActive: (env) =>
    isPivotSortMenuItemActive(env.model.getters, env.model.getters.getActivePosition(), "asc"),
};

export const pivotSortingDesc: ActionSpec = {
  name: _t("Descending"),
  execute: (env) => sortPivot(env, env.model.getters.getActivePosition(), "desc"),
  isActive: (env) =>
    isPivotSortMenuItemActive(env.model.getters, env.model.getters.getActivePosition(), "desc"),
};

export const noPivotSorting: ActionSpec = {
  name: _t("No sorting"),
  execute: (env) => sortPivot(env, env.model.getters.getActivePosition(), "none"),
  isActive: (env) =>
    isPivotSortMenuItemActive(env.model.getters, env.model.getters.getActivePosition(), "none"),
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

export function canSortPivot(getters: Getters, position: CellPosition): boolean {
  const pivotId = getters.getPivotIdFromPosition(position);
  if (!pivotId || !getters.isExistingPivot(pivotId)) {
    return false;
  }
  const pivot = getters.getPivot(pivotId);
  if (!pivot.isValid()) {
    return false;
  }
  const pivotCell = getters.getPivotCellFromPosition(position);
  if (getters.isSpillPivotFormula(position)) {
    return pivotCell.type === "VALUE" || pivotCell.type === "MEASURE_HEADER";
  }
  const cell = getters.getCell(position);
  if (cell?.isFormula) {
    const result = getters.getFirstPivotFunction(position.sheetId, cell.compiledFormula.tokens);
    if (result?.functionName === "PIVOT.VALUE") {
      return pivot.canBeSorted(
        result.args.slice(2).map((value) => ({ value } as FunctionResultObject))
      );
    }
  }
  return false;
}

export function canSortPivotHeader(getters: Getters, position: CellPosition): boolean {
  const pivotId = getters.getPivotIdFromPosition(position);
  if (!pivotId || !getters.isExistingPivot(pivotId)) {
    return false;
  }
  const pivot = getters.getPivot(pivotId);
  if (!pivot.isValid()) {
    return false;
  }
  const pivotCell = getters.getPivotCellFromPosition(position);
  if (getters.isSpillPivotFormula(position)) {
    return pivotCell.type === "HEADER" && pivotCell.domain.length > 0;
  }
  const cell = getters.getCell(position);
  if (cell?.isFormula) {
    const result = getters.getFirstPivotFunction(position.sheetId, cell.compiledFormula.tokens);
    if (result?.functionName === "PIVOT.HEADER") {
      return pivot.canBeSorted(
        result.args.slice(1).map((value) => ({ value } as FunctionResultObject))
      );
    }
  }
  return false;
}

export function sortPivot(
  env: SpreadsheetChildEnv,
  position: CellPosition,
  order: SortDirection | "none"
) {
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
        sortedColumn: undefined,
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
      sortedColumn: { domain: colDomain, order, measure: pivotCell.measure },
    },
  });
}

export function sortPivotHeader(
  env: SpreadsheetChildEnv,
  position: CellPosition,
  order: SortDirection | undefined
) {
  const pivotCell = env.model.getters.getPivotCellFromPosition(position);
  const pivotId = env.model.getters.getPivotIdFromPosition(position);
  if (pivotCell.type !== "HEADER" || !pivotId) {
    return;
  }
  const definition = env.model.getters.getPivot(pivotId).definition;
  const sortedDimension = pivotCell.domain.at(-1);
  const { rows, columns } = definition;
  env.model.dispatch("UPDATE_PIVOT", {
    pivotId,
    pivot: {
      ...env.model.getters.getPivotCoreDefinition(pivotId),
      sortedColumn: undefined,
      rows: rows.map((row) => {
        if (row.nameWithGranularity === sortedDimension?.field) {
          return { fieldName: row.fieldName, granularity: row.granularity, order };
        }
        return { fieldName: row.fieldName, granularity: row.granularity, order: row.order };
      }),
      columns: columns.map((col) => {
        if (col.nameWithGranularity === sortedDimension?.field) {
          return { fieldName: col.fieldName, granularity: col.granularity, order };
        }
        return { fieldName: col.fieldName, granularity: col.granularity, order: col.order };
      }),
    },
  });
}

export function isPivotSortMenuItemActive(
  getters: Getters,
  position: CellPosition,
  order: SortDirection | "none"
): boolean {
  const pivotId = getters.getPivotIdFromPosition(position);
  const pivotCell = getters.getPivotCellFromPosition(position);
  if (pivotCell.type === "EMPTY" || pivotCell.type === "HEADER" || !pivotId) {
    return false;
  }
  const pivot = getters.getPivot(pivotId);
  const colDomain = domainToColRowDomain(pivot, pivotCell.domain).colDomain;
  const sortedColumn = pivot.definition.sortedColumn;

  if (order === "none") {
    return !sortedColumn;
  }

  if (!sortedColumn || sortedColumn.order !== order) {
    return false;
  }
  return sortedColumn.measure === pivotCell.measure && deepEquals(sortedColumn.domain, colDomain);
}

export function isPivotHeaderSortMenuItemActive(
  getters: Getters,
  position: CellPosition,
  order: SortDirection | "none"
): boolean {
  const pivotId = getters.getPivotIdFromPosition(position);
  const pivotCell = getters.getPivotCellFromPosition(position);
  if (pivotCell.type !== "HEADER" || !pivotId) {
    return false;
  }
  const pivot = getters.getPivot(pivotId);
  const rowDimension = pivot.definition.rows.find(
    (row) => row.nameWithGranularity === pivotCell.domain.at(-1)?.field
  );
  const columnDimension = pivot.definition.columns.find(
    (col) => col.nameWithGranularity === pivotCell.domain.at(-1)?.field
  );
  return rowDimension?.order === order || columnDimension?.order === order;
}
