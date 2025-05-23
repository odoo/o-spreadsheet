import { ComponentConstructor } from "@odoo/owl";
import { FilterIcon } from "../components/filters/filter_icon/filter_icon";
import {
  CARET_DOWN,
  CHECKBOX_CHECKED,
  CHECKBOX_UNCHECKED,
  CHECKBOX_UNCHECKED_HOVERED,
  HOVERED_CARET_DOWN,
  ICONS,
} from "../components/icons/icons";
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
  hoverSvg?: ImageSVG;
  priority: number;
  onClick?: (position: CellPosition, env: SpreadsheetChildEnv) => void;
  id?: string;
}

type ImageSvgCallback = (getters: Getters, position: CellPosition) => GridIcon | undefined;

/**
 * Registry to draw icons on cells
 */
export const iconsOnCellRegistry = new Registry<ImageSvgCallback>();

iconsOnCellRegistry.add("data_validation_checkbox", (getters, position) => {
  const hasIcon = getters.isCellValidCheckbox(position);
  if (hasIcon) {
    const value = !!getters.getEvaluatedCell(position).value;
    return {
      svg: value ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED,
      hoverSvg: value ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED_HOVERED,
      priority: 2,
      horizontalAlign: "center",
      size: GRID_ICON_EDGE_LENGTH,
      margin: GRID_ICON_MARGIN,
      position,
      id: "data_validation_checkbox",
      onClick: (position, env) => {
        const cell = env.model.getters.getCell(position);
        const isDisabled = env.model.getters.isReadonly() || !!cell?.isFormula;
        if (isDisabled) {
          return;
        }

        const cellContent = value ? "FALSE" : "TRUE";
        env.model.dispatch("UPDATE_CELL", { ...position, content: cellContent });
      },
    };
  }
  return undefined;
});

iconsOnCellRegistry.add("data_validation_list_icon", (getters, position) => {
  const hasIcon = !getters.isReadonly() && getters.cellHasListDataValidationIcon(position);
  if (hasIcon) {
    return {
      svg: CARET_DOWN,
      hoverSvg: HOVERED_CARET_DOWN,
      priority: 2,
      horizontalAlign: "right",
      size: GRID_ICON_EDGE_LENGTH,
      margin: GRID_ICON_MARGIN,
      position,
      onClick: (position, env) => {
        const { col, row } = position;
        env.model.selection.selectCell(col, row);
        env.startCellEdition();
      },
      id: "data_validation_list_icon",
    };
  }
  return undefined;
});

iconsOnCellRegistry.add("filter_icon", (getters, position) => {
  const hasIcon = getters.isFilterHeader(position);
  if (hasIcon) {
    return {
      id: "filter_icon",
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
