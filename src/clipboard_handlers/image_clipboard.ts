import { UuidGenerator, deepCopy } from "../helpers";
import {
  ClipboardFigureData,
  ClipboardOptions,
  ClipboardPasteTarget,
  CommandResult,
  Figure,
  UID,
  Zone,
} from "../types";
import { Image } from "../types/image";
import { AbstractFigureClipboardHandler } from "./abstract_figure_clipboard_handler";

type ClipboardContent = {
  figureId: UID;
  copiedFigure: Figure;
  copiedImage: Image;
  sheetId: UID;
};

export class ImageClipboardHandler extends AbstractFigureClipboardHandler<ClipboardContent> {
  copy(data: ClipboardFigureData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    const figure = this.getters.getFigure(sheetId, data.figureId);
    if (!figure) {
      throw new Error(`No figure for the given id: ${data.figureId}`);
    }
    const copiedFigure = { ...figure };
    if (figure.tag !== "image") {
      return;
    }
    const image = this.getters.getImage(data.figureId);
    const copiedImage = deepCopy(image);
    return {
      figureId: data.figureId,
      copiedFigure,
      copiedImage,
      sheetId,
    };
  }

  getPasteTarget(
    sheetId: UID,
    target: Zone[],
    content: ClipboardContent,
    options?: ClipboardOptions
  ): ClipboardPasteTarget {
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
    const copy = deepCopy(clippedContent.copiedImage);
    this.dispatch("CREATE_IMAGE", {
      figureId,
      sheetId,
      position,
      size: { height, width },
      definition: copy,
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
