import { Component, onMounted, onWillUpdateProps, useRef } from "@odoo/owl";
import { deepEquals } from "../../../helpers";
import { getComputedTableStyle } from "../../../helpers/table_helpers";
import { SpreadsheetChildEnv } from "../../../types";
import { TableConfig } from "../../../types/table";
import { drawPreviewTable } from "./table_canvas_helpers";

interface Props {
  tableConfig: TableConfig;
}

export class TableStylePreview extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStylePreview";
  static props = { tableConfig: Object };

  private canvasRef = useRef<HTMLCanvasElement>("canvas");

  setup() {
    onWillUpdateProps((nextProps) => {
      if (!deepEquals(this.props.tableConfig, nextProps.tableConfig)) {
        this.drawTable(nextProps.tableConfig);
      }
    });
    onMounted(() => this.drawTable(this.props.tableConfig));
  }

  private drawTable(tableConfig: TableConfig) {
    const ctx = this.canvasRef.el!.getContext("2d")!;
    const { width, height } = this.canvasRef.el!.getBoundingClientRect();
    this.canvasRef.el!.width = width;
    this.canvasRef.el!.height = height;
    const tableStyle = getComputedTableStyle(tableConfig, 5, 5);
    drawPreviewTable(ctx, tableStyle, (width - 1) / 5, (height - 1) / 5);
  }
}
