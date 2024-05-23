import { ClipboardHandler } from "../../clipboard_handlers/abstract_clipboard_handler";
import { DEFAULT_CELL_HEIGHT } from "../../constants";
import {
  UuidGenerator,
  compareZoneByWidth,
  getZoneArea,
  mergeContiguousZones,
  positionToZone,
  range,
  recomputeZones,
  zoneToDimension,
} from "../../helpers";
import { getClipboardDataPositions } from "../../helpers/clipboard/clipboard_helpers";
import { _t } from "../../translation";
import {
  CellValueType,
  Command,
  CommandResult,
  Dimension,
  Figure,
  HeaderIndex,
  Pixel,
  Position,
  UID,
  Zone,
} from "../../types/index";
import { UIPlugin } from "../ui_plugin";

const INSERT_BOTTOM_MARGIN = 2; // in number of rows

export const REORGANIZE_CONSTANTS = {
  /** Maximum width for reorganization of sheet */
  maxWidth: 1000,
  /** Min number of data points for a chart to be considered "large" */
  dataForLargeChart: 8,
  figureHeight: 240,
  smallFigureWidth: 475,
  smallFigureMargin: 50,
  figureBottomMargin: 20,
  scorecardsPerLine: 6,
  scorecardMargin: 10,
  clusterColsMargin: 1, // in number of columns
  clusterRowsMargin: 2, // in number of rows
};

interface FigureCategories {
  scorecards: Figure[];
  wideFigures: Figure[];
  smallFigures: Figure[];
}

interface Cluster {
  zone: Zone;
  numberOfCols: number;
  numberOfRows: number;
}

interface ClusterRow {
  clusters: Cluster[];
  numberOfRows: number;
  rowOffset: number;
}

export class ReorganizeSheetPlugin extends UIPlugin {
  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "SEND_FIGURE_TO_SHEET":
        const sheetId = this.getters.getActiveSheetId();
        if (!this.getters.getFigure(sheetId, cmd.figureId)) {
          return CommandResult.FigureDoesNotExist;
        }
    }
    return CommandResult.Success;
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SEND_FIGURE_TO_SHEET": {
        const sheetId = this.getSheetToSendItemTo(cmd.sheetId);
        this.sendFigureToSheet(cmd.figureId, sheetId);
        break;
      }
      case "SEND_SELECTION_TO_SHEET": {
        const sheetId = this.getSheetToSendItemTo(cmd.sheetId);
        this.sendSelectionToSheet(sheetId);
        break;
      }
      case "REORGANIZE_SHEET":
        this.reorganizeSheet();
        break;
    }
  }

  private getSheetToSendItemTo(sheetId?: UID): UID {
    if (sheetId) {
      return sheetId;
    }
    const position = this.getters.getSheetIds().length;
    const newSheetId = new UuidGenerator().uuidv4();
    const name = this.getters.getNextSheetName(_t("Sheet"));

    this.dispatch("CREATE_SHEET", { sheetId: newSheetId, position, name });
    return newSheetId;
  }

  private sendFigureToSheet(figureId: UID, targetSheet: UID) {
    const originSheet = this.getters.getActiveSheetId();
    const figure = this.getters.getFigure(originSheet, figureId);
    if (!figure) {
      return;
    }
    const position = this.getPositionToInsertElement(targetSheet);

    let copiedData = {};
    for (const handler of this.figureClipboardHandlers) {
      const data = handler.copy({ figureId, sheetId: originSheet });
      copiedData = { ...copiedData, ...data };
    }
    this.pasteToTarget(copiedData, this.figureClipboardHandlers, targetSheet, position);
  }

  private pasteToTarget(
    copiedData: any,
    handlers: ClipboardHandler<any>[],
    sheetId: UID,
    target: Position
  ) {
    const clipboardOptions = { isCutOperation: true };
    const { pasteTarget, zoneAffectedByPaste } = this.getters.getPasteTarget(
      handlers,
      copiedData,
      { zones: [positionToZone(target)], sheetId },
      clipboardOptions
    );
    if (zoneAffectedByPaste !== undefined) {
      this.dispatch("EXPAND_SHEET_FOR_ZONE", {
        sheetId,
        targetZone: zoneAffectedByPaste,
      });
    }
    for (const handler of handlers) {
      handler.paste(pasteTarget, copiedData, clipboardOptions);
    }
    return pasteTarget;
  }

  private sendSelectionToSheet(targetSheet: UID) {
    const selection = this.getters.getSelectedZone();

    const position = this.getPositionToInsertElement(targetSheet);

    const data = this.copyZone(this.getters.getActiveSheetId(), selection);
    this.pasteToTarget(data, this.cellClipboardHandlers, targetSheet, position);

    const table = this.getters.getTable(this.getters.getActivePosition());
    if (!table) {
      const tableZone = {
        top: position.row,
        left: position.col,
        bottom: position.row + selection.bottom - selection.top,
        right: position.col + selection.right - selection.left,
      };
      this.dispatch("CREATE_TABLE", {
        sheetId: targetSheet,
        tableType: "static",
        ranges: [this.getters.getRangeDataFromZone(targetSheet, tableZone)],
      });
    }
  }

  /**
   * Get the last row with some cell content, or a merge, or a table, or borders.
   */
  private getBottomMostCellRow(sheetId: UID): number | undefined {
    let bottomMostRow = -1;

    for (const position of this.getters.getEvaluatedCellsPositions(sheetId)) {
      const cell = this.getters.getEvaluatedCell(position);
      if (cell.type === CellValueType.empty) {
        continue;
      }
      bottomMostRow = Math.max(bottomMostRow, position.row);
    }
    for (const table of this.getters.getTables(sheetId)) {
      const tableZone = table.range.zone;
      bottomMostRow = Math.max(bottomMostRow, tableZone.bottom);
    }
    for (const merge of this.getters.getMerges(sheetId)) {
      bottomMostRow = Math.max(bottomMostRow, merge.bottom);
    }

    for (let row = bottomMostRow + 1; row < this.getters.getNumberRows(sheetId); row++) {
      for (let col = 0; col < this.getters.getNumberCols(sheetId); col++) {
        const borders = this.getters.getCellBorder({ col, row, sheetId });
        if (borders) {
          bottomMostRow = row;
          break;
        }
      }
    }

    return bottomMostRow === -1 ? undefined : bottomMostRow;
  }

  private getBottomMostFigure(sheetId: UID): Figure | undefined {
    let bottomRightMostFigure: Figure | undefined = undefined;
    for (const figure of this.getters.getFigures(sheetId)) {
      if (!bottomRightMostFigure) {
        bottomRightMostFigure = figure;
        continue;
      }
      const maxBottom = bottomRightMostFigure.y + bottomRightMostFigure.height;

      const bottom = figure.y + figure.height;
      if (bottom > maxBottom) {
        bottomRightMostFigure = figure;
      }
    }

    return bottomRightMostFigure;
  }

  /**
   * Get the next position to insert an element (range or figure). The position should be below
   * all the existing figures and cells of the sheet, plus a margin.
   *
   * Create new rows at the bottom of the sheet if there is not enough space to insert an element.
   */
  private getPositionToInsertElement(sheetId: UID): Position {
    let position = this.getBottomMostUsedPosition(sheetId);
    if (!position) {
      position = { col: 0, row: 0 };
    } else {
      position.row += INSERT_BOTTOM_MARGIN;
    }

    this.dispatch("EXPAND_SHEET_FOR_ZONE", { sheetId, targetZone: positionToZone(position) });
    return position;
  }

  private getBottomMostUsedPosition(sheetId: UID): Position | undefined {
    const bottomMostCellRow = this.getBottomMostCellRow(sheetId);
    const bottomMostFigure = this.getBottomMostFigure(sheetId);

    if (!bottomMostFigure) {
      return bottomMostCellRow ? { row: bottomMostCellRow, col: 0 } : undefined;
    }

    const figureBottom = bottomMostFigure.y + bottomMostFigure.height;
    const figureBottomRow = this.getHeaderAtPosition(sheetId, "ROW", figureBottom);

    if (!bottomMostCellRow) {
      return { row: figureBottomRow, col: 0 };
    }

    if (bottomMostCellRow > figureBottomRow) {
      return { row: bottomMostCellRow, col: 0 };
    }

    return { row: figureBottomRow, col: 0 };
  }

  private reorganizeSheet() {
    const sheetId = this.getters.getActiveSheetId();

    const { figures, lastY } = this.getReorganizedFigures(sheetId);
    const maxCol = this.getHeaderAtPosition(sheetId, "COL", REORGANIZE_CONSTANTS.maxWidth);

    const clusterRows = this.getReorganizedClusters(sheetId, maxCol);

    const figuresEndRow = this.getHeaderAtPosition(sheetId, "ROW", lastY);
    const startRowOfClusters = figuresEndRow
      ? figuresEndRow + REORGANIZE_CONSTANTS.clusterRowsMargin
      : 0;
    this.applyReorganization(sheetId, figures, startRowOfClusters, clusterRows);
  }

  private applyReorganization(
    originSheet: UID,
    reorganizedFigures: Figure[],
    startRowOfClusters: HeaderIndex,
    clusterRows: ClusterRow[]
  ) {
    const lastClusterRow = clusterRows[clusterRows.length - 1];
    let height = startRowOfClusters;
    if (lastClusterRow) {
      height += lastClusterRow.rowOffset + lastClusterRow!.numberOfRows;
    }
    const numberOfRows = this.getters.getNumberRows(originSheet);
    const rowsToInsert = Math.max(Math.max(numberOfRows, startRowOfClusters + height) + 2); // +2 to have some margin and avoid for example expanding tables
    this.insertEmptyRowsAtBottom(originSheet, rowsToInsert);

    for (const reorganizedFigure of reorganizedFigures) {
      this.moveFigure(originSheet, originSheet, reorganizedFigure);
    }

    for (const clusterRow of clusterRows) {
      let currentCol = 0;
      const row = numberOfRows + 2 + startRowOfClusters + clusterRow.rowOffset;
      for (const cluster of clusterRow.clusters) {
        this.moveCluster(originSheet, originSheet, cluster, { col: currentCol, row });
        currentCol += cluster.numberOfCols + REORGANIZE_CONSTANTS.clusterColsMargin;
      }
    }

    const numberOfCols = this.getters.getNumberCols(originSheet);
    // Move ranges to avoid formulas becoming #REF on the removed rows
    this.dispatch("MOVE_RANGES", {
      // TODO: replace with MOVE_REFERENCES once it's merged
      sheetId: originSheet,
      target: [{ left: 0, top: 0, right: numberOfCols - 1, bottom: numberOfRows + 1 }],
      targetSheetId: originSheet,
      col: 0,
      row: numberOfRows + 2,
    });

    this.dispatch("REMOVE_COLUMNS_ROWS", {
      sheetId: originSheet,
      dimension: "ROW",
      elements: range(0, numberOfRows + 2),
    });
  }

  private insertEmptyRowsAtBottom(sheetId: UID, rowsToAdd: number) {
    const numberOfRows = this.getters.getNumberRows(sheetId);
    this.dispatch("ADD_COLUMNS_ROWS", {
      sheetId,
      position: "after",
      base: numberOfRows - 1,
      quantity: rowsToAdd,
      dimension: "ROW",
    });
    const bottomZone = {
      left: 0,
      right: this.getters.getNumberCols(sheetId) - 1,
      top: numberOfRows - 1,
      bottom: numberOfRows + rowsToAdd - 1,
    };
    this.dispatch("CLEAR_FORMATTING", { sheetId, target: [bottomZone] });
    this.dispatch("RESIZE_COLUMNS_ROWS", {
      dimension: "ROW",
      sheetId,
      size: DEFAULT_CELL_HEIGHT,
      elements: range(numberOfRows, numberOfRows + rowsToAdd),
    });
  }

  /**
   * Reorganize the figures at the top of the sheet. Return the Y coordinate of the bottom of
   * the last figure plus a margin
   */
  private getReorganizedFigures(sheetId: UID): { figures: Figure[]; lastY: Pixel } {
    const figures = this.getFiguresByCategory(sheetId);
    let { figures: reorganizedFigures, lastY: currentY } = this.getReorganizedScorecards(
      figures.scorecards
    );

    for (const wideFigure of figures.wideFigures) {
      const height = REORGANIZE_CONSTANTS.figureHeight;
      const width = REORGANIZE_CONSTANTS.maxWidth;
      reorganizedFigures.push({ ...wideFigure, x: 0, y: currentY, width, height });
      currentY += REORGANIZE_CONSTANTS.figureHeight + REORGANIZE_CONSTANTS.figureBottomMargin;
    }

    for (let i = 0; i < figures.smallFigures.length; i++) {
      const smallFigure = figures.smallFigures[i];
      const isLastFigure = i === figures.smallFigures.length - 1;
      const x =
        i % 2 === 0
          ? 0
          : REORGANIZE_CONSTANTS.smallFigureWidth + REORGANIZE_CONSTANTS.smallFigureMargin;
      const width =
        isLastFigure && i % 2 === 0
          ? REORGANIZE_CONSTANTS.maxWidth
          : REORGANIZE_CONSTANTS.smallFigureWidth;
      const height = REORGANIZE_CONSTANTS.figureHeight;

      reorganizedFigures.push({ ...smallFigure, x, y: currentY, width, height });

      if (i % 2 === 1 || i === figures.smallFigures.length - 1) {
        currentY += REORGANIZE_CONSTANTS.figureHeight + REORGANIZE_CONSTANTS.figureBottomMargin;
      }
    }

    return { figures: reorganizedFigures, lastY: currentY };
  }

  /**
   * Reorganize given scorecards at the top of the sheet. Return the Y coordinate of the bottom of
   * the last scorecard plus a margin
   */
  private getReorganizedScorecards(scorecards: Figure[]): { figures: Figure[]; lastY: Pixel } {
    let currentY = 0;
    const lines = Math.ceil(scorecards.length / REORGANIZE_CONSTANTS.scorecardsPerLine);

    const reorganizedScorecards: Figure[] = [];
    for (let line = 0; line < lines; line++) {
      const figures = scorecards.slice(
        line * REORGANIZE_CONSTANTS.scorecardsPerLine,
        (line + 1) * REORGANIZE_CONSTANTS.scorecardsPerLine
      );

      const totalMargin = REORGANIZE_CONSTANTS.scorecardMargin * (figures.length - 1);
      const width = (REORGANIZE_CONSTANTS.maxWidth - totalMargin) / figures.length;
      const height = REORGANIZE_CONSTANTS.figureHeight / 2;

      let currentX = 0;
      for (const figure of figures) {
        reorganizedScorecards.push({ ...figure, x: currentX, y: currentY, width, height });
        currentX += width + REORGANIZE_CONSTANTS.scorecardMargin;
      }

      currentY += REORGANIZE_CONSTANTS.figureHeight / 2 + REORGANIZE_CONSTANTS.figureBottomMargin;
    }
    return { figures: reorganizedScorecards, lastY: currentY };
  }

  private moveFigure(originSheet: UID, targetSheet: UID, figure: Figure) {
    let copiedFigureData = {};
    const handlers = this.figureClipboardHandlers;
    for (const handler of handlers) {
      const data = handler.copy({ figureId: figure.id, sheetId: originSheet });
      copiedFigureData = { ...copiedFigureData, ...data };
    }
    const pastePosition = { col: 0, row: 0 };
    const { figureId } = this.pasteToTarget(copiedFigureData, handlers, targetSheet, pastePosition);
    if (!figureId) {
      throw new Error("Figure not pasted correctly");
    }
    this.dispatch("UPDATE_FIGURE", {
      sheetId: targetSheet,
      ...figure,
      id: figureId,
    });
  }

  private getFiguresByCategory(sheetId: UID): FigureCategories {
    const categories: FigureCategories = {
      scorecards: [],
      wideFigures: [],
      smallFigures: [],
    };
    const figures = this.getters.getFigures(sheetId);
    for (const figure of figures) {
      if (figure.tag === "image") {
        categories.smallFigures.push(figure);
        continue;
      }

      const chart = this.getters.getChart(figure.id);
      if (!chart) {
        continue;
      }
      if (chart.type === "scorecard") {
        categories.scorecards.push(figure);
        continue;
      }

      const chartRange = chart.getContextCreation().range?.[0]?.dataRange;
      if (
        chartRange &&
        getZoneArea(this.getters.getRangeFromSheetXC(sheetId, chartRange).zone) >
          REORGANIZE_CONSTANTS.dataForLargeChart
      ) {
        categories.wideFigures.push(figure);
      } else {
        categories.smallFigures.push(figure);
      }
    }
    return categories;
  }

  private getReorganizedClusters(originSheet: UID, maxCol: HeaderIndex): ClusterRow[] {
    const clusters = this.createClusters(originSheet);
    if (!clusters.length) {
      return [];
    }
    return this.splitClustersInRows(clusters, maxCol);
  }

  private moveCluster(originSheet: UID, targetSheet: UID, cluster: Cluster, target: Position) {
    const data = this.copyZone(originSheet, cluster.zone);
    this.pasteToTarget(data, this.cellClipboardHandlers, targetSheet, target);
  }

  private createClusters(sheetId: UID): Cluster[] {
    const cellZones: Zone[] = [];
    for (let col = 0; col < this.getters.getNumberCols(sheetId); col++) {
      for (let row = 0; row < this.getters.getNumberRows(sheetId); row++) {
        const position = { sheetId, col, row };
        const cell = this.getters.getCell(position);
        const evaluatedCell = this.getters.getEvaluatedCell(position);

        if (
          cell?.content ||
          cell?.style?.fillColor || // Only check fillColor because that's the only style that is visible on an empty cell
          evaluatedCell.type !== CellValueType.empty
        ) {
          cellZones.push(positionToZone(position));
        }
      }
    }
    const tableZones = this.getters.getTables(sheetId).map((table) => table.range.zone);
    const merges = this.getters.getMerges(sheetId);

    let clustersZones = recomputeZones([...tableZones, ...cellZones, ...merges], []);
    clustersZones = mergeContiguousZones(clustersZones).sort(compareZoneByWidth);

    return clustersZones.map((zone) => ({ zone, ...zoneToDimension(zone) }));
  }

  private copyZone(sheetId: UID, zone: Zone) {
    let copiedData = {};
    const clipboardData = getClipboardDataPositions(sheetId, [zone]);
    for (const handler of this.cellClipboardHandlers) {
      const data = handler.copy(clipboardData);
      copiedData = { ...copiedData, ...data };
    }
    return copiedData;
  }

  /**
   * Get the header at the given position. Add headers to the sheet if the position is below/right
   * of the sheet.
   **/
  private getHeaderAtPosition(sheetId: UID, dim: Dimension, position: Pixel): HeaderIndex {
    let headerIndex = this.getters.getHeaderAtPosition(sheetId, dim, position);
    if (headerIndex !== undefined) {
      return headerIndex;
    }
    const quantity = this.getters.getHeadersToAddForPositionToBeInSheet(sheetId, dim, position);
    this.dispatch("ADD_COLUMNS_ROWS", {
      sheetId,
      position: "after",
      base: this.getters.getNumberHeaders(sheetId, dim) - 1,
      quantity,
      dimension: dim,
      emptyNewHeaders: true,
    });

    headerIndex = this.getters.getHeaderAtPosition(sheetId, dim, position);
    if (headerIndex === undefined) {
      throw new Error(`Position ${position} not found in sheet ${sheetId}`);
    }

    return headerIndex;
  }

  private splitClustersInRows(clusters: Cluster[], maxCol: HeaderIndex): ClusterRow[] {
    let currentRow = 0;
    const clusterRows: (ClusterRow & { lastCol: number })[] = [];
    for (const cluster of clusters) {
      const lastClusterRow = clusterRows[clusterRows.length - 1];
      if (!lastClusterRow) {
        clusterRows.push({
          numberOfRows: cluster.numberOfRows,
          clusters: [cluster],
          lastCol: cluster.numberOfCols + REORGANIZE_CONSTANTS.clusterColsMargin,
          rowOffset: currentRow,
        });
        continue;
      }
      if (lastClusterRow.lastCol + cluster.numberOfCols <= maxCol) {
        lastClusterRow.clusters.push(cluster);
        lastClusterRow.lastCol += cluster.numberOfCols + REORGANIZE_CONSTANTS.clusterColsMargin;
        lastClusterRow.numberOfRows = Math.max(lastClusterRow.numberOfRows, cluster.numberOfRows);
      } else {
        currentRow += lastClusterRow.numberOfRows + REORGANIZE_CONSTANTS.clusterRowsMargin;
        clusterRows.push({
          numberOfRows: cluster.numberOfRows,
          clusters: [cluster],
          lastCol: cluster.numberOfCols + REORGANIZE_CONSTANTS.clusterColsMargin,
          rowOffset: currentRow,
        });
      }
    }

    return clusterRows;
  }

  get figureClipboardHandlers() {
    return this.getters.getFigureClipboardHandlers();
  }

  get cellClipboardHandlers() {
    return this.getters.getCellClipboardHandlers();
  }
}
