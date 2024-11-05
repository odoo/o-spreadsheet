import { UuidGenerator, deepCopy } from "../helpers";
import {
  ClipboardFigureData,
  ClipboardOptions,
  ClipboardPasteTarget,
  CommandResult,
  Figure,
  FigureViewport,
  UID,
  Zone,
} from "../types";
import { AbstractFigureClipboardHandler } from "./abstract_figure_clipboard_handler";

type ClipboardContent = {
  figureId: UID;
  copiedFigure: Figure;
  copiedFigureViewport: FigureViewport;
  sheetId: UID;
};

export class FigureViewportClipboardHandler extends AbstractFigureClipboardHandler<ClipboardContent> {
  copy(data: ClipboardFigureData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    const figure = this.getters.getFigure(sheetId, data.figureId);
    if (!figure) {
      throw new Error(`No figure for the given id: ${data.figureId}`);
    }
    const copiedFigure = { ...figure };
    if (figure.tag !== "viewport") {
      return;
    }
    const figureViewport = this.getters.getFigureViewport(sheetId, data.figureId);
    const copiedImage = deepCopy(figureViewport);
    return {
      figureId: data.figureId,
      copiedFigure,
      copiedFigureViewport: copiedImage,
      sheetId,
    };
  }

  getPasteTarget(sheetId: UID): ClipboardPasteTarget {
    const newId = new UuidGenerator().uuidv4();
    return { sheetId, zones: [], figureId: newId };
  }

  paste(target: ClipboardPasteTarget, clippedContent: ClipboardContent, options: ClipboardOptions) {
    if (!target.figureId) {
      return;
    }
    const { zones, figureId } = target;
    const sheetId = this.getters.getActiveSheetId();
    const numCols = this.getters.getNumberCols(sheetId);
    const numRows = this.getters.getNumberRows(sheetId);
    const targetX = this.getters.getColDimensions(sheetId, zones[0].left).start;
    const targetY = this.getters.getRowDimensions(sheetId, zones[0].top).start;
    const maxX = this.getters.getColDimensions(sheetId, numCols - 1).end;
    const maxY = this.getters.getRowDimensions(sheetId, numRows - 1).end;
    const { width, height } = clippedContent.copiedFigure;
    const position = {
      x: maxX < width ? 0 : Math.min(targetX, maxX - width),
      y: maxY < height ? 0 : Math.min(targetY, maxY - height),
    };
    const copy = deepCopy(clippedContent.copiedFigureViewport);
    this.dispatch("CREATE_FIGURE_VIEWPORT", {
      figureId,
      sheetId,
      position,
      size: { height, width },
      definition: copy,
      zone: copy.zone,
    });

    if (options.isCutOperation) {
      this.dispatch("DELETE_FIGURE", {
        sheetId: clippedContent.sheetId,
        id: clippedContent.copiedFigure.id,
      });
    }
    this.dispatch("SELECT_FIGURE", { id: figureId });
  }

  isPasteAllowed(
    sheetId: UID,
    target: Zone[],
    content: ClipboardContent,
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
}
