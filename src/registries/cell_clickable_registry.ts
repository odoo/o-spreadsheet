import { openLink } from "@odoo/o-spreadsheet-engine/helpers/links";
import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { ComponentConstructor } from "@odoo/owl";
import { ClickableCellSortIcon } from "../components/dashboard/clickable_cell_sort_icon/clickable_cell_sort_icon";
import { canSortPivot, sortPivot } from "../helpers/pivot/pivot_menu_items";
import { CellPosition, Getters, SortDirection } from "../types";

export interface CellClickableItem {
  condition: (position: CellPosition, getters: Getters) => boolean;
  execute: (position: CellPosition, env: SpreadsheetChildEnv, isMiddleClick?: boolean) => void;
  title?: string | ((position: CellPosition, getters: Getters) => string);
  sequence: number;
  component?: ComponentConstructor;
  componentProps?: (position: CellPosition, getters: Getters) => Record<string, unknown>;
}

export const clickableCellRegistry = new Registry<CellClickableItem>();

clickableCellRegistry.add("link", {
  condition: (position: CellPosition, getters: Getters) => {
    return !!getters.getEvaluatedCell(position).link;
  },
  execute: (position: CellPosition, env: SpreadsheetChildEnv, isMiddleClick?: boolean) =>
    openLink(env.model.getters.getEvaluatedCell(position).link!, env, isMiddleClick),
  title: (position, getters) => {
    const link = getters.getEvaluatedCell(position).link;
    if (!link) {
      return "";
    }
    if (link.isExternal) {
      return _t("Go to url: %(url)s", { url: link.url });
    } else {
      return _t("Go to %(label)s", { label: link.label });
    }
  },
  sequence: 5,
});

clickableCellRegistry.add("dashboard_pivot_sorting", {
  condition: (position: CellPosition, getters: Getters) => {
    if (!getters.isDashboard()) {
      return false;
    }
    const pivotCell = getters.getPivotCellFromPosition(position);
    return canSortPivot(getters, position) && pivotCell.type === "MEASURE_HEADER";
  },
  execute: (position: CellPosition, env: SpreadsheetChildEnv) => {
    sortPivot(env, position, getNextSortDirection(env.model.getters, position));
  },
  component: ClickableCellSortIcon,
  componentProps: (position: CellPosition, getters: Getters) => {
    return {
      position,
      sortDirection: getters.getPivotCellSortDirection(position),
    };
  },
  sequence: 2,
});

const NEXT_SORT_DIRECTION = {
  none: "asc",
  asc: "desc",
  desc: "none",
} as const;

function getNextSortDirection(getters: Getters, position: CellPosition): SortDirection | "none" {
  return NEXT_SORT_DIRECTION[getters.getPivotCellSortDirection(position) ?? "none"];
}
