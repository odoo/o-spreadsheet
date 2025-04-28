import { ComponentConstructor } from "@odoo/owl";
import { DataValidationCheckbox } from "../components/data_validation_overlay/dv_checkbox/dv_checkbox";
import { DataValidationListIcon } from "../components/data_validation_overlay/dv_list_icon/dv_list_icon";
import { FilterIcon } from "../components/filters/filter_icon/filter_icon";
import { ICONS } from "../components/icons/icons";
import { PivotCollapseIcon } from "../components/pivot_collapse_icon/pivot_collapse_icon";
import {
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
  MIN_CF_ICON_MARGIN,
  PIVOT_INDENT,
} from "../constants";
import { computeTextFontSizeInPixels } from "../helpers";
import { Align, CellPosition, Getters, SpreadsheetChildEnv } from "../types";
import { ImageSVG } from "../types/image";
import { Registry } from "./registry";

export type IconsOfCell = Record<Exclude<Align, undefined>, GridIcon | undefined>;

export interface GridIcon {
  position: CellPosition;
  horizontalAlign: Exclude<Align, undefined>;
  size: number;
  margin: number;
  component?: ComponentConstructor<{ cellPosition: CellPosition }, SpreadsheetChildEnv>;
  svg?: ImageSVG;
  priority: number;
}

type ImageSvgCallback = (getters: Getters, position: CellPosition) => GridIcon | undefined;

/**
 * Registry to draw icons on cells
 */
export const iconsOnCellRegistry = new Registry<ImageSvgCallback>();

iconsOnCellRegistry.add("data_validation_checkbox", (getters, position) => {
  const hasIcon = getters.isCellValidCheckbox(position);
  if (hasIcon) {
    return {
      svg: undefined,
      priority: 2,
      horizontalAlign: "center",
      size: GRID_ICON_EDGE_LENGTH,
      margin: GRID_ICON_MARGIN,
      component: DataValidationCheckbox,
      position,
    };
  }
  return undefined;
});

iconsOnCellRegistry.add("data_validation_list_icon", (getters, position) => {
  const hasIcon = !getters.isReadonly() && getters.cellHasListDataValidationIcon(position);
  if (hasIcon) {
    return {
      svg: undefined,
      priority: 2,
      horizontalAlign: "right",
      size: GRID_ICON_EDGE_LENGTH,
      margin: GRID_ICON_MARGIN,
      component: DataValidationListIcon,
      position,
    };
  }
  return undefined;
});

iconsOnCellRegistry.add("filter_icon", (getters, position) => {
  const hasIcon = getters.isFilterHeader(position);
  if (hasIcon) {
    return {
      svg: undefined,
      priority: 3,
      horizontalAlign: "right",
      size: GRID_ICON_EDGE_LENGTH,
      margin: GRID_ICON_MARGIN,
      component: FilterIcon,
      position,
    };
  }
  return undefined;
});

iconsOnCellRegistry.add("conditional_formatting", (getters, position) => {
  const icon = getters.getConditionalIcon(position);
  if (icon) {
    const style = getters.getCellStyle(position);
    return {
      svg: ICONS[icon].svg,
      priority: 1,
      horizontalAlign: "left",
      size: computeTextFontSizeInPixels(style),
      margin: MIN_CF_ICON_MARGIN,
      position,
    };
  }
  return undefined;
});

iconsOnCellRegistry.add("pivot_collapse", (getters, position) => {
  if (!getters.isSpillPivotFormula(position)) {
    return undefined;
  }
  const pivotCell = getters.getPivotCellFromPosition(position);
  const pivotId = getters.getPivotIdFromPosition(position);

  if (pivotCell.type === "HEADER" && pivotId && pivotCell.domain.length) {
    const definition = getters.getPivotCoreDefinition(pivotId);
    const isDashboard = getters.isDashboard();

    const fields = pivotCell.dimension === "COL" ? definition.columns : definition.rows;
    const component =
      !isDashboard && pivotCell.domain.length !== fields.length ? PivotCollapseIcon : undefined;
    return {
      priority: 4,
      horizontalAlign: "left",
      size:
        !!component || (!isDashboard && pivotCell.dimension === "ROW" && definition.rows.length > 1)
          ? GRID_ICON_EDGE_LENGTH
          : 0,
      margin: pivotCell.dimension === "ROW" ? (pivotCell.domain.length - 1) * PIVOT_INDENT : 0,
      component,
      position,
    };
  }
  return undefined;
});
