import { Component } from "@odoo/owl";
import { DOMCoordinates, Position, SpreadsheetChildEnv } from "../../types";
import { ClosedCellPopover, PositionedCellPopover } from "../../types/cell_popovers";
import { Popover } from "../popover/popover";

interface Props {
  gridPosition: DOMCoordinates;
  hoveredCell: Partial<Position>;
  onClosePopover: () => void;
  onMouseWheel: (ev: WheelEvent) => void;
}
export class GridPopover extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GridPopover";
  static components = { Popover };

  get cellPopover(): PositionedCellPopover | ClosedCellPopover {
    const popover = this.env.model.getters.getCellPopover(this.props.hoveredCell);
    if (!popover.isOpen) {
      return { isOpen: false };
    }
    const coordinates = popover.coordinates;
    return {
      ...popover,
      // transform from the "canvas coordinate system" to the "body coordinate system"
      coordinates: {
        x: coordinates.x + this.props.gridPosition.x,
        y: coordinates.y + this.props.gridPosition.y,
      },
    };
  }
}
