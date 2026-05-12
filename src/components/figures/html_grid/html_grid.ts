import { proxy } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";
import { CellPosition, Zone } from "../../../types/misc";
import { Range } from "../../../types/range";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../../helpers/css";
import { HTMLCell } from "../html_cell/html_cell";

interface Props {
  range: Range;
}

interface State {
  hoveredRow: number | undefined;
}

export class HTMLGrid extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HTMLGrid";
  static props = {
    range: Object,
  };
  static components = { HTMLCell };

  state = proxy<State>({
    hoveredRow: undefined,
  });

  private getLastUsedRow(): number {
    const zone = this.props.range.zone;
    const sheetId = this.props.range.sheetId;
    let lastUsedRow = zone.top;

    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        const cell = this.env.model.getters.getEvaluatedCell({ sheetId, row, col });
        if (cell.formattedValue) {
          lastUsedRow = row;
          break;
        }
      }
    }

    return lastUsedRow;
  }

  get nonEmptyZone(): Zone {
    const zone = this.props.range.zone;
    const lastUsedRow = this.getLastUsedRow();
    return { ...zone, bottom: lastUsedRow };
  }

  get positions(): CellPosition[] {
    const sheetId = this.props.range.sheetId;
    const positions: CellPosition[] = [];
    const zone = this.nonEmptyZone;
    for (let row = zone.top; row <= zone.bottom; row++) {
      for (let col = zone.left; col <= zone.right; col++) {
        positions.push({ sheetId, row, col });
      }
    }
    return positions;
  }

  get gridStyle(): string {
    const sheetId = this.props.range.sheetId;
    const zone = this.nonEmptyZone;
    const zoneWidth =
      this.env.model.getters.getColDimensions(sheetId, zone.right).end -
      this.env.model.getters.getColDimensions(sheetId, zone.left).start;

    const colPercentages: number[] = [];
    for (let col = zone.left; col <= zone.right; col++) {
      const colWidth = this.env.model.getters.getColSize(sheetId, col);
      colPercentages.push((colWidth / zoneWidth) * 100);
    }

    return cssPropertiesToCss({
      "grid-template-columns": colPercentages.map((v) => `${Math.floor(v)}fr`).join(" "),
    });
  }

  isCellHovered(position: CellPosition): boolean {
    return this.state.hoveredRow === position.row;
  }

  onCellMouseEnter(position: CellPosition): void {
    this.state.hoveredRow = position.row;
  }

  onCellMouseLeave(): void {
    this.state.hoveredRow = undefined;
  }
}
