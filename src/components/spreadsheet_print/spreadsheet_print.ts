import {
  _t,
  Dimension,
  DOMDimension,
  GridRenderingContext,
  UID,
  ValueAndLabel,
  Zone,
} from "@odoo/o-spreadsheet-engine";
import { ViewportCollection } from "@odoo/o-spreadsheet-engine/helpers/viewport_collection";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useExternalListener, useState } from "@odoo/owl";
import { cellPositions, intersection } from "../../helpers";
import { CellValueType, FigureUI } from "../../types";
import { cssPropertiesToCss } from "../helpers";
import { Select } from "../select/select";
import { BadgeSelection } from "../side_panel/components/badge_selection/badge_selection";
import { Checkbox } from "../side_panel/components/checkbox/checkbox";
import { Section } from "../side_panel/components/section/section";
import { StandaloneGridCanvas } from "../standalone_grid_canvas/standalone_grid_canvas";

interface Props {
  onExitPrintMode: () => void;
}

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

type PrintPageLayout = keyof typeof PRINT_PAGES_LAYOUTS;
type PrintSelection = "currentSheet" | "entireWorkbook" | "selection";
type PrintScale = "fitToWidth" | "fitToHeight" | "actualSize";
type Orientation = "portrait" | "landscape";

const PRINT_MARGIN = 50; // in pixels

interface PagePrintInfo {
  sheetId: UID;
  zone: Zone;
  renderingCtx: Partial<GridRenderingContext>;
}

interface State {
  pageLayout: PrintPageLayout;
  printSelection: PrintSelection;
  printScale: PrintScale;
  hideGridLines: boolean;
  orientation: Orientation;
}

export class SpreadsheetPrint extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetPrint";
  static props = { onExitPrintMode: Function };
  static components = { StandaloneGridCanvas, Section, Select, BadgeSelection, Checkbox };

  state = useState<State>({
    pageLayout: "A4",
    printSelection: "currentSheet",
    printScale: "fitToWidth",
    orientation: "portrait",
    hideGridLines:
      this.env.model.getters.isDashboard() ||
      !this.env.model.getters.getGridLinesVisibility(this.env.model.getters.getActiveSheetId()),
  });

  setup() {
    useExternalListener(window, "beforeprint", () => {
      const style = document.createElement("style");
      style.id = "print-style";
      const size = `${this.state.pageLayout} ${this.state.orientation}`;
      style.innerHTML = `@media print { @page { size: ${size}; margin: ${PRINT_MARGIN}px;}}`;
      document.head.appendChild(style);
    });
    useExternalListener(window, "afterprint", () => {
      const style = document.getElementById("print-style");
      if (style) {
        document.head.removeChild(style);
      }
    });
  }

  get printPages(): PagePrintInfo[] {
    if (this.state.printSelection === "selection") {
      const sheetId = this.env.model.getters.getActiveSheetId();
      const selectedZones = this.env.model.getters.getSelectedZones();
      return selectedZones.flatMap((zone) => this.splitZoneToPrintPages(sheetId, zone));
    }
    const sheetIds =
      this.state.printSelection === "entireWorkbook"
        ? this.env.model.getters.getSheetIds()
        : [this.env.model.getters.getActiveSheetId()];
    return sheetIds.flatMap((sheetId) => {
      const { lastUsedCol, lastUsedRow } = this.getLastUsedHeaders(sheetId);
      const zone = { left: 0, top: 0, right: lastUsedCol, bottom: lastUsedRow };
      return this.splitZoneToPrintPages(sheetId, zone);
    });
  }

  get pageStyle(): string {
    const { width, height } = this.pageDimensionsInPixels;
    return cssPropertiesToCss({
      width: `${width}px`,
      height: `${height}px`,
      padding: `${PRINT_MARGIN}px`,
    });
  }

  get layoutOptions(): ValueAndLabel[] {
    return Object.keys(PRINT_PAGES_LAYOUTS).map((key) => ({
      value: key,
      label: PRINT_PAGES_LAYOUTS[key].name,
    }));
  }

  onLayoutChange(value: PrintPageLayout) {
    this.state.pageLayout = value;
  }

  get printSelectionOptions(): ValueAndLabel[] {
    return [
      { value: "currentSheet", label: _t("Current sheet") },
      { value: "entireWorkbook", label: _t("Entire workbook") },
      { value: "selection", label: _t("Selected cells") },
    ];
  }

  onPrintSelectionChange(value: PrintSelection) {
    this.state.printSelection = value;
  }

  get printScaleOptions(): ValueAndLabel[] {
    return [
      { value: "fitToWidth", label: _t("Fit to width") },
      { value: "fitToHeight", label: _t("Fit to height") },
      { value: "actualSize", label: _t("Actual size") },
    ];
  }

  onPrintScaleChange(value: PrintScale) {
    this.state.printScale = value;
  }

  toggleGridLines(value: boolean) {
    this.state.hideGridLines = !value;
  }

  get orientationChoices(): ValueAndLabel[] {
    return [
      { value: "portrait", label: _t("Portrait") },
      { value: "landscape", label: _t("Landscape") },
    ];
  }

  changeOrientation(value: Orientation) {
    this.state.orientation = value;
  }

  private splitZoneToPrintPages(sheetId: UID, printZone: Zone): PagePrintInfo[] {
    const zoom = this.getPrintZoom(sheetId, printZone);

    const xBreaks: number[] =
      this.state.printScale === "fitToWidth"
        ? [printZone.left, printZone.right + 1]
        : this.getPageBreaks(sheetId, printZone, "COL", zoom);

    const yBreaks: number[] =
      this.state.printScale === "fitToHeight"
        ? [printZone.top, printZone.bottom + 1]
        : this.getPageBreaks(sheetId, printZone, "ROW", zoom);

    const pages: PagePrintInfo[] = [];

    for (let x = 0; x < xBreaks.length - 1; x++) {
      for (let y = 0; y < yBreaks.length - 1; y++) {
        const zone = {
          left: xBreaks[x],
          top: yBreaks[y],
          right: xBreaks[x + 1] - 1,
          bottom: yBreaks[y + 1] - 1,
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
      dimension === "COL"
        ? this.env.model.getters.getColDimensions
        : this.env.model.getters.getRowDimensions;
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
    if (this.state.printScale === "fitToWidth") {
      const startX = this.env.model.getters.getColDimensions(sheetId, printZone.left).start;
      const endX = this.env.model.getters.getColDimensions(sheetId, printZone.right).end;
      const width = endX - startX;
      return Math.min(this.pageDimensionWithMargins.width / width, 1);
    } else if (this.state.printScale === "fitToHeight") {
      const startY = this.env.model.getters.getRowDimensions(sheetId, printZone.top).start;
      const endY = this.env.model.getters.getRowDimensions(sheetId, printZone.bottom).end;
      const height = endY - startY;
      return Math.min(this.pageDimensionWithMargins.height / height, 1);
    }
    return 1;
  }

  private getZoneRenderingContext(
    sheetId: UID,
    zone: Zone,
    zoom: number
  ): Partial<GridRenderingContext> {
    const firstRowStart = this.env.model.getters.getRowDimensions(sheetId, zone.top).start;
    const lastRowEnd = this.env.model.getters.getRowDimensions(sheetId, zone.bottom).end;
    const firstColStart = this.env.model.getters.getColDimensions(sheetId, zone.left).start;
    const lastColEnd = this.env.model.getters.getColDimensions(sheetId, zone.right).end;

    const viewports = new ViewportCollection(this.env.model.getters);
    viewports.sheetViewWidth = lastColEnd - firstColStart;
    viewports.sheetViewHeight = lastRowEnd - firstRowStart;
    viewports.setSheetViewOffset(sheetId, firstColStart, firstRowStart);
    viewports.zoomLevel = zoom;

    return {
      selectedZones: [],
      sheetId,
      viewports,
      hideGridLines: this.state.hideGridLines,
    };
  }

  onPrint() {
    window.print();
    this.props.onExitPrintMode();
  }

  get pageDimensionWithMargins(): DOMDimension {
    const { width, height } = this.pageDimensionsInPixels;
    return { width: width - PRINT_MARGIN * 2, height: height - PRINT_MARGIN * 2 };
  }

  private getLastUsedHeaders(sheetId: UID): { lastUsedCol: number; lastUsedRow: number } {
    let lastUsedCol = 0;
    let lastUsedRow = 0;

    const evaluatedCells = this.env.model.getters.getEvaluatedCellsPositions(sheetId);
    for (const { col, row } of evaluatedCells) {
      lastUsedCol = Math.max(lastUsedCol, col);
      lastUsedRow = Math.max(lastUsedRow, row);
    }

    const coreCells = this.env.model.getters.getCells(sheetId);
    for (const cell of coreCells) {
      const position = this.env.model.getters.getCellPosition(cell.id);
      lastUsedCol = Math.max(lastUsedCol, position.col);
      lastUsedRow = Math.max(lastUsedRow, position.row);
    }

    const tables = this.env.model.getters.getTables(sheetId);
    for (const table of tables) {
      lastUsedCol = Math.max(lastUsedCol, table.range.zone.right);
      lastUsedRow = Math.max(lastUsedRow, table.range.zone.bottom);
    }

    for (const figure of this.env.model.getters.getFigures(sheetId)) {
      const figureUI = this.env.model.getters.getFigureUI(sheetId, figure);
      const figureZone = this.getZoneContainingFigure(sheetId, figureUI);
      lastUsedCol = Math.max(lastUsedCol, figureZone.right);
      lastUsedRow = Math.max(lastUsedRow, figureZone.bottom);
    }

    return { lastUsedCol, lastUsedRow };
  }

  private pageHasContent({ sheetId, zone }: PagePrintInfo): boolean {
    if (
      this.env.model.getters.getTablesOverlappingZones(sheetId, [zone]).length > 0 ||
      this.areThereFiguresInZone(sheetId, zone)
    ) {
      return true;
    }

    for (const position of cellPositions(sheetId, zone)) {
      const coreCell = this.env.model.getters.getCell(position);
      if (coreCell && (coreCell.style || coreCell.content)) {
        return true;
      }
      const evaluatedCell = this.env.model.getters.getEvaluatedCell(position);
      if (evaluatedCell && evaluatedCell.type !== CellValueType.empty) {
        return true;
      }
    }
    return false;
  }

  get pageDimensionsInPixels(): DOMDimension {
    const layout = PRINT_PAGES_LAYOUTS[this.state.pageLayout];
    const widthInPixels = Math.floor(layout.width * 3.78);
    const heightInPixels = Math.floor(layout.height * 3.78);
    return this.state.orientation === "portrait"
      ? { width: widthInPixels, height: heightInPixels }
      : { width: heightInPixels, height: widthInPixels };
  }

  private areThereFiguresInZone(sheetId: UID, zone: Zone): boolean {
    const figures = this.env.model.getters.getFigures(sheetId);
    return figures
      .map((figure) => this.env.model.getters.getFigureUI(sheetId, figure))
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
      endCol < this.env.model.getters.getNumberCols(sheetId) - 1 &&
      this.env.model.getters.getColDimensions(sheetId, endCol).end < endX
    ) {
      endCol++;
    }

    const startRow = figureUI.row;
    const startY = figureUI.y;
    const endY = startY + figureUI.height;
    let endRow = startRow;
    while (
      endRow < this.env.model.getters.getNumberRows(sheetId) - 1 &&
      this.env.model.getters.getRowDimensions(sheetId, endRow).end < endY
    ) {
      endRow++;
    }

    return { left: startCol, right: endCol, top: startRow, bottom: endRow };
  }
}
