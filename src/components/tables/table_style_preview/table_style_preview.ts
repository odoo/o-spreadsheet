import { Component, onMounted, onWillUpdateProps, useRef } from "@odoo/owl";
import { deepEquals } from "../../../helpers";
import { getComputedTableStyle } from "../../../helpers/table_helpers";
import { SpreadsheetChildEnv } from "../../../types";
import { TableConfig, TableStyle } from "../../../types/table";
import { drawPreviewTable } from "./table_canvas_helpers";

interface Props {
  tableConfig: TableConfig;
  tableStyle?: TableStyle;
}

export class TableStylePreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStylePreview";
  static props = { tableConfig: Object, tableStyle: { type: Object, optional: true } };

  private canvasRef = useRef<HTMLCanvasElement>("canvas");

  setup() {
    onWillUpdateProps((nextProps) => {
      if (
        !deepEquals(this.props.tableConfig, nextProps.tableConfig) ||
        !deepEquals(this.props.tableStyle, nextProps.tableStyle)
      ) {
        this.drawTable(nextProps);
      }
    });
    onMounted(() => this.drawTable(this.props));
  }

  private drawTable(props: Props) {
    const ctx = this.canvasRef.el!.getContext("2d")!;
    const { width, height } = this.canvasRef.el!.getBoundingClientRect();
    this.canvasRef.el!.width = width;
    this.canvasRef.el!.height = height;
    const style = props.tableStyle
      ? props.tableStyle
      : this.env.model.getters.getTableStyle(props.tableConfig.styleId);
    const computedStyle = getComputedTableStyle(props.tableConfig, style, 5, 5);
    drawPreviewTable(ctx, computedStyle, (width - 1) / 5, (height - 1) / 5);
  }
}
