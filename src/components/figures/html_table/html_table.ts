import { Component } from "@odoo/owl";
import { CellPosition, Zone } from "../../../types";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../../helpers";
import { HTMLCell } from "../html_cell/html_cell";
import { HTMLContentDescr } from "./html_content_store";

interface Props {
  content: HTMLContentDescr;
}

// const PADDING = 20;
const TITLE_HEIGHT = 18;
const TITLE_BOTTOM_PADDING = 16;
const TITLE_BOTTOM_MARGIN = 8;

export class HTMLGridContent extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-HTMLGridContent";
  static props = {
    content: Object,
  };
  static components = { HTMLCell };

  get containerStyle(): string {
    // const rect = this.env.model.getters.getRect(this.props.content.displayZone);
    return cssPropertiesToCss({
      // width: `${rect.width}px`,
      // height: `${rect.height}px`,
      // left: `${rect.x}px`,
      // top: `${rect.y}px`,
      // "z-index": "2",
      // padding: `${PADDING}px`,
    });
  }

  get titleStyle(): string {
    // ADRM TODO: do it in CSS
    return cssPropertiesToCss({
      height: `${TITLE_HEIGHT + TITLE_BOTTOM_PADDING}px`,
      "line-height": `${TITLE_HEIGHT}px`,
      "font-size": `${TITLE_HEIGHT}px`,
      "padding-bottom": `${TITLE_BOTTOM_PADDING}px`,
      "margin-bottom": `${TITLE_BOTTOM_MARGIN}px`,
    });
  }

  private getLastUsedRow(): number {
    const zone = this.props.content.contentZone;
    const sheetId = this.props.content.sheetId;
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
    const zone = this.props.content.contentZone;
    const lastUsedRow = this.getLastUsedRow();
    return { ...zone, bottom: lastUsedRow };
  }

  // get tableStyle(): string {
  //   const gridRect = this.env.model.getters.getRect(this.props.content.contentZone);
  //   const containerRect = this.env.model.getters.getRect(this.props.content.displayZone);
  //   const titleHeight = this.props.content.title
  //     ? TITLE_HEIGHT + TITLE_BOTTOM_PADDING + TITLE_BOTTOM_MARGIN
  //     : 0;
  //   const targetWidth = containerRect.width - PADDING * 2;
  //   const targetHeight = containerRect.height - titleHeight - PADDING * 2;
  //   const widthRatio = targetWidth / gridRect.width;
  //   const heightRatio = targetHeight / gridRect.height;
  //   const scale = Math.min(widthRatio, heightRatio);
  //   return cssPropertiesToCss({
  //     // transform: `scale(${scale})`,
  //     // "transform-origin": "top left",
  //     width: `${targetWidth}px`,
  //     height: `${targetHeight}px`,
  //     "table-layout": "fixed",
  //   });
  // }

  // rowsToDisplay(): { rowStyle: string; cells: CellPosition[] }[] {
  //   const positions: { rowStyle: string; cells: CellPosition[] }[] = [];
  //   const sheetId = this.props.content.sheetId;
  //   const zone = this.props.content.contentZone;
  //   for (let row = zone.top; row <= zone.bottom; row++) {
  //     const rowPositions: CellPosition[] = [];
  //     for (let col = zone.left; col <= zone.right; col++) {
  //       rowPositions.push({ col, row, sheetId });
  //     }
  //     const rowSize = this.env.model.getters.getRowSize(sheetId, row);
  //     positions.push({
  //       rowStyle: cssPropertiesToCss({ height: `${rowSize}px`, overflow: "hidden" }),
  //       cells: rowPositions,
  //     });
  //   }
  //   return positions;
  // }

  // get tableColumnStyles() {
  //   const sheetId = this.props.content.sheetId;
  //   const columnStyles: string[] = [];
  //   const zone = this.props.content.contentZone;
  //   for (let col = zone.left; col <= zone.right; col++) {
  //     const width = this.env.model.getters.getColSize(sheetId, col);
  //     columnStyles.push(cssPropertiesToCss({ width: `${width}px` }));
  //   }
  //   return columnStyles;
  // }

  get positions(): CellPosition[] {
    const sheetId = this.props.content.sheetId;
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
    const sheetId = this.props.content.sheetId;
    const zone = this.nonEmptyZone;
    const width =
      this.env.model.getters.getColDimensions(sheetId, zone.right).end -
      this.env.model.getters.getColDimensions(sheetId, zone.left).start;
    const height =
      this.env.model.getters.getRowDimensions(sheetId, zone.bottom).end -
      this.env.model.getters.getRowDimensions(sheetId, zone.top).start;

    const colPercentages: number[] = [];
    for (let col = zone.left; col <= zone.right; col++) {
      const colWidth = this.env.model.getters.getColSize(sheetId, col);
      colPercentages.push((colWidth / width) * 100);
    }

    const rowPercentages: number[] = [];
    for (let row = zone.top; row <= zone.bottom; row++) {
      const rowHeight = this.env.model.getters.getRowSize(sheetId, row);
      rowPercentages.push((rowHeight / height) * 100);
    }

    return cssPropertiesToCss({
      "grid-template-columns": colPercentages.map((v) => `${Math.floor(v)}fr`).join(" "),
      "grid-template-rows": rowPercentages.map((v) => `${Math.floor(v)}fr`).join(" "),
    });
  }
}
