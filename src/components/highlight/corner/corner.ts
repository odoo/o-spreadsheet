import { Component } from "@odoo/owl";
import { AUTOFILL_EDGE_LENGTH, HEADER_HEIGHT, HEADER_WIDTH } from "../../../constants";
import { SpreadsheetChildEnv, Zone } from "../../../types";
import { css } from "../../helpers/css";

css/* scss */ `
  .o-corner {
    position: absolute;
    height: 6px;
    width: 6px;
    border: 1px solid white;
  }
  .o-corner-nw,
  .o-corner-se {
    &:hover {
      cursor: nwse-resize;
    }
  }
  .o-corner-ne,
  .o-corner-sw {
    &:hover {
      cursor: nesw-resize;
    }
  }
  .o-resizing {
    cursor: grabbing;
  }
`;

type Orientation = "nw" | "ne" | "sw" | "se";

interface Props {
  zone: Zone;
  color: string;
  orientation: Orientation;
  isResizing: boolean;
  onResizeHighlight: (isLeft: boolean, isRight: boolean) => void;
}

export class Corner extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.Corner";
  private isTop = this.props.orientation[0] === "n";
  private isLeft = this.props.orientation[1] === "w";

  get style() {
    const { offsetX, offsetY } = this.env.model.getters.getActiveSnappedViewport();
    const sheetId = this.env.model.getters.getActiveSheetId();
    const z = this.props.zone;
    const leftValue = this.isLeft
      ? this.env.model.getters.getColDimensions(sheetId, z.left).start
      : this.env.model.getters.getColDimensions(sheetId, z.right).end;
    const topValue = this.isTop
      ? this.env.model.getters.getRowDimensions(sheetId, z.top).start
      : this.env.model.getters.getRowDimensions(sheetId, z.bottom).end;
    return `
      left:${leftValue + HEADER_WIDTH - offsetX - AUTOFILL_EDGE_LENGTH / 2}px;
      top:${topValue + HEADER_HEIGHT - offsetY - AUTOFILL_EDGE_LENGTH / 2}px;
      background-color:${this.props.color};
    `;
  }

  onMouseDown(ev: MouseEvent) {
    this.props.onResizeHighlight(this.isLeft, this.isTop);
  }
}
