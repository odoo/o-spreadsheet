import {
  DEFAULT_VERTICAL_ALIGN,
  FILTERS_COLOR,
  GRID_ICON_EDGE_LENGTH,
  GRID_ICON_MARGIN,
  HEADER_HEIGHT,
  HEADER_WIDTH,
} from "../../constants";
import { Align, CellPosition, Rect, SpreadsheetChildEnv, VerticalAlign } from "../../types";
import { css, cssPropertiesToCss } from "../helpers";

import { Component } from "@odoo/owl";
import { positionToZone } from "../../helpers";
import { gridIconRegistry } from "./grid_icon_registry";

const CHECKBOX_WIDTH = 15;
const MARGIN = (GRID_ICON_EDGE_LENGTH - CHECKBOX_WIDTH) / 2;
const DV_LIST_ICON_WIDTH = 13;

css/* scss */ `
  .o-grid-cell-icon {
    width: ${GRID_ICON_EDGE_LENGTH}px;
    height: ${GRID_ICON_EDGE_LENGTH}px;

    .o-filter-icon {
      color: ${FILTERS_COLOR};
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${GRID_ICON_EDGE_LENGTH}px;
      height: ${GRID_ICON_EDGE_LENGTH}px;
    }
    .o-filter-icon:hover {
      background: ${FILTERS_COLOR};
      color: #fff;
    }

    .o-dv-checkbox {
      box-sizing: border-box !important;
      width: ${CHECKBOX_WIDTH}px;
      height: ${CHECKBOX_WIDTH}px;
      accent-color: #808080;
      margin: ${MARGIN}px;
    }

    .o-dv-list-icon {
      color: #808080;
      border-radius: 1px;
      height: ${GRID_ICON_EDGE_LENGTH}px;
      width: ${GRID_ICON_EDGE_LENGTH}px;

      &:hover {
        color: #ffffff;
        background-color: #808080;
      }

      svg {
        width: ${DV_LIST_ICON_WIDTH}px;
        height: ${DV_LIST_ICON_WIDTH}px;
      }
    }
  }
`;

interface Props {}

interface GridIcon {
  template: string;
  position: CellPosition;
  horizontalAlign?: Align;
  verticalAlign?: VerticalAlign;
  ctx?: { [key: string]: any };
}

export class GridIconOverlay extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridIconOverlay";
  static props = {};
  static components = {};

  get icons(): GridIcon[] {
    const visibleCols = this.env.model.getters.getSheetViewVisibleCols();
    const visibleRows = this.env.model.getters.getSheetViewVisibleRows();
    const sheetId = this.env.model.getters.getActiveSheetId();

    const matchers = gridIconRegistry.getAll();
    const icons: GridIcon[] = [];
    for (const col of visibleCols) {
      for (const row of visibleRows) {
        const position = { sheetId, col, row };
        const mainPosition = this.env.model.getters.getMainCellPosition(position);
        if (mainPosition.row !== row || mainPosition.col !== col) {
          continue;
        }
        for (const matcher of matchers) {
          if (matcher.match(this.env, position)) {
            const ctx = matcher.ctx(this.env, position);
            icons.push({
              template: matcher.template,
              position,
              ctx,
              horizontalAlign: matcher.horizontalAlign,
              verticalAlign: matcher.verticalAlign,
            });
            break;
          }
        }
      }
    }
    return icons;
  }

  getIconStyle(icon: GridIcon): string {
    const cellPosition = icon.position;
    const merge = this.env.model.getters.getMerge(cellPosition);
    const zone = merge || positionToZone(cellPosition);
    const rect = this.env.model.getters.getVisibleRect(zone);
    const x = this.getIconHorizontalPosition(rect, cellPosition, icon.horizontalAlign);
    const y = this.getIconVerticalPosition(rect, cellPosition, icon.verticalAlign);
    return cssPropertiesToCss({
      top: `${y - HEADER_HEIGHT}px`, // ADRM TODO: doesn't work in dashboard. Create a getter getVisibleRectWithoutHeaders or something.
      left: `${x - HEADER_WIDTH}px`,
    });
  }

  private getIconVerticalPosition(
    rect: Rect,
    cellPosition: CellPosition,
    verticalAlign: VerticalAlign
  ): number {
    const start = rect.y;
    const end = rect.y + rect.height;

    const cell = this.env.model.getters.getCell(cellPosition);
    const align = verticalAlign || cell?.style?.verticalAlign || DEFAULT_VERTICAL_ALIGN;

    switch (align) {
      case "bottom":
        return end - GRID_ICON_MARGIN - GRID_ICON_EDGE_LENGTH;
      case "top":
        return start + GRID_ICON_MARGIN;
      default:
        const centeringOffset = Math.floor((end - start - GRID_ICON_EDGE_LENGTH) / 2);
        return end - GRID_ICON_EDGE_LENGTH - centeringOffset;
    }
  }

  private getIconHorizontalPosition(
    rect: Rect,
    cellPosition: CellPosition,
    horizontalAlign: Align
  ): number {
    const start = rect.x;
    const end = rect.x + rect.width;

    const cell = this.env.model.getters.getCell(cellPosition);
    const evaluatedCell = this.env.model.getters.getEvaluatedCell(cellPosition);
    const align = horizontalAlign || cell?.style?.align || evaluatedCell.defaultAlign;

    switch (align) {
      case "right":
        return end - GRID_ICON_MARGIN - GRID_ICON_EDGE_LENGTH;
      case "left":
        return start + GRID_ICON_MARGIN;
      default:
        const centeringOffset = Math.floor((end - start - GRID_ICON_EDGE_LENGTH) / 2);
        return end - GRID_ICON_EDGE_LENGTH - centeringOffset;
    }
  }

  isPositionVisible(position: CellPosition): boolean {
    const rect = this.env.model.getters.getVisibleRect(positionToZone(position));
    return !(rect.width === 0 || rect.height === 0);
  }
}
