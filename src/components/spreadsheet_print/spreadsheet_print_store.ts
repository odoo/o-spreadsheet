import {
  _t,
  Dimension,
  DOMDimension,
  GridRenderingContext,
  HeaderIndex,
  UID,
  ValueAndLabel,
  Zone,
} from "@odoo/o-spreadsheet-engine";
import { ViewportCollection } from "@odoo/o-spreadsheet-engine/helpers/viewport_collection";
import { cellPositions, intersection } from "../../helpers";
import { SpreadsheetStore } from "../../stores";
import { CellValueType, FigureUI } from "../../types";

// Page layouts in millimeters
const PRINT_PAGES_LAYOUTS = {
  A3: { width: 297, height: 420, name: _t("A3 (297 x 420 mm)") },
  A4: { width: 210, height: 297, name: _t("A4 (210 x 297 mm)") },
  A5: { width: 148, height: 210, name: _t("A5 (148 x 210 mm)") },
  B4: { width: 250, height: 353, name: _t("B4 (250 x 353 mm)") },
  B5: { width: 176, height: 250, name: _t("B5 (176 x 250 mm)") },
  Letter: { width: 216, height: 279, name: _t("Letter (216 x 279 mm)") },
  Legal: { width: 216, height: 356, name: _t("Legal (216 x 356 mm)") },
};

export type PrintPageLayout = keyof typeof PRINT_PAGES_LAYOUTS;
export type PrintSelection = "currentSheet" | "entireWorkbook" | "selection";
export type PrintScale = "fitToWidth" | "fitToHeight" | "actualSize";
export type Orientation = "portrait" | "landscape";

const PX_PER_MM = 3.78;

interface PagePrintInfo {
  sheetId: UID;
  zone: Zone;
  renderingCtx: Partial<GridRenderingContext>;
}

export class SpreadsheetPrintStore extends SpreadsheetStore {
  mutators = [
    "changePrintLayout",
    "changePrintSelection",
    "changePrintScale",
    "changePrintOrientation",
    "setGridLinesVisibility",
  ] as const;

  pageLayout = "A4";
  printSelection = "currentSheet";
  printScale = "fitToWidth";
  orientation = "portrait";
  hideGridLines =
    this.getters.isDashboard() ||
    !this.getters.getGridLinesVisibility(this.getters.getActiveSheetId());

  get printPages(): PagePrintInfo[] {
    if (this.printSelection === "selection") {
      const sheetId = this.getters.getActiveSheetId();
      return this.splitZoneToPrintPages(sheetId, this.getters.getSelectedZone());
    }
    const sheetIds =
      this.printSelection === "entireWorkbook"
        ? this.getters.getSheetIds()
        : [this.getters.getActiveSheetId()];
    return sheetIds.flatMap((sheetId) => {
      const { lastUsedCol, lastUsedRow } = this.getLastUsedHeaders(sheetId);
      const zone = { left: 0, top: 0, right: lastUsedCol, bottom: lastUsedRow };
      return this.splitZoneToPrintPages(sheetId, zone);
    });
  }

  changePrintLayout(value: PrintPageLayout) {
    this.pageLayout = value;
  }

  changePrintSelection(value: PrintSelection) {
    this.printSelection = value;
  }

  changePrintScale(value: PrintScale) {
    this.printScale = value;
  }

  setGridLinesVisibility(value: boolean) {
    this.hideGridLines = value;
  }

  changePrintOrientation(value: Orientation) {
    this.orientation = value;
  }

  private splitZoneToPrintPages(sheetId: UID, printZone: Zone): PagePrintInfo[] {
    const zoom = this.getPrintZoom(sheetId, printZone);

    const horizontalBreaks: HeaderIndex[] =
      this.printScale === "fitToWidth"
        ? [printZone.left, printZone.right + 1]
        : this.getPageBreaks(sheetId, printZone, "COL", zoom);

    const verticalBreaks: HeaderIndex[] =
      this.printScale === "fitToHeight"
        ? [printZone.top, printZone.bottom + 1]
        : this.getPageBreaks(sheetId, printZone, "ROW", zoom);

    const pages: PagePrintInfo[] = [];

    for (let x = 0; x < horizontalBreaks.length - 1; x++) {
      for (let y = 0; y < verticalBreaks.length - 1; y++) {
        const zone = {
          left: horizontalBreaks[x],
          top: verticalBreaks[y],
          right: horizontalBreaks[x + 1] - 1,
          bottom: verticalBreaks[y + 1] - 1,
        };
        pages.push({
          sheetId,
          zone,
          renderingCtx: this.getZoneRenderingContext(sheetId, zone, zoom),
        });
      }
    }
    return pages.filter((page) => this.pageHasContent(page));
  }

  private getPageBreaks(
    sheetId: UID,
    printZone: Zone,
    dimension: Dimension,
    zoom: number
  ): number[] {
    const { width: printWidth, height: printHeight } = this.pageDimensionWithMargins;

    const start = dimension === "COL" ? printZone.left : printZone.top;
    const end = dimension === "COL" ? printZone.right : printZone.bottom;
    const getHeaderSize =
      dimension === "COL" ? this.getters.getColDimensions : this.getters.getRowDimensions;
    const max = dimension === "COL" ? printWidth : printHeight;

    const breaks: number[] = [];
    let current = 0;
    for (let i = start; i <= end; i++) {
      const headerSize = getHeaderSize(sheetId, i).size * zoom;
      current += headerSize;
      if (current >= max) {
        breaks.push(i);
        current = headerSize;
      }
    }
    return [start, ...breaks, end + 1];
  }

  private getPrintZoom(sheetId: UID, printZone: Zone) {
    if (this.printScale === "fitToWidth") {
      const startX = this.getters.getColDimensions(sheetId, printZone.left).start;
      const endX = this.getters.getColDimensions(sheetId, printZone.right).end;
      const width = endX - startX;
      return Math.min(this.pageDimensionWithMargins.width / width, 1);
    } else if (this.printScale === "fitToHeight") {
      const startY = this.getters.getRowDimensions(sheetId, printZone.top).start;
      const endY = this.getters.getRowDimensions(sheetId, printZone.bottom).end;
      const height = endY - startY;
      return Math.min(this.pageDimensionWithMargins.height / height, 1);
    }
    return 1;
  }

  private getZoneRenderingContext(
    sheetId: UID,
    zone: Zone,
    zoom: number
  ): Omit<GridRenderingContext, "ctx" | "thinLineWidth"> {
    const firstRowStart = this.getters.getRowDimensions(sheetId, zone.top).start;
    const lastRowEnd = this.getters.getRowDimensions(sheetId, zone.bottom).end;
    const firstColStart = this.getters.getColDimensions(sheetId, zone.left).start;
    const lastColEnd = this.getters.getColDimensions(sheetId, zone.right).end;

    const sheetViewWidth = lastColEnd - firstColStart;
    const sheetViewHeight = lastRowEnd - firstRowStart;
    const viewports = new ViewportCollection(this.getters, sheetViewWidth, sheetViewHeight, zoom);
    viewports.setSheetViewOffset(sheetId, firstColStart, firstRowStart);

    return {
      sheetId,
      viewports,
      hideGridLines: this.hideGridLines,
      dpr: 3, // Increase the canvas' dpr on print so the image is of better quality
      selectedZones: [],
      activeCols: new Set(),
      activeRows: new Set(),
      activePosition: undefined,
    };
  }

  get pageDimensionWithMargins(): DOMDimension {
    const { width, height } = this.pageDimensionsInPixels;
    return { width: width - this.printMargin * 2, height: height - this.printMargin * 2 };
  }

  get printMargin() {
    return 50; // in pixels
  }

  private getLastUsedHeaders(sheetId: UID): { lastUsedCol: number; lastUsedRow: number } {
    let lastUsedCol = 0;
    let lastUsedRow = 0;

    const coreCells = this.getters.getCells(sheetId);
    for (const cell of coreCells) {
      const position = this.getters.getCellPosition(cell.id);
      const spreadZone = this.getters.getSpreadZone(position);
      lastUsedCol = Math.max(lastUsedCol, spreadZone?.right ?? position.col);
      lastUsedRow = Math.max(lastUsedRow, spreadZone?.bottom ?? position.row);
    }

    const tables = this.getters.getTables(sheetId);
    for (const table of tables) {
      lastUsedCol = Math.max(lastUsedCol, table.range.zone.right);
      lastUsedRow = Math.max(lastUsedRow, table.range.zone.bottom);
    }

    for (const figure of this.getters.getFigures(sheetId)) {
      const figureUI = this.getters.getFigureUI(sheetId, figure);
      const figureZone = this.getZoneContainingFigure(sheetId, figureUI);
      lastUsedCol = Math.max(lastUsedCol, figureZone.right);
      lastUsedRow = Math.max(lastUsedRow, figureZone.bottom);
    }

    return { lastUsedCol, lastUsedRow };
  }

  private pageHasContent({ sheetId, zone }: PagePrintInfo): boolean {
    if (
      this.getters.getTablesOverlappingZones(sheetId, [zone]).length > 0 ||
      this.areThereFiguresInZone(sheetId, zone)
    ) {
      return true;
    }

    for (const position of cellPositions(sheetId, zone)) {
      const coreCell = this.getters.getCell(position);
      if (coreCell && (coreCell.style || coreCell.isFormula || coreCell.content)) {
        return true;
      }
      const evaluatedCell = this.getters.getEvaluatedCell(position);
      if (evaluatedCell && evaluatedCell.type !== CellValueType.empty) {
        return true;
      }
    }
    return false;
  }

  get pageDimensionsInPixels(): DOMDimension {
    const layout = PRINT_PAGES_LAYOUTS[this.pageLayout];
    const widthInPixels = Math.floor(layout.width * PX_PER_MM);
    const heightInPixels = Math.floor(layout.height * PX_PER_MM);
    return this.orientation === "portrait"
      ? { width: widthInPixels, height: heightInPixels }
      : { width: heightInPixels, height: widthInPixels };
  }

  private areThereFiguresInZone(sheetId: UID, zone: Zone): boolean {
    const figures = this.getters.getFigures(sheetId);
    return figures
      .map((figure) => this.getters.getFigureUI(sheetId, figure))
      .some((figureUI) => {
        const figureZone = this.getZoneContainingFigure(sheetId, figureUI);
        return !!intersection(zone, figureZone);
      });
  }

  private getZoneContainingFigure(sheetId: UID, figureUI: FigureUI): Zone {
    const startCol = figureUI.col;
    const startX = figureUI.x;
    const endX = startX + figureUI.width;
    let endCol = startCol;
    while (
      endCol < this.getters.getNumberCols(sheetId) - 1 &&
      this.getters.getColDimensions(sheetId, endCol).end < endX
    ) {
      endCol++;
    }

    const startRow = figureUI.row;
    const startY = figureUI.y;
    const endY = startY + figureUI.height;
    let endRow = startRow;
    while (
      endRow < this.getters.getNumberRows(sheetId) - 1 &&
      this.getters.getRowDimensions(sheetId, endRow).end < endY
    ) {
      endRow++;
    }

    return { left: startCol, right: endCol, top: startRow, bottom: endRow };
  }

  get layoutOptions(): ValueAndLabel[] {
    return Object.keys(PRINT_PAGES_LAYOUTS).map((key) => ({
      value: key,
      label: PRINT_PAGES_LAYOUTS[key].name,
    }));
  }

  get printSelectionOptions(): ValueAndLabel[] {
    const options = [
      { value: "currentSheet", label: _t("Current sheet") },
      { value: "entireWorkbook", label: _t("Entire workbook") },
    ];
    const selection = this.getters.getSelectedZones();
    if (selection.length === 1) {
      const sheetId = this.getters.getActiveSheetId();
      const selectionRange = this.getters.getRangeFromZone(sheetId, selection[0]);
      const rangeString = this.getters.getRangeString(selectionRange, sheetId);
      options.push({ value: "selection", label: _t("Selected cells (%s)", rangeString) });
    }
    return options;
  }

  get printScaleOptions(): ValueAndLabel[] {
    return [
      { value: "fitToWidth", label: _t("Fit to width") },
      { value: "fitToHeight", label: _t("Fit to height") },
      { value: "actualSize", label: _t("Actual size") },
    ];
  }

  get orientationChoices(): ValueAndLabel[] {
    return [
      { value: "portrait", label: _t("Portrait") },
      { value: "landscape", label: _t("Landscape") },
    ];
  }
}
