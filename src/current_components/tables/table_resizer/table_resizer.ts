import { Component, useState } from "@odoo/owl";
import { HeaderIndex, Highlight, SpreadsheetChildEnv, Table, Zone } from "../../../types";
import { css, cssPropertiesToCss } from "../../helpers";
import { dragAndDropBeyondTheViewport } from "../../helpers/drag_and_drop";
import { useHighlights } from "../../helpers/highlight_hook";

const SIZE = 3;
const COLOR = "#777";

css/* scss */ `
  .o-table-resizer {
    width: ${SIZE}px;
    height: ${SIZE}px;
    border-bottom: ${SIZE}px solid ${COLOR};
    border-right: ${SIZE}px solid ${COLOR};
    cursor: nwse-resize;
  }
`;

interface Props {
  table: Table;
}

interface State {
  highlightZone: Zone | undefined;
}

export class TableResizer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableResizer";
  static props = { table: Object };

  state = useState<State>({ highlightZone: undefined });

  setup(): void {
    useHighlights(this);
  }

  get containerStyle(): string {
    const tableZone = this.props.table.range.zone;
    const bottomRight = { ...tableZone, left: tableZone.right, top: tableZone.bottom };
    const rect = this.env.model.getters.getVisibleRect(bottomRight);
    if (rect.height === 0 || rect.width === 0) {
      return cssPropertiesToCss({ display: "none" });
    }

    return cssPropertiesToCss({
      top: `${rect.y + rect.height - SIZE * 2}px`,
      left: `${rect.x + rect.width - SIZE * 2}px`,
    });
  }

  onMouseDown(ev: MouseEvent) {
    const tableZone = this.props.table.range.zone;
    const topLeft = { col: tableZone.left, row: tableZone.top };
    document.body.style.cursor = "nwse-resize";

    const onMouseUp = () => {
      document.body.style.cursor = "";
      const newTableZone = this.state.highlightZone;
      if (!newTableZone) return;
      const sheetId = this.props.table.range.sheetId;
      this.env.model.dispatch("RESIZE_TABLE", {
        sheetId,
        zone: this.props.table.range.zone,
        newTableRange: this.env.model.getters.getRangeDataFromZone(sheetId, newTableZone),
      });
      this.state.highlightZone = undefined;
    };

    const onMouseMove = (col: HeaderIndex, row: HeaderIndex, ev: MouseEvent) => {
      this.state.highlightZone = {
        left: topLeft.col,
        top: topLeft.row,
        right: Math.max(col, topLeft.col),
        bottom: Math.max(row, topLeft.row),
      };
    };
    dragAndDropBeyondTheViewport(this.env, onMouseMove, onMouseUp);
  }

  get highlights(): Highlight[] {
    if (!this.state.highlightZone) return [];
    return [
      {
        zone: this.state.highlightZone,
        sheetId: this.props.table.range.sheetId,
        color: COLOR,
        noFill: true,
      },
    ];
  }
}
