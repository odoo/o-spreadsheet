import { ActionSpec } from "../../actions/action";
import { ACTION_COLOR } from "../../constants";
import { domainToColRowDomain } from "../../helpers/pivot/pivot_domain_helpers";
import { canSortPivot, sortPivot } from "../../helpers/pivot/pivot_menu_items";
import { HighlightStore } from "../../stores/highlight_store";
import { _t } from "../../translation";
import { CellPosition, Getters, SpreadsheetChildEnv, Zone } from "../../types";
import { Registry } from "../registry";

interface DashboardActionSpec {
  name: ActionSpec["name"];
  icon: ActionSpec["icon"];
  iconColor?: ActionSpec["iconColor"];
  execute: (env: SpreadsheetChildEnv, position: CellPosition, isMiddleClick?: boolean) => void;
  isVisible?: (getters: Getters, position: CellPosition) => boolean;
  onStartHover?: (env: SpreadsheetChildEnv, position: CellPosition) => (() => void) | void;
}

export const dashboardGridMenuRegistry = new Registry<DashboardActionSpec>();

export function registerColumnHighlightProvider(
  env: SpreadsheetChildEnv,
  startingPosition: CellPosition,
  isHighlightable: (position: CellPosition) => boolean
) {
  const highlightProvider = {
    get highlights() {
      const zone = growColumnZone(startingPosition, isHighlightable);
      return [
        {
          zone,
          color: ACTION_COLOR,
          sheetId: startingPosition.sheetId,
        },
      ];
    },
  };
  env.getStore(HighlightStore).register(highlightProvider);
  // TODO make this return required! It's too easy to forget to unregister
  return () => {
    env.getStore(HighlightStore).unRegister(highlightProvider);
  };
}

function isPivotSortingVisible(getters: Getters, position: CellPosition) {
  return canSortPivot(getters, position) && getters.getEvaluatedCell(position).value !== "";
}

function growColumnZone(
  startingPosition: CellPosition,
  callback: (position: CellPosition) => boolean
): Zone {
  let bottom = startingPosition.row;
  let top = startingPosition.row;
  while (callback({ ...startingPosition, row: bottom + 1 })) {
    bottom++;
  }
  while (callback({ ...startingPosition, row: top - 1 })) {
    top--;
  }
  return {
    top: top,
    bottom: bottom,
    left: startingPosition.col,
    right: startingPosition.col,
  };
}

function registerPivotHighlightProvider(env: SpreadsheetChildEnv, startingPosition: CellPosition) {
  const pivotId = env.model.getters.getPivotIdFromPosition(startingPosition);
  if (!pivotId) {
    return;
  }
  const pivot = env.model.getters.getPivot(pivotId);
  return registerColumnHighlightProvider(env, startingPosition, (position) => {
    const pivotCell = env.model.getters.getPivotCellFromPosition(position);
    return (
      pivotCell.type === "VALUE" &&
      domainToColRowDomain(pivot, pivotCell.domain).rowDomain.length !== 0
    );
  });
}

dashboardGridMenuRegistry
  .add("sort_pivot_ascending", {
    name: _t("Sort ascending (0 ⟶ 100)"),
    icon: "o-spreadsheet-Icon.SORT_ASCENDING_NUMERIC",
    isVisible: isPivotSortingVisible,
    execute(env, position) {
      sortPivot(env, position, "asc");
    },
    onStartHover: registerPivotHighlightProvider,
  })
  .add("sort_pivot_descending", {
    name: _t("Sort descending (100 ⟶ 0)"),
    icon: "o-spreadsheet-Icon.SORT_DESCENDING_NUMERIC",
    isVisible: isPivotSortingVisible,
    execute(env, position) {
      sortPivot(env, position, "desc");
    },
    onStartHover: registerPivotHighlightProvider,
  });
