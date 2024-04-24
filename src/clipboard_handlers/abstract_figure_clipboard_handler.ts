import { UuidGenerator } from "../helpers";
import {
  ClipboardFigureData,
  ClipboardOptions,
  ClipboardPasteTarget,
  CommandResult,
  DOMCoordinates,
  Figure,
  FigureSize,
  UID,
  Zone,
} from "../types";
import { ClipboardHandler } from "./abstract_clipboard_handler";

export type FigureClipboardContent = {
  sheetId: UID;
  figureId: UID;
  copiedFigure?: Figure;
};

export class AbstractFigureClipboardHandler<
  T extends FigureClipboardContent
> extends ClipboardHandler<T> {
  copy(data: ClipboardFigureData): T | undefined {
    return;
  }

  getPasteTarget(
    targetZones: Zone[],
    content: FigureClipboardContent,
    options?: ClipboardOptions
  ): ClipboardPasteTarget {
    if (!content?.copiedFigure) {
      return { zones: [] };
    }
    const target = targetZones[0];
    const sheetId = this.getters.getActiveSheetId();

    const topInPixel = this.getters.getRowDimensions(sheetId, target.top).start;
    let bottom = this.getters.getRowAtPosition(sheetId, topInPixel + content.copiedFigure.height);
    if (!bottom) {
      const missingRows = this.getters.getHeadersToAddForPositionToBeInSheet(
        sheetId,
        "ROW",
        topInPixel + content.copiedFigure.height
      );
      bottom = this.getters.getNumberRows(sheetId) - 1 + missingRows;
    }

    const leftInPixel = this.getters.getColDimensions(sheetId, target.left).start;
    let right = this.getters.getColAtPosition(sheetId, leftInPixel + content.copiedFigure.width);
    if (!right) {
      const missingCols = this.getters.getHeadersToAddForPositionToBeInSheet(
        sheetId,
        "COL",
        leftInPixel + content.copiedFigure.width
      );
      right = this.getters.getNumberCols(sheetId) - 1 + missingCols;
    }

    return {
      zones: [{ left: target.left, top: target.top, right, bottom }],
      figureId: new UuidGenerator().uuidv4(),
    };
  }

  paste(
    target: ClipboardPasteTarget,
    clippedContent: FigureClipboardContent,
    options: ClipboardOptions
  ) {
    if (!clippedContent?.copiedFigure || !target.figureId) {
      return;
    }
    const { zones, figureId } = target;
    const { width, height } = clippedContent.copiedFigure;
    const sheetId = this.getters.getActiveSheetId();
    const targetX = this.getters.getColDimensions(sheetId, zones[0].left).start;
    const targetY = this.getters.getRowDimensions(sheetId, zones[0].top).start;
    const position = { x: targetX, y: targetY };

    this.pasteFigure(sheetId, clippedContent, figureId, position, { height, width });

    if (options?.isCutOperation) {
      this.dispatch("DELETE_FIGURE", {
        sheetId: clippedContent.sheetId,
        id: clippedContent.copiedFigure.id,
      });
    }
  }

  isPasteAllowed(
    sheetId: UID,
    target: Zone[],
    content: FigureClipboardContent,
    option?: ClipboardOptions
  ) {
    if (target.length === 0) {
      return CommandResult.EmptyTarget;
    }
    if (option?.pasteOption !== undefined) {
      return CommandResult.WrongFigurePasteOption;
    }
    return CommandResult.Success;
  }

  pasteFigure(
    sheetId: UID,
    clippedContent: FigureClipboardContent,
    figureId: UID,
    position: DOMCoordinates,
    size: FigureSize
  ): void {
    throw new Error("The method should be implemented by its sub-class.");
  }
}
