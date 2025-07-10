import { Component } from "@odoo/owl";
import { isInside } from "../../helpers";
import { getPivotHighlights } from "../../helpers/pivot/pivot_highlight";
import { CellPosition, SpreadsheetChildEnv, UID } from "../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../types/cell_popovers";

interface Props {
  position: CellPosition;
  pivotId: UID;
}

export class DashboardExpandPivotButton extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-DashboardExpandPivotButton";
  static components = {};
  static props = {
    position: Object,
    pivotId: String,
    onClosed: { type: Function, optional: true },
  };

  onClick() {
    const pivotId = this.props.pivotId;
    const { col, row, sheetId } = this.props.position;
    this.env.model.dispatch("MAKE_PIVOT_FULL_SCREEN", { pivotId, col, row, sheetId });
  }
}

export const DashboardExpandPivotPopoverBuilder: PopoverBuilders = {
  onHover: (position, getters): CellPopoverComponent<typeof DashboardExpandPivotButton> => {
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
      props: { position, pivotId },
      Component: DashboardExpandPivotButton,
      cellCorner: "top-right",
      position: { ...position, col: pivotBlock.range.zone.right, row: pivotBlock.range.zone.top },
      slideInAnimation: true,
    };
  },
};
