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
    const newId = new UuidGenerator().smallUuid();
    return { sheetId, zones: [], figureId: newId };
  }

  paste(target: ClipboardPasteTarget, clippedContent: ClipboardContent, options: ClipboardOptions) {
    if (!target.figureId) {
      return;
    }
    const { zones, figureId } = target;
    const sheetId = this.getters.getActiveSheetId();
    const { width, height } = clippedContent.copiedFigure;
    const copy = deepCopy(clippedContent.copiedImage);
    const maxPosition = this.getters.getMaxAnchorOffset(sheetId, height, width);
    let { left: col, top: row } = zones[0];
    let offset = { x: 0, y: 0 };
    if (col > maxPosition.col) {
      col = maxPosition.col;
      offset.x = maxPosition.offset.x;
    }
    if (row > maxPosition.row) {
      row = maxPosition.row;
      offset.y = maxPosition.offset.y;
    }
    this.dispatch("CREATE_IMAGE", {
      figureId,
      sheetId,
      col,
      row,
      offset,
      size: { height, width },
      definition: copy,
    });

    if (options.isCutOperation) {
      this.dispatch("DELETE_FIGURE", {
        sheetId: clippedContent.sheetId,
        figureId: clippedContent.copiedFigure.id,
      });
    }
    this.dispatch("SELECT_FIGURE", { figureId });
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
