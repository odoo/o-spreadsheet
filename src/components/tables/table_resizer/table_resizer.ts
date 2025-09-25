import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { HeaderIndex, Highlight, Table, Zone } from "../../../types";
import { cssPropertiesToCss } from "../../helpers";
import { useDragAndDropBeyondTheViewport } from "../../helpers/drag_and_drop_grid_hook";
import { useHighlights } from "../../helpers/highlight_hook";
import { withZoom } from "../../helpers/zoom";

const SIZE = 3;
const COLOR = "#777";

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
  dragNDropGrid = useDragAndDropBeyondTheViewport(this.env);

  setup(): void {
    useHighlights(this);
  }

  get containerStyle(): string {
    const tableZone = this.props.table.range.zone;
    const sheetId = this.props.table.range.sheetId;

    if (this.env.model.getters.isReadonly() || this.env.model.getters.isSheetLocked(sheetId)) {
      return cssPropertiesToCss({ display: "none" });
    }
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

  onMouseDown(ev: PointerEvent) {
    const tableZone = this.props.table.range.zone;
    const topLeft = { col: tableZone.left, row: tableZone.top };
    document.body.style.cursor = "nwse-resize";
    const zoomedMouseEvent = withZoom(this.env, ev);

    const onMouseUp = () => {
      document.body.style.cursor = "";
      const newTableZone = this.state.highlightZone;
      if (!newTableZone) {
        return;
      }
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
    this.dragNDropGrid.start(zoomedMouseEvent, onMouseMove, onMouseUp);
  }

  get highlights(): Highlight[] {
    if (!this.state.highlightZone) {
      return [];
    }
    return [
      {
        range: this.env.model.getters.getRangeFromZone(
          this.props.table.range.sheetId,
          this.state.highlightZone
        ),
        color: COLOR,
        noFill: true,
      },
    ];
  }
}
