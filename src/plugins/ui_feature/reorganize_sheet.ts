import { clipboardHandlersRegistries } from "../../clipboard_handlers";
import { ClipboardHandler } from "../../clipboard_handlers/abstract_clipboard_handler";
import {
  UuidGenerator,
  getZoneArea,
  mergeContiguousZones,
  positionToZone,
  recomputeZones,
  zoneToDimension,
  zoneToXc,
} from "../../helpers";
import { getClipboardDataPositions } from "../../helpers/clipboard/clipboard_helpers";
import {
  AnchorZone,
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
import { UIPlugin, UIPluginConfig } from "../ui_plugin";

const INSERT_BOTTOM_MARGIN = 2; // in number of rows

//ADRM TODO: send to sheet: manage borders
//ADRM TODO: reorganize: create new sheet rather than new rows
// ADRM TODO: move ranges or clipboard with core tables ?
// ADRM TODO: remove useless sheetname in references in copy/paste

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
  cellClipboardHandlers: ClipboardHandler<any>[];
  figureClipboardHandlers: ClipboardHandler<any>[];

  constructor(config: UIPluginConfig) {
    super(config);
    this.cellClipboardHandlers = clipboardHandlersRegistries.cellHandlers
      .getAll()
      .map((handler) => new handler(this.getters, this.dispatch));

    this.figureClipboardHandlers = clipboardHandlersRegistries.figureHandlers
      .getAll()
      .map((handler) => new handler(this.getters, this.dispatch));
  }

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
      case "SEND_FIGURE_TO_SHEET":
        this.sendFigureToSheet(cmd.figureId, cmd.sheetId);
        break;
      case "SEND_SELECTION_TO_SHEET":
        this.sendSelectionToSheet(cmd.sheetId);
        break;
      case "REORGANIZE_SHEET":
        this.reorganizeSheet();
        break;
    }
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

  private getBottomRightMostCell(sheetId: UID): Position | undefined {
    let bottom = -1;
    let right = -1;
    const updateMax = (col: number, row: number) => {
      bottom = Math.max(bottom, row);
      right = Math.max(right, col);
    };
    for (const position of this.getters.getEvaluatedCellsPositions(sheetId)) {
      const cell = this.getters.getEvaluatedCell(position);
      if (cell.type === CellValueType.empty) {
        continue;
      }
      updateMax(position.col, position.row);
    }
    for (const table of this.getters.getTables(sheetId)) {
      const tableZone = table.range.zone;
      updateMax(tableZone.right, tableZone.bottom);
    }
    for (const merge of this.getters.getMerges(sheetId)) {
      updateMax(merge.right, merge.bottom);
    }
    return bottom === -1 || right === -1 ? undefined : { col: right, row: bottom };
  }

  private getBottomRightMostFigure(sheetId: UID): Figure | undefined {
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
    const bottomMostCell = this.getBottomRightMostCell(sheetId);
    const bottomMostFigure = this.getBottomRightMostFigure(sheetId);

    if (!bottomMostFigure) {
      return bottomMostCell ? { row: bottomMostCell.row, col: 0 } : undefined;
    }

    const figureBottom = bottomMostFigure.y + bottomMostFigure.height;
    const figureBottomRow = this.getHeaderAtPosition(sheetId, "ROW", figureBottom);

    if (!bottomMostCell) {
      return { row: figureBottomRow, col: 0 };
    }

    if (bottomMostCell.row > figureBottomRow) {
      return { row: bottomMostCell.row, col: 0 };
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
    const targetSheet = new UuidGenerator().uuidv4();
    const originSheetPosition = this.getters.getSheetIds().findIndex((id) => id === originSheet);
    this.dispatch("CREATE_SHEET", { sheetId: targetSheet, position: originSheetPosition });

    for (const reorganizedFigure of reorganizedFigures) {
      this.moveFigure(originSheet, targetSheet, reorganizedFigure);
    }

    for (const clusterRow of clusterRows) {
      let currentCol = 0;
      const row = startRowOfClusters + clusterRow.rowOffset;
      for (const cluster of clusterRow.clusters) {
        this.moveCluster(originSheet, targetSheet, cluster, { col: currentCol, row });
        currentCol += cluster.numberOfCols + REORGANIZE_CONSTANTS.clusterColsMargin;
      }
    }

    const sheetName = this.getters.getSheetName(originSheet);
    this.cleanupFormulas(originSheet, targetSheet);
    this.dispatch("DELETE_SHEET", { sheetId: originSheet });
    this.dispatch("RENAME_SHEET", { sheetId: targetSheet, name: sheetName });
    this.dispatch("ACTIVATE_SHEET", {
      sheetIdTo: targetSheet,
      sheetIdFrom: this.getters.getActiveSheetId(),
    });
  }

  /**
   * Because of the cut/pastes to another sheet during reorganization, some references `=A1` may have
   * become `='CurrentSheetName'!A1`. This method removes the useless sheet name from the references.
   *
   * Also the references empty cells not in a cluster need to be switched to references to the new sheet, otherwise
   * they will be deleted on the deletion of the original sheet. This can be done with a MOVE_REFERENCES moving all the
   * references of the old sheet to the new sheet.
   */
  private cleanupFormulas(originSheetId: UID, targetSheetId: UID) {
    const originSheetZone = this.getters.getSheetZone(originSheetId);
    this.dispatch("MOVE_REFERENCES", {
      sheetId: originSheetId,
      zone: originSheetZone,
      targetSheetId,
      targetCol: 0,
      targetRow: 0,
    });

    const targetSheetName = this.getters.getSheetName(targetSheetId);
    const targetSheetNameRegex = new RegExp(`'?${targetSheetName}'?!`, "g");

    const cells = this.getters.getCells(targetSheetId);
    for (const cellId in cells) {
      const cell = cells[cellId];
      if (!cell.isFormula) {
        continue;
      }

      let newContent = "";
      const tokens = cell.compiledFormula.tokens;
      for (const token of tokens) {
        if (token.type === "REFERENCE" && targetSheetNameRegex.test(token.value)) {
          newContent += token.value.replace(targetSheetNameRegex, "");
        } else {
          newContent += token.value;
        }
      }
      if (newContent !== cell.content) {
        const cellPosition = this.getters.getCellPosition(cellId);
        this.dispatch("UPDATE_CELL", { ...cellPosition, content: newContent });
      }
    }
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
    const result = this.dispatch("UPDATE_FIGURE", {
      sheetId: targetSheet,
      ...figure,
      id: figureId,
    });
    console.log(result);
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

      const chartRange = chart.getContextCreation().range?.[0];
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
    // console.log({
    //   clusters: toPrintableZone(deepCopy(clusters)),
    //   clusterRows: toPrintableZone(deepCopy(clusterRows)),
    //   maxCol,
    // });

    // // const clusterZones = clusters.map((cluster) => cluster.zone);
    // // this.dispatch("DELETE_CONTENT", { sheetId, target: clusterZones });

    // const bottomMostCell = this.getBottomRightMostCell(sheetId) || { col: 0, row: 0 };
    // const neededHeight = clusterRows.at(-1)!.rowOffset + clusterRows.at(-1)!.numberOfRows;
    // const currentHeight = bottomMostCell.row + 1;
    // const height = Math.max(neededHeight, currentHeight) + 1;
    // console.log("height", height);
    // this.dispatch("ADD_COLUMNS_ROWS", {
    //   sheetId,
    //   position: "after",
    //   base: bottomMostCell.row + 1,
    //   dimension: "ROW",
    //   quantity: height,
    // });

    // for (const clusterRow of clusterRows) {
    //   let currentCol = 0;
    //   const row = bottomMostCell.row + 1 + clusterRow.rowOffset;
    //   for (const cluster of clusterRow.clusters) {
    //     this.pasteCluster(cluster, sheetId, { col: currentCol, row });
    //     currentCol += cluster.numberOfCols + REORGANIZE_CONSTANTS.clusterColsMargin;
    //   }
    // }

    // this.dispatch("REMOVE_COLUMNS_ROWS", {
    //   sheetId,
    //   dimension: "ROW",
    //   elements: range(0, bottomMostCell.row + 1 - startingRow),
    // });
  }

  private moveCluster(originSheet: UID, targetSheet: UID, cluster: Cluster, target: Position) {
    console.log("cut from ", zoneToXc(cluster.zone), " to ", zoneToXc(positionToZone(target)));
    const data = this.copyZone(originSheet, cluster.zone);
    this.pasteToTarget(data, this.cellClipboardHandlers, targetSheet, target);
  }

  private createClusters(sheetId: UID): Cluster[] {
    const tableZones = this.getters.getTables(sheetId).map((table) => table.range.zone);
    const merges = this.getters.getMerges(sheetId);
    // const evaluatedCellZones = this.getters.getEvaluatedCellsPositions(sheetId).map(positionToZone);
    // const cellZones = Object.values(this.getters.getCells(sheetId))
    //   .filter((cell) => cell.content || cell.style)
    //   .map((cell) => positionToZone(this.getters.getCellPosition(cell.id)));

    // const boders = this.getters.getB
    const cellZones: Zone[] = [];

    const numberOfCols = this.getters.getNumberCols(sheetId);
    const numberOdRows = this.getters.getNumberRows(sheetId);
    for (let col = 0; col < numberOfCols; col++) {
      for (let row = 0; row < numberOdRows; row++) {
        const position = { sheetId, col, row };
        const cell = this.getters.getCell(position);
        // const border = this.getters.getCellBorder(position);
        const evaluatedCell = this.getters.getEvaluatedCell(position);

        if (
          cell?.content ||
          evaluatedCell.value
          // !isObjectEmptyRecursive(cell?.style) ||
          // border ||
          // evaluatedCell.type !== CellValueType.empty
        ) {
          cellZones.push(positionToZone(position));
        }
      }
    }

    let clustersZones = recomputeZones([...tableZones, ...cellZones, ...merges], []) as Zone[]; // ADRM TODO
    console.log(clustersZones.map(zoneToXc));
    clustersZones = mergeContiguousZones(clustersZones).sort(sortWidestZone);
    console.log(clustersZones.map(zoneToXc));

    return clustersZones.map((zone) => ({
      zone,
      ...zoneToDimension(zone),
    }));
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
      const lastClusterRow = clusterRows.at(-1);
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
}

// ADMR TODO move this
export function zoneToAnchor(zone: Zone): AnchorZone {
  return {
    zone,
    cell: { col: zone.left, row: zone.top },
  };
}

// ADMR TODO move this
export function sortWidestZone(zone1: Zone, zone2: Zone) {
  const widtHDiff = zone2.right - zone2.left - (zone1.right - zone1.left);
  if (widtHDiff) {
    return widtHDiff;
  }
  const heightDiff = zone2.bottom - zone2.top - (zone1.bottom - zone1.top);
  if (heightDiff) {
    return heightDiff;
  }
  return zone1.top - zone2.top || zone1.left - zone2.left;
}

// ADRM TODO delete this
export function toPrintableZone(obj: any) {
  for (const key in obj) {
    if (typeof obj[key] === "object" && key === "zone") {
      obj[key] = zoneToXc(obj[key]);
    } else if (typeof obj[key] === "object") {
      toPrintableZone(obj[key]);
    }
  }
  return obj;
}
