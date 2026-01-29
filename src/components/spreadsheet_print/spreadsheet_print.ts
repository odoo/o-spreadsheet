import { _t, DOMDimension, UID, ValueAndLabel, Zone } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onMounted, useState } from "@odoo/owl";
import { intersection } from "../../helpers";
import { CellValueType, FigureUI } from "../../types";
import { GridCanvas } from "../grid_canvas/grid_canvas";
import { cssPropertiesToCss } from "../helpers";
import { Select } from "../select/select";
import { Section } from "../side_panel/components/section/section";

interface Props {
  onExitPrintMode: () => void;
}

// Example layouts in mm
const PRINT_PAGES_LAYOUTS = {
  A3: { width: 297, height: 420, name: _t("A3 (297 x 420 mm)") },
  A4: { width: 210, height: 297, name: _t("A4 (210 x 297 mm)") },
  A5: { width: 148, height: 210, name: _t("A5 (148 x 210 mm)") },
  B4: { width: 250, height: 353, name: _t("B4 (250 x 353 mm)") },
  B5: { width: 176, height: 250, name: _t("B5 (176 x 250 mm)") },
  Letter: { width: 216, height: 279, name: _t("Letter (216 x 279 mm)") },
  Tabloid: { width: 279, height: 432, name: _t("Tabloid (279 x 432 mm)") },
  Legal: { width: 216, height: 356, name: _t("Legal (216 x 356 mm)") },
};

type PrintPageLayout = keyof typeof PRINT_PAGES_LAYOUTS;
type PrintSelection = "currentSheet" | "entireWorkbook" | "selection";

interface PagePrintInfo {
  sheetId: UID;
  zone: Zone;
}

interface State {
  pageLayout: PrintPageLayout;
  printSelection: PrintSelection;
}

export class SpreadsheetPrint extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpreadsheetPrint";
  static props = { onExitPrintMode: Function };
  static components = { GridCanvas, Section, Select };

  state = useState<State>({
    pageLayout: "A4",
    printSelection: "currentSheet",
  });

  private showGridLinesAtInit: { [sheetId: UID]: boolean } = {};

  setup() {
    for (const sheetId of this.env.model.getters.getSheetIds()) {
      this.showGridLinesAtInit[sheetId] = this.env.model.getters.getGridLinesVisibility(sheetId);
    }
    onMounted(() => {
      if (this.env.model.getters.getSelectedFigureId()) {
        this.env.model.dispatch("SELECT_FIGURE", { figureId: null });
      }
      // setTimeout(() => {
      //   this.printPageWithIframe();
      // }, 60);
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

  splitZoneToPrintPages(sheetId: UID, printZone: Zone): PagePrintInfo[] {
    const { width: pageWidth, height: pageHeight } = this.pageDimensionsInPixels;
    const printWidth = pageWidth - 140; // Subtracting some print margins
    const printHeight = pageHeight - 140;

    const xPages: number[] = [];
    let currentX = 0;
    for (let col = printZone.left; col <= printZone.right; col++) {
      const colDim = this.env.model.getters.getColDimensions(sheetId, col);
      currentX += colDim.size;
      if (currentX >= printWidth) {
        xPages.push(col);
        currentX = colDim.size;
      }
    }

    const yPages: number[] = [];
    let currentY = 0;
    for (let row = printZone.top; row <= printZone.bottom; row++) {
      const rowDim = this.env.model.getters.getRowDimensions(sheetId, row);
      currentY += rowDim.size;
      if (currentY >= printHeight) {
        yPages.push(row);
        currentY = rowDim.size;
      }
    }

    const xBreaks = [printZone.left, ...xPages, printZone.right + 1];
    const yBreaks = [printZone.top, ...yPages, printZone.bottom + 1];

    const pages: PagePrintInfo[] = [];

    for (let x = 0; x < xBreaks.length - 1; x++) {
      for (let y = 0; y < yBreaks.length - 1; y++) {
        pages.push({
          sheetId,
          zone: {
            left: xBreaks[x],
            top: yBreaks[y],
            right: xBreaks[x + 1] - 1,
            bottom: yBreaks[y + 1] - 1,
          },
        });
      }
    }

    // return pages;

    // ADRM TODO: handle all pages empty
    const nonEmptyPages = pages.filter((page) => this.pageHasContent(page));
    // console.log(
    //   "split",
    //   nonEmptyPages.map((p) => p.sheetId + "!" + zoneToXc(p.zone))
    // );
    return nonEmptyPages;
  }

  onPrint() {
    window.print();
    this.props.onExitPrintMode();
  }

  getLastUsedHeaders(sheetId: UID): { lastUsedCol: number; lastUsedRow: number } {
    let lastUsedCol = 0;
    let lastUsedRow = 0;
    const sheetZone = this.env.model.getters.getSheetZone(sheetId);

    const evaluatedCells = this.env.model.getters.getEvaluatedCellsPositions(sheetId);
    for (const { col, row } of evaluatedCells) {
      lastUsedCol = Math.max(lastUsedCol, col);
      lastUsedRow = Math.max(lastUsedRow, row);
    }

    const zoneStyles = this.env.model.getters.getZoneStyles(sheetId, sheetZone);
    for (const { zone } of zoneStyles) {
      lastUsedCol = Math.max(lastUsedCol, zone.right ?? sheetZone.right);
      lastUsedRow = Math.max(lastUsedRow, zone.bottom ?? sheetZone.bottom);
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

  pageHasContent({ sheetId, zone }: PagePrintInfo): boolean {
    // if (zone.left === 0) return false; // ADRM TODO delete
    return (
      this.env.model.getters.getZoneStyles(sheetId, zone).length > 0 ||
      this.env.model.getters.getTablesOverlappingZones(sheetId, [zone]).length > 0 ||
      this.areThereFiguresInZone(sheetId, zone) ||
      this.env.model.getters
        .getEvaluatedCellsInZone(sheetId, zone)
        .some((cell) => cell.type !== CellValueType.empty)
    );
  }

  get pageDimensionsInPixels(): DOMDimension {
    const layout = PRINT_PAGES_LAYOUTS[this.state.pageLayout];
    const widthInPixels = Math.floor(layout.width * 3.78);
    const heightInPixels = Math.floor(layout.height * 3.78);
    return { width: widthInPixels, height: heightInPixels };
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

  /**
   * Print the page by spawning an iframe with all of the canvas of the page
   * and printing the iframe
   */
  printPageWithIframe() {
    // ADRM TODO: delete this
    // Create hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.top = "0";
    iframe.style.left = "0";
    // iframe.style.right = "0";
    // iframe.style.bottom = "0";
    // iframe.style.width = this.pageDimensionsInPixels.width + "px";
    // iframe.style.height = this.pageDimensionsInPixels.height + "px";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
      return;
    }

    const head = iframeDoc.head;

    // Optional title
    const title = iframeDoc.createElement("title");
    title.textContent = "Print";
    head.appendChild(title);

    // Optional styles
    const style = iframeDoc.createElement("style");
    style.textContent = `
      body { margin: 0; display: flex; flex-direction: column; align-items: center; }
      canvas { display: block; }
    `;
    head.appendChild(style);

    // Copy all canvases into the iframe
    const originalCanvases = document.querySelectorAll("canvas");

    originalCanvases.forEach((canvas) => {
      const clonedCanvas = iframeDoc.createElement("canvas");
      clonedCanvas.width = canvas.width;
      clonedCanvas.height = canvas.height;

      const ctx = clonedCanvas.getContext("2d")!;
      ctx.drawImage(canvas, 0, 0);

      iframeDoc.body.appendChild(clonedCanvas);
    });

    // Wait for rendering, then print
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // // Cleanup after printing
    // setTimeout(() => {
    //   document.body.removeChild(iframe);
    // }, 1000);
  }
}
