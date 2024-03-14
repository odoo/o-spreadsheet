import { Component } from "@odoo/owl";
import { FILTERS_COLOR, GRID_ICON_EDGE_LENGTH } from "../../../constants";
import { relativeLuminance } from "../../../helpers";
import { Store } from "../../../store_engine/store";
import { useStore } from "../../../store_engine/store_hooks";
import { CellPosition, SpreadsheetChildEnv } from "../../../types";
import { css } from "../../helpers/css";
import { CellPopoverStore } from "../../popover";

css/* scss */ `
  .o-filter-icon {
    color: ${FILTERS_COLOR};
    display: flex;
    align-items: center;
    justify-content: center;
    width: ${GRID_ICON_EDGE_LENGTH}px;
    height: ${GRID_ICON_EDGE_LENGTH}px;

    &:hover {
      background: ${FILTERS_COLOR};
      color: #ffffff;
    }

    &.o-high-contrast {
      color: #defade;
    }
    &.o-high-contrast:hover {
      color: ${FILTERS_COLOR};
      background: #ffffff;
    }
  }
  .o-filter-icon:hover {
    background: ${FILTERS_COLOR};
    color: #ffffff;
  }
`;

interface Props {
  cellPosition: CellPosition;
}
export class FilterIcon extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterIcon";
  static props = {
    cellPosition: Object,
  };
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

  get iconClass(): string {
    const cellStyle = this.env.model.getters.getCellComputedStyle(this.props.cellPosition);
    const luminance = relativeLuminance(cellStyle.fillColor || "#FFFFFF");
    return luminance < 0.45 ? "o-high-contrast" : "";
  }
}
