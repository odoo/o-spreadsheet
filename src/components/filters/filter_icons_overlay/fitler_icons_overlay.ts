import { Component } from "@odoo/owl";
import { FILTER_ICON_EDGE_LENGTH, FILTER_ICON_MARGIN } from "../../../constants";
import { CellPopover } from "../../../store/cell_popover";
import { Store } from "../../../store/dependency_container";
import { useStore } from "../../../store/store_hooks";
import { DOMCoordinates, HeaderIndex, Position, SpreadsheetChildEnv } from "../../../types";
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
  private cellPopover!: Store<CellPopover>;

  setup() {
    this.cellPopover = useStore(CellPopover);
  }

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
    const centeringOffset = Math.floor((rowDims.size - FILTER_ICON_EDGE_LENGTH) / 2);
    return {
      x: colDims.end - FILTER_ICON_EDGE_LENGTH + this.props.gridPosition.x - FILTER_ICON_MARGIN - 1, // -1 for cell border
      y: rowDims.end - FILTER_ICON_EDGE_LENGTH + this.props.gridPosition.y - centeringOffset,
    };
  }

  isFilterActive(position: Position): boolean {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.isFilterActive({ sheetId, ...position });
  }

  toggleFilterMenu({ col, row }: Position) {
    const activePopover = this.cellPopover.cellPersistentPopover;
    if (
      activePopover.isOpen &&
      activePopover.col === col &&
      activePopover.row === row &&
      activePopover.type === "FilterMenu"
    ) {
      this.cellPopover.close();
      return;
    }
    this.cellPopover.open({ col, row }, "FilterMenu");
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
