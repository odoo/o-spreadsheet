import { Component } from "@odoo/owl";
import { FILTERS_COLOR, GRID_ICON_EDGE_LENGTH } from "../../../constants";
import { Store } from "../../../store_engine/store";
import { useStore } from "../../../store_engine/store_hooks";
import { CellPosition, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { CellPopoverStore } from "../../popover";

const CSS = css/* scss */ `
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
`;

interface Props {
  cellPosition: CellPosition;
}
export class FilterIcon extends Component<Props, SpreadsheetChildEnv> {
  static style = CSS;
  static template = "o-spreadsheet-FilterIcon";
  protected cellPopovers!: Store<CellPopoverStore>;

  setup() {
    this.cellPopovers = useStore(CellPopoverStore);
  }

  onClick() {
    const position = this.props.cellPosition;
    const activePopover = this.cellPopovers.persistentCellPopover;
    const { col, row } = position;
    if (
      activePopover.isOpen &&
      activePopover.col === col &&
      activePopover.row === row &&
      activePopover.type === "FilterMenu"
    ) {
      this.cellPopovers.close();
      return;
    }
    this.cellPopovers.open({ col, row }, "FilterMenu");
  }

  get isFilterActive(): boolean {
    return this.env.model.getters.isFilterActive(this.props.cellPosition);
  }
}

FilterIcon.props = {
  cellPosition: Object,
};
