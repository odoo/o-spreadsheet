import { deepCopy } from "../helpers";
import { ClipboardFigureData, DOMCoordinates, FigureSize, UID } from "../types";
import { Image } from "../types/image";
import {
  AbstractFigureClipboardHandler,
  FigureClipboardContent,
} from "./abstract_figure_clipboard_handler";

interface ClipboardContent extends FigureClipboardContent {
  copiedImage?: Image;
}

export class ImageClipboardHandler extends AbstractFigureClipboardHandler<ClipboardContent> {
  copy(data: ClipboardFigureData): ClipboardContent | undefined {
    const sheetId = this.getters.getActiveSheetId();
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

  pasteFigure(
    sheetId: UID,
    copiedContent: ClipboardContent,
    figureId: UID,
    position: DOMCoordinates,
    size: FigureSize
  ): void {
    if (!copiedContent.copiedImage) {
      return;
    }
    const copy = deepCopy(copiedContent.copiedImage);
    this.dispatch("CREATE_IMAGE", { figureId, sheetId, position, size, definition: copy });
  }
}
