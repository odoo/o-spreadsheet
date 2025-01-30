import {
  CommandDispatcher,
  CommandResult,
  Dimension,
  Figure,
  Getters,
  GridRenderingContext,
  HeaderIndex,
  UID,
  Zone,
} from "../../types";
import { AbstractChart } from "../charts";
import { UuidGenerator } from "../uuid";
import { ClipboardOperation, ClipboardOptions, ClipboardState } from "./../../types/clipboard";

/** State of the clipboard when copying/cutting figures */
export class ClipboardFigureState implements ClipboardState {
  readonly operation: ClipboardOperation;
  readonly sheetId: UID;

  private readonly copiedFigure: Figure;
  private readonly copiedChart: AbstractChart;

  constructor(
    operation: ClipboardOperation,
    private getters: Getters,
    private dispatch: CommandDispatcher["dispatch"]
  ) {
    this.sheetId = getters.getActiveSheetId();
    const copiedFigureId = getters.getSelectedFigureId();
    if (!copiedFigureId) {
      throw new Error(`No figure selected`);
    }
    const figure = getters.getFigure(this.sheetId, copiedFigureId);
    if (!figure) {
      throw new Error(`No figure for the given id: ${copiedFigureId}`);
    }
    this.copiedFigure = { ...figure };
    const chart = getters.getChart(copiedFigureId);
    if (!chart) {
      throw new Error(`No chart for the given id: ${copiedFigureId}`);
    }
    this.copiedChart = chart.copyInSheetId(this.sheetId);
    this.operation = operation;
  }

  isCutAllowed(target: Zone[]): CommandResult {
    return CommandResult.Success;
  }

  isPasteAllowed(target: Zone[], option?: ClipboardOptions): CommandResult {
    if (target.length === 0) {
      return CommandResult.EmptyTarget;
    }
    if (option?.pasteOption !== undefined) {
      return CommandResult.WrongFigurePasteOption;
    }
    return CommandResult.Success;
  }

  /**
   * Paste the clipboard content in the given target
   */
  paste(target: Zone[]) {
    const sheetId = this.getters.getActiveSheetId();

    const position = {
      x: this.getters.getColDimensions(sheetId, target[0].left).start,
      y: this.getters.getRowDimensions(sheetId, target[0].top).start,
    };

    const newChart = this.copiedChart.copyInSheetId(sheetId);
    const newId = new UuidGenerator().smallUuid();

    this.dispatch("CREATE_CHART", {
      id: newId,
      sheetId,
      position,
      size: { height: this.copiedFigure.height, width: this.copiedFigure.width },
      definition: newChart.getDefinition(),
    });

    if (this.operation === "CUT") {
      this.dispatch("DELETE_FIGURE", {
        sheetId: this.copiedChart.sheetId,
        id: this.copiedFigure.id,
      });
    }

    this.dispatch("SELECT_FIGURE", { id: newId });
  }

  getClipboardContent() {
    return "\t";
  }

  isColRowDirtyingClipboard(position: HeaderIndex, dimension: Dimension): boolean {
    return false;
  }

  drawClipboard(renderingContext: GridRenderingContext): void {}
}
