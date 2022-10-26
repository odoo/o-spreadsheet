import * as owl from "@odoo/owl";
import { FILTER_ICON_MARGIN, ICON_EDGE_LENGTH } from "../../../constants";
import { DOMCoordinates, HeaderIndex, Position, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { FilterIcon } from "../filter_icon/filter_icon";

const { Component } = owl;

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

    // TODO : change this offset when we support vertical cell align
    const centeringOffset = (rowDims.size - ICON_EDGE_LENGTH) / 2;
    return {
      x: colDims.end - ICON_EDGE_LENGTH + this.props.gridPosition.x - FILTER_ICON_MARGIN,
      y: rowDims.end - ICON_EDGE_LENGTH + this.props.gridPosition.y - centeringOffset,
    };
  }

  isFilterActive(position: Position): boolean {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.isFilterActive(sheetId, position.col, position.row);
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
