import {
  CHECKBOX_CHECKED,
  CHECKBOX_UNCHECKED,
  CHECKBOX_UNCHECKED_HOVERED,
  getCaretDownSvg,
  getCaretUpSvg,
  getChipSvg,
  getDataFilterIcon,
  getHoveredCaretDownSvg,
  getHoveredChipSvg,
  getPivotIconSvg,
  ICONS,
} from "../components/icons/icons";
import { CellPopoverStore } from "../components/popover";
import {
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
  MIN_CF_ICON_MARGIN,
  PIVOT_COLLAPSE_ICON_SIZE,
  PIVOT_INDENT,
} from "../constants";
import { computeTextFontSizeInPixels, deepEquals, relativeLuminance } from "../helpers";
import { togglePivotCollapse } from "../helpers/pivot/pivot_helpers";
import { Align, CellPosition, Getters, SpreadsheetChildEnv } from "../types";
import { ImageSVG } from "../types/image";
import { Registry } from "./registry";

export type IconsOfCell = Record<Exclude<Align, undefined>, GridIcon | undefined>;

export interface GridIcon {
  type: string;
  position: CellPosition;
  horizontalAlign: Exclude<Align, undefined>;
  size: number;
  margin: number;
  svg?: ImageSVG;
  hoverSvg?: ImageSVG;
  priority: number;
  onClick?: (position: CellPosition, env: SpreadsheetChildEnv) => void;
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
      type: "data_validation_checkbox",
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

iconsOnCellRegistry.add("data_validation_chip_icon", (getters, position) => {
  const chipStyle = getters.getDataValidationChipStyle(position);
  if (chipStyle) {
    const cellStyle = getters.getCellComputedStyle(position);
    return {
      svg: getChipSvg(chipStyle),
      hoverSvg: getHoveredChipSvg(chipStyle),
      priority: 10,
      horizontalAlign: "right",
      size: computeTextFontSizeInPixels(cellStyle),
      margin: 4,
      position,
      onClick: (position, env) => {
        const { col, row } = position;
        env.model.selection.selectCell(col, row);
        env.startCellEdition();
      },
      type: "data_validation_chip_icon",
    };
  }
  return undefined;
});

iconsOnCellRegistry.add("data_validation_list_icon", (getters, position) => {
  const hasIcon = !getters.isReadonly() && getters.cellHasListDataValidationIcon(position);
  if (hasIcon) {
    const cellStyle = getters.getCellComputedStyle(position);
    return {
      svg: getCaretDownSvg(cellStyle),
      hoverSvg: getHoveredCaretDownSvg(cellStyle),
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
      type: "data_validation_list_icon",
    };
  }
  return undefined;
});

iconsOnCellRegistry.add("filter_icon", (getters, position) => {
  const hasIcon = getters.isFilterHeader(position);
  if (hasIcon) {
    const isFilterActive = getters.isFilterActive(position);
    const cellStyle = getters.getCellComputedStyle(position);
    const isHighContrast = relativeLuminance(cellStyle.fillColor || "#fff") < 0.45;
    return {
      type: "filter_icon",
      svg: getDataFilterIcon(isFilterActive, isHighContrast, false),
      hoverSvg: getDataFilterIcon(isFilterActive, isHighContrast, true),
      priority: 3,
      horizontalAlign: "right",
      size: GRID_ICON_EDGE_LENGTH,
      margin: GRID_ICON_MARGIN,
      position,
      onClick: (position, env) => {
        const cellPopovers = env.getStore(CellPopoverStore);
        const activePopover = cellPopovers.persistentCellPopover;
        if (
          activePopover.isOpen &&
          activePopover.col === position.col &&
          activePopover.row === position.row &&
          activePopover.type === "FilterMenu"
        ) {
          cellPopovers.close();
          return;
        }
        cellPopovers.open(position, "FilterMenu");
      },
    };
  }
  return undefined;
});

iconsOnCellRegistry.add("conditional_formatting", (getters, position) => {
  const icon = getters.getConditionalIcon(position);
  if (icon) {
    const style = getters.getCellStyle(position);
    return {
      type: "conditional_formatting",
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
    const hasIcon = !isDashboard && pivotCell.domain.length !== fields.length;

    const domains = definition.collapsedDomains?.[pivotCell.dimension] ?? [];
    const isCollapsed = domains.some((domain) => deepEquals(domain, pivotCell.domain));

    const indent = pivotCell.dimension === "ROW" ? (pivotCell.domain.length - 1) * PIVOT_INDENT : 0;
    return {
      type: "pivot_collapse",
      priority: 4,
      horizontalAlign: "left",
      size:
        hasIcon || (!isDashboard && pivotCell.dimension === "ROW" && definition.rows.length > 1)
          ? PIVOT_COLLAPSE_ICON_SIZE
          : 0,
      margin: hasIcon ? GRID_ICON_MARGIN * 2 + indent : indent,
      svg: hasIcon ? getPivotIconSvg(isCollapsed, false) : undefined,
      hoverSvg: hasIcon ? getPivotIconSvg(isCollapsed, true) : undefined,
      position,
      onClick: togglePivotCollapse,
    };
  }
  return undefined;
});

iconsOnCellRegistry.add("pivot_dashboard_sorting", (getters, position) => {
  if (!getters.isDashboard()) {
    return undefined;
  }
  const pivotCell = getters.getPivotCellFromPosition(position);
  if (pivotCell.type !== "MEASURE_HEADER") {
    return undefined;
  }
  const sortDirection = getters.getPivotCellSortDirection(position);
  if (sortDirection !== "asc" && sortDirection !== "desc") {
    return undefined;
  }
  const cellStyle = getters.getCellComputedStyle(position);
  return {
    type: `pivot_dashboard_sorting_${sortDirection}`,
    priority: 5,
    horizontalAlign: "right",
    size: GRID_ICON_EDGE_LENGTH,
    margin: GRID_ICON_MARGIN,
    svg: sortDirection === "asc" ? getCaretUpSvg(cellStyle) : getCaretDownSvg(cellStyle),
    position,
    onClick: undefined, // click is managed by ClickableCellSortIcon
  };
});
