import { PivotDomain, SortDirection, SpreadsheetChildEnv, Zone } from "../..";
import { ActionSpec } from "../../actions/action";
import { _t } from "../../translation";
import { CellValueType } from "../../types";
import { deepEquals, isDefined } from "../misc";
import { cellPositions } from "../zones";
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
    return (!env.isSmall && pivotId && env.model.getters.isExistingPivot(pivotId)) || false;
  },
  isReadonlyAllowed: true,
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

export const groupPivotHeaders: ActionSpec = {
  name: _t("Create pivot group"),
  execute: (env) => {
    const selection = env.model.getters.getSelectedZones();
    const { pivotId, headers } = getMatchingPivotHeadersInZones(env, selection);
    console.log("Group pivot headers", pivotId, headers);
  },
  isVisible: (env) => true, /// ADRM TODO: mix of multiple pivots, no pivot header cell
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
  const sortedColumn = pivot.definition.sortedColumn;

  if (order === "none") {
    return !sortedColumn;
  }

  if (!sortedColumn || sortedColumn.order !== order) {
    return false;
  }
  return sortedColumn.measure === pivotCell.measure && deepEquals(sortedColumn.domain, colDomain);
}

function getMatchingPivotHeadersInZones(env: SpreadsheetChildEnv, zones: Zone[]) {
  let pivotId: string | undefined;
  let domain: PivotDomain | undefined;
  const pivotHeaders = zones.map((zone) => {
    const sheetId = env.model.getters.getActiveSheetId();
    return cellPositions(sheetId, zone)
      .map((position) => {
        const cellPivotId = env.model.getters.getPivotIdFromPosition(position);
        if (!pivotId) {
          pivotId = cellPivotId; // ADRM TODO: handle mix of multiple pivots
        }
        if (!pivotId) {
          return undefined;
        }
        const pivotCell = env.model.getters.getPivotCellFromPosition(position);
        if (pivotCell.type !== "HEADER") {
          return undefined;
        }
        const rootDomain = pivotCell.domain.slice(0, pivotCell.domain.length - 1);
        if (!domain) {
          domain = rootDomain;
        } else if (!deepEquals(domain, rootDomain)) {
          return undefined; // ADRM TODO: discuss & test mix of multiple domains. Use first domain cell ? Prevent grouping ?
        }
        return pivotCell.type === "HEADER" ? pivotCell : undefined;
      })
      .filter(isDefined);
  });
  return { pivotId, headers: pivotHeaders.flat(), domain };
}
