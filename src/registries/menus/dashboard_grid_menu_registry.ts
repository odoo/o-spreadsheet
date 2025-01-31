import { ActionSpec, createActions } from "../../actions/action";
import { ACTION_COLOR } from "../../constants";
import { deepEquals, mergeContiguousZones, positionToZone } from "../../helpers";
import { domainToColRowDomain } from "../../helpers/pivot/pivot_domain_helpers";
import { getVisiblePivotCellPositions } from "../../helpers/pivot/pivot_highlight";
import {
  canSortPivot,
  canSortPivotHeader,
  isPivotHeaderSortMenuItemActive,
  isPivotSortMenuItemActive,
  sortPivot,
  sortPivotHeader,
} from "../../helpers/pivot/pivot_menu_items";
import { highlightOnMenuHover } from "../../stores/highlight_store";
import { _t } from "../../translation";
import { CellPosition, Color, Getters, SpreadsheetChildEnv } from "../../types";
import { Registry } from "../registry";

interface DashboardActionSpec {
  id?: ActionSpec["id"];
  name: ActionSpec["name"];
  icon: ActionSpec["icon"];
  iconColor?: (env: SpreadsheetChildEnv, position: CellPosition) => Color;
  execute: (env: SpreadsheetChildEnv, position: CellPosition, isMiddleClick?: boolean) => void;
  isVisible?: (getters: Getters, position: CellPosition) => boolean;
  onStartHover?: (env: SpreadsheetChildEnv, position: CellPosition) => (() => void) | void;
}

export const dashboardGridMenuRegistry = new Registry<DashboardActionSpec>();

export function createDashboardActions(specs: DashboardActionSpec[], position: CellPosition) {
  const actionSpecs = specs.map((action) => ({
    ...action,
    iconColor: (env: SpreadsheetChildEnv) => action.iconColor?.(env, position) ?? "",
    isVisible: (env: SpreadsheetChildEnv) =>
      action.isVisible?.(env.model.getters, position) ?? true,
    execute: (env: SpreadsheetChildEnv, isMiddleClick) =>
      action.execute(env, position, isMiddleClick),
    onStartHover: (env: SpreadsheetChildEnv) => action.onStartHover?.(env, position),
    isReadonlyAllowed: true,
  }));
  return createActions(actionSpecs);
}

function isPivotSortingVisible(getters: Getters, position: CellPosition) {
  return canSortPivot(getters, position) && getters.getEvaluatedCell(position).value !== "";
}

function getPivotHighlights(env: SpreadsheetChildEnv, position: CellPosition) {
  const pivotId = env.model.getters.getPivotIdFromPosition(position);
  if (!pivotId) {
    return [];
  }
  const pivot = env.model.getters.getPivot(pivotId);
  const pivotCell = env.model.getters.getPivotCellFromPosition(position);
  if (pivotCell.type !== "MEASURE_HEADER" && pivotCell.type !== "VALUE") {
    return [];
  }
  const measure = pivotCell.measure;
  const { colDomain: colDomainToMatch } = domainToColRowDomain(pivot, pivotCell.domain);
  const positions = getVisiblePivotCellPositions(env.model.getters, pivotId).filter((position) => {
    const pivotCell = env.model.getters.getPivotCellFromPosition(position);
    if (pivotCell.type !== "VALUE" || !canSortPivot(env.model.getters, position)) {
      return false;
    }
    const { colDomain, rowDomain } = domainToColRowDomain(pivot, pivotCell.domain);
    return (
      deepEquals(colDomain, colDomainToMatch) && rowDomain.length && pivotCell.measure === measure
    );
  });
  const zones = mergeContiguousZones(positions.map(positionToZone));
  return zones.map((zone) => ({
    zone,
    color: ACTION_COLOR,
    sheetId: position.sheetId,
  }));
}

function getPivotHeaderHighlights(env: SpreadsheetChildEnv, startingPosition: CellPosition) {
  const pivotId = env.model.getters.getPivotIdFromPosition(startingPosition);
  if (!pivotId) {
    return [];
  }
  const pivot = env.model.getters.getPivot(pivotId);
  const pivotCell = env.model.getters.getPivotCellFromPosition(startingPosition);
  if (pivotCell.type !== "HEADER") {
    return [];
  }
  const { colDomain: colDomainToMatch, rowDomain: rowDomainToMatch } = domainToColRowDomain(
    pivot,
    pivotCell.domain
  );
  const positions = getVisiblePivotCellPositions(env.model.getters, pivotId).filter((position) => {
    const pivotCell = env.model.getters.getPivotCellFromPosition(position);
    if (pivotCell.type !== "HEADER" || !canSortPivotHeader(env.model.getters, position)) {
      return false;
    }
    const { rowDomain, colDomain } = domainToColRowDomain(pivot, pivotCell.domain);
    return (
      rowDomain.length === rowDomainToMatch.length && colDomainToMatch.length === colDomain.length
    );
  });
  const zones = mergeContiguousZones(positions.map(positionToZone));
  return zones.map((zone) => ({
    zone,
    color: ACTION_COLOR,
    sheetId: startingPosition.sheetId,
  }));
}

dashboardGridMenuRegistry
  .add("sort_pivot_ascending", {
    id: "sort_pivot_ascending",
    name: _t("Sort ascending (0 ⟶ 100)"),
    icon: "o-spreadsheet-Icon.SORT_ASCENDING_NUMERIC",
    iconColor: (env, position) =>
      isPivotSortMenuItemActive(env.model.getters, position, "asc") ? ACTION_COLOR : "",
    isVisible: isPivotSortingVisible,
    execute(env, position) {
      sortPivot(env, position, "asc");
    },
    onStartHover: (env, position) => {
      const highlights = getPivotHighlights(env, position);
      return highlightOnMenuHover(env, { highlights });
    },
  })
  .add("sort_pivot_descending", {
    id: "sort_pivot_descending",
    name: _t("Sort descending (100 ⟶ 0)"),
    icon: "o-spreadsheet-Icon.SORT_DESCENDING_NUMERIC",
    iconColor: (env, position) =>
      isPivotSortMenuItemActive(env.model.getters, position, "desc") ? ACTION_COLOR : "",
    isVisible: isPivotSortingVisible,
    execute(env, position) {
      sortPivot(env, position, "desc");
    },
    onStartHover: (env, position) => {
      const highlights = getPivotHighlights(env, position);
      return highlightOnMenuHover(env, { highlights });
    },
  })
  .add("sort_pivot_header_ascending", {
    id: "sort_pivot_header_ascending",
    name: _t("Sort ascending (A ⟶ Z)"),
    icon: "o-spreadsheet-Icon.SORT_ASCENDING",
    iconColor: (env, position) =>
      isPivotHeaderSortMenuItemActive(env.model.getters, position, "asc") ? ACTION_COLOR : "",
    isVisible: canSortPivotHeader,
    execute(env, position) {
      sortPivotHeader(env, position, "asc");
    },
    onStartHover: (env, position) => {
      const highlights = getPivotHeaderHighlights(env, position);
      return highlightOnMenuHover(env, { highlights });
    },
  })
  .add("sort_pivot_header_descending", {
    id: "sort_pivot_header_descending",
    name: _t("Sort descending (Z ⟶ A)"),
    icon: "o-spreadsheet-Icon.SORT_DESCENDING",
    iconColor: (env, position) =>
      isPivotHeaderSortMenuItemActive(env.model.getters, position, "desc") ? ACTION_COLOR : "",
    isVisible: canSortPivotHeader,
    execute(env, position) {
      sortPivotHeader(env, position, "desc");
    },
    onStartHover: (env, position) => {
      const highlights = getPivotHeaderHighlights(env, position);
      return highlightOnMenuHover(env, { highlights });
    },
  });
