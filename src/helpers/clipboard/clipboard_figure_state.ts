import type {
  CommandDispatcher,
  Dimension,
  Figure,
  FigureSize,
  Getters,
  GridRenderingContext,
  HeaderIndex,
  UID,
  Zone,
} from "../../types";
import { CommandResult } from "../../types";
import type { Image } from "../../types/image";
import type { AbstractChart } from "../figures/charts";
import { deepCopy } from "../misc";
import { UuidGenerator } from "../uuid";
import type {
  ClipboardContent,
  ClipboardOperation,
  ClipboardOptions,
  ClipboardState,
} from "./../../types/clipboard";
import { ClipboardMIMEType } from "./../../types/clipboard";

/** State of the clipboard when copying/cutting figures */
export class ClipboardFigureState implements ClipboardState {
  readonly sheetId: UID;
  private readonly copiedFigure: Figure;
  private readonly copiedFigureContent: ClipboardFigureChart | ClipboardFigureImage;
  constructor(
    readonly operation: ClipboardOperation,
    private readonly getters: Getters,
    private readonly dispatch: CommandDispatcher["dispatch"]
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
    switch (figure.tag) {
      case "chart":
        this.copiedFigureContent = new ClipboardFigureChart(
          dispatch,
          getters,
          this.sheetId,
          copiedFigureId
        );
        break;
      case "image":
        this.copiedFigureContent = new ClipboardFigureImage(
          dispatch,
          getters,
          this.sheetId,
          copiedFigureId
        );
        break;
      default:
        throw new Error(`Unknow tag '${figure.tag}' for the given figure id: ${copiedFigureId}`);
        break;
    }
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
    const { width, height } = this.copiedFigure;
    const numCols = this.getters.getNumberCols(sheetId);
    const numRows = this.getters.getNumberRows(sheetId);
    const targetX = this.getters.getColDimensions(sheetId, target[0].left).start;
    const targetY = this.getters.getRowDimensions(sheetId, target[0].top).start;
    const maxX = this.getters.getColDimensions(sheetId, numCols - 1).end;
    const maxY = this.getters.getRowDimensions(sheetId, numRows - 1).end;
    const position = {
      x: maxX < width ? 0 : Math.min(targetX, maxX - width),
      y: maxY < height ? 0 : Math.min(targetY, maxY - height),
    };
    const newId = new UuidGenerator().uuidv4();
    this.copiedFigureContent.paste(sheetId, newId, position, { height, width });

    if (this.operation === "CUT") {
      this.dispatch("DELETE_FIGURE", {
        sheetId: this.copiedFigureContent.sheetId,
        id: this.copiedFigure.id,
      });
    }

    this.dispatch("SELECT_FIGURE", { id: newId });
  }

  getClipboardContent(): ClipboardContent {
    return { [ClipboardMIMEType.PlainText]: "\t" };
  }

  isColRowDirtyingClipboard(position: HeaderIndex, dimension: Dimension): boolean {
    return false;
  }

  drawClipboard(renderingContext: GridRenderingContext): void {}
}

export class ClipboardFigureChart {
  private readonly copiedChart: AbstractChart;

  constructor(
    private dispatch: CommandDispatcher["dispatch"],
    getters: Getters,
    readonly sheetId: UID,
    copiedFigureId: string
  ) {
    const chart = getters.getChart(copiedFigureId);
    if (!chart) {
      throw new Error(`No chart for the given id: ${copiedFigureId}`);
    }
    this.copiedChart = chart.copyInSheetId(sheetId);
  }

  paste(sheetId: UID, figureId: UID, position: { x: number; y: number }, size: FigureSize) {
    const copy = this.copiedChart.copyInSheetId(sheetId);
    this.dispatch("CREATE_CHART", {
      id: figureId,
      sheetId,
      position,
      size,
      definition: copy.getDefinition(),
    });
  }
}

export class ClipboardFigureImage {
  private readonly copiedImage: Image;

  constructor(
    private dispatch: CommandDispatcher["dispatch"],
    getters: Getters,
    readonly sheetId: UID,
    copiedFigureId: string
  ) {
    const image = getters.getImage(copiedFigureId);
    this.copiedImage = deepCopy(image);
  }

  paste(sheetId: UID, figureId: UID, position: { x: number; y: number }, size: FigureSize) {
    const copy = deepCopy(this.copiedImage);
    this.dispatch("CREATE_IMAGE", {
      figureId,
      sheetId,
      position,
      size,
      definition: copy,
    });
  }
}
