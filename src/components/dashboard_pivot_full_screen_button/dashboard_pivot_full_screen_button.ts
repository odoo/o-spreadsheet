import { Component } from "@odoo/owl";
import { isInside } from "../../helpers";
import { getPivotHighlights } from "../../helpers/pivot/pivot_highlight";
import { SpreadsheetChildEnv, UID } from "../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../types/cell_popovers";

interface Props {
  pivotId: UID;
}

export class DashboardPivotFullScreenButton extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DashboardPivotFullScreenButton";
  static components = {};
  static props = {
    pivotId: String,
    onClosed: { type: Function, optional: true },
  };

  onClick() {
    const pivotId = this.props.pivotId;
    this.env.model.dispatch("MAKE_PIVOT_FULL_SCREEN", { pivotId });
  }
}

export const DashboardPivotFullScreenPopoverBuilder: PopoverBuilders = {
  onHover: (position, getters): CellPopoverComponent<typeof DashboardPivotFullScreenButton> => {
    if (!getters.isDashboard()) {
      return { isOpen: false };
    }
    const pivotId = getters.getPivotIdFromPosition(position);
    if (!pivotId) {
      return { isOpen: false };
    }
    const pivotBlock = getPivotHighlights(getters, pivotId).find(
      (highlight) =>
        highlight.range.sheetId === position.sheetId &&
        isInside(position.col, position.row, highlight.range.zone)
    );
    if (!pivotBlock) {
      return { isOpen: false };
    }
    return {
      isOpen: true,
      props: { pivotId },
      Component: DashboardPivotFullScreenButton,
      cellCorner: "top-right",
      position: { ...position, col: pivotBlock.range.zone.right, row: pivotBlock.range.zone.top },
      slideInAnimation: true,
    };
  },
};
