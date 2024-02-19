import { Component } from "@odoo/owl";
import { CellPosition, SpreadsheetChildEnv } from "../../../types";
import { GridCellIcon } from "../../grid_cell_icon/grid_cell_icon";
import { FilterIcon } from "../filter_icon/filter_icon";

interface Props {
  onMouseDown: (ev: MouseEvent, closePopover: boolean) => void;
}

export class FilterIconsOverlay extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterIconsOverlay";
  static props = {
    onMouseDown: Function,
  };
  static components = {
    GridCellIcon,
    FilterIcon,
  };

  getFilterHeadersPositions(): CellPosition[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const headerPositions = this.env.model.getters.getFilterHeaders(sheetId);
    return headerPositions.map((position) => ({ sheetId, ...position }));
  }

  onMouseDown(ev: MouseEvent) {
    this.props.onMouseDown(ev, false); // don't close popover on icon click
  }
}
