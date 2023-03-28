import { Component } from "@odoo/owl";
import { FILTER_ICON_EDGE_LENGTH, FILTER_ICON_MARGIN } from "../../../constants";
import { Cell, DOMCoordinates, HeaderIndex, Position, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { FilterIcon } from "../filter_icon/filter_icon";

const CSS = css/* scss */ ``;

interface Props {
  gridPosition: DOMCoordinates;
}

export class FilterIconsOverlay extends Component<Props, SpreadsheetChildEnv> {
  static style = CSS;
  static template = "o-spreadsheet-FilterIconsOverlay";
  static components = {
    FilterIcon,
  };
  static defaultProps = {
    gridPosition: { x: 0, y: 0 },
  };

  getVisibleFilterHeaders(): Position[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const headerPositions = this.env.model.getters.getFilterHeaders(sheetId);
    return headerPositions.filter((position) => this.isPositionVisible(position.col, position.row));
  }

  getFilterHeaderPosition(position: Position): DOMCoordinates {
    const sheetId = this.env.model.getters.getActiveSheetId();

    const rowDims = this.env.model.getters.getRowDimensionsInViewport(sheetId, position.row);
    const colDims = this.env.model.getters.getColDimensionsInViewport(sheetId, position.col);
    const cell = this.env.model.getters.getCell({ sheetId, ...position });
    const verticalFilterIconPosition = this.getIconVerticalPosition(rowDims, cell!);

    return {
      x: colDims.end - FILTER_ICON_EDGE_LENGTH + this.props.gridPosition.x - FILTER_ICON_MARGIN - 1, // -1 for cell border
      y: verticalFilterIconPosition + this.props.gridPosition.y,
    };
  }

  // Calculates the vertical position of the filter icon based on the row dimensions and cell styles.
  private getIconVerticalPosition(
    rowDims: { start: number; end: number; size: number },
    cell: Cell
  ): number {
    const centeringOffset = Math.floor((rowDims.size - FILTER_ICON_EDGE_LENGTH) / 2);

    switch (cell?.style?.verticalAlign) {
      case "bottom":
        return rowDims.end - FILTER_ICON_MARGIN - FILTER_ICON_EDGE_LENGTH;
      case "top":
        return rowDims.start + FILTER_ICON_MARGIN;
      default:
        return rowDims.end - FILTER_ICON_EDGE_LENGTH - centeringOffset;
    }
  }

  isFilterActive(position: Position): boolean {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.isFilterActive({ sheetId, ...position });
  }

  toggleFilterMenu(position: Position) {
    const activePopoverType = this.env.model.getters.getPersistentPopoverTypeAtPosition(position);
    if (activePopoverType && activePopoverType === "FilterMenu") {
      this.env.model.dispatch("CLOSE_CELL_POPOVER");
      return;
    }
    const { col, row } = position;
    this.env.model.dispatch("OPEN_CELL_POPOVER", {
      col,
      row,
      popoverType: "FilterMenu",
    });
  }

  private isPositionVisible(x: HeaderIndex, y: HeaderIndex) {
    const rect = this.env.model.getters.getVisibleRect({
      left: x,
      right: x,
      top: y,
      bottom: y,
    });
    return !(rect.width === 0 || rect.height === 0);
  }
}

FilterIconsOverlay.props = {
  gridPosition: { type: Object, optional: true },
};
