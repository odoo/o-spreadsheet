import { Component, useRef } from "@odoo/owl";
import { CellPosition, Highlight, Ref, SpreadsheetChildEnv } from "../..";
import { ACTION_COLOR, BUTTON_ACTIVE_BG } from "../../constants";
import { domainToColRowDomain } from "../../helpers/pivot/pivot_domain_helpers";
import {
  canSortPivot,
  isPivotSortMenuItemActive,
  sortPivot,
} from "../../helpers/pivot/pivot_menu_items";
import { CellPopoverComponent, PopoverBuilders } from "../../types/cell_popovers";
import { css } from "../helpers/css";
import { useHighlightsOnHover } from "../helpers/highlight_hook";

css/* scss */ `
  .o-pivot-sorting-expandable {
    opacity: 0;
    height: 0px;
    width: 0px;
    overflow: hidden;
    .active {
      color: ${ACTION_COLOR};
    }
  }

  .o-pivot-sorting-expandable > div:hover {
    background-color: ${BUTTON_ACTIVE_BG};
  }

  .o-pivot-sorting:hover .o-pivot-sorting-header {
    display: none;
  }

  .o-pivot-sorting:hover .o-pivot-sorting-expandable {
    opacity: 1;
    height: auto;
    width: auto;
  }
`;

interface Props {
  position: CellPosition;
  hoveredCellPosition: CellPosition;
}

export class PivotSortingToolTip extends Component<Props, SpreadsheetChildEnv> {
  static maxSize = { maxHeight: 200 };
  static template = "o-spreadsheet-PivotSortingToolTip";
  static props = {
    position: Object,
    hoveredCellPosition: Object,
    onClosed: { type: Function, optional: true },
  };

  private ref: Ref<HTMLElement> = useRef("ref");

  setup(): void {
    useHighlightsOnHover(this.ref, this);
  }

  get isSortedAsc() {
    return isPivotSortMenuItemActive(this.env.model.getters, this.props.hoveredCellPosition, "asc");
  }

  get isSortedDesc() {
    return isPivotSortMenuItemActive(
      this.env.model.getters,
      this.props.hoveredCellPosition,
      "desc"
    );
  }

  get highlights(): Highlight[] {
    return [
      {
        zone: this.getColumnZone(),
        color: ACTION_COLOR,
        sheetId: this.props.position.sheetId,
      },
    ];
  }

  sortAscending() {
    sortPivot(this.env, this.props.hoveredCellPosition, "asc");
  }

  sortDescending() {
    sortPivot(this.env, this.props.hoveredCellPosition, "desc");
  }

  private getColumnZone() {
    // This component is supposed to be anchored to a cell just above
    // some pivot value cells. We want to highlight those cells.
    let bottom = this.props.position.row + 1;
    let pivotCell = this.env.model.getters.getPivotCellFromPosition({
      ...this.props.position,
      row: bottom + 1,
    });
    const pivotId = this.env.model.getters.getPivotIdFromPosition(this.props.position);
    if (pivotId) {
      const pivot = this.env.model.getters.getPivot(pivotId);
      while (
        pivotCell.type === "VALUE" &&
        domainToColRowDomain(pivot, pivotCell.domain).rowDomain.length
      ) {
        pivotCell = this.env.model.getters.getPivotCellFromPosition({
          ...this.props.position,
          row: bottom + 1,
        });
        bottom++;
      }
    }
    return {
      top: this.props.position.row + 1,
      bottom: bottom - 1,
      left: this.props.position.col,
      right: this.props.position.col,
    };
  }
}

export const PivotSortingToolTipPopoverBuilder: PopoverBuilders = {
  onHover: (position, getters): CellPopoverComponent<typeof PivotSortingToolTip> => {
    const canSort = canSortPivot(getters, position);
    if (!canSort) {
      return { isOpen: false };
    }
    let onPosition = position;
    let pivotCell = getters.getPivotCellFromPosition(onPosition);
    while (
      getters.isVisibleInViewport({ ...onPosition, row: onPosition.row - 1 }) &&
      pivotCell.type === "VALUE"
    ) {
      onPosition = { ...onPosition, row: onPosition.row - 1 };
      pivotCell = getters.getPivotCellFromPosition(onPosition);
    }
    return {
      isOpen: true,
      props: {
        position: onPosition,
        hoveredCellPosition: position,
      },
      Component: PivotSortingToolTip,
      cellCorner: "TopRight",
      onPosition,
    };
  },
};
