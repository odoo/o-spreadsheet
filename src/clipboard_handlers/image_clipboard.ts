import { AbstractFigureClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_figure_clipboard_handler";
import { boundColRowOffsetInSheet } from "@odoo/o-spreadsheet-engine/helpers/figures/figure/figure";
import { Image } from "@odoo/o-spreadsheet-engine/types/image";
import { UuidGenerator, deepCopy } from "../helpers";
import {
  ClipboardFigureData,
  ClipboardOptions,
  ClipboardPasteTarget,
  CommandResult,
  Figure,
  PixelPosition,
  UID,
  Zone,
} from "../types";

type ClipboardContent = {
  figures: ClipboardImages[];
  figureIds: UID[];
};

type ClipboardImages = {
  figureId: UID;
  copiedFigure: Figure;
  copiedImage: Image;
  sheetId: UID;
  offset: PixelPosition;
};

export class ImageClipboardHandler extends AbstractFigureClipboardHandler<ClipboardContent> {
  copy(data: ClipboardFigureData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    const figures: ClipboardImages[] = [];
    const copyRect = this.getCopyRect(data);
    for (const figureId of data.figureIds) {
      const figure = this.getters.getFigure(sheetId, figureId);
      if (!figure) {
        throw new Error(`No figure for the given id: ${figureId}`);
      }
      if (figure.tag !== "image") {
        continue;
      }
      const copiedFigure = { ...figure };
      const { x, y } = this.getters.getFigureUI(sheetId, figure);
      const image = this.getters.getImage(figureId);
      const copiedImage = deepCopy(image);
      figures.push({
        figureId,
        copiedFigure,
        copiedImage,
        sheetId,
        offset: { x: x - copyRect.x, y: y - copyRect.y },
      });
    }
    return { figures, figureIds: data.figureIds };
  }

  getPasteTarget(
    sheetId: UID,
    target: Zone[],
    content: ClipboardContent,
    options?: ClipboardOptions
  ): ClipboardPasteTarget {
    const uuids = new UuidGenerator();
    const figureIds = {};
    for (const figure of content.figures) {
      figureIds[figure.figureId] = uuids.smallUuid();
    }
    return { sheetId, zones: [], figureIds };
  }

  paste(target: ClipboardPasteTarget, clippedContent: ClipboardContent, options: ClipboardOptions) {
    if (!target.figureIds) {
      return;
    }
    const { zones } = target;
    for (const clippedFigure of clippedContent.figures) {
      const figureId = target.figureIds[clippedFigure.figureId];
      const sheetId = this.getters.getActiveSheetId();
      const { width, height } = clippedFigure.copiedFigure;
      const copy = deepCopy(clippedFigure.copiedImage);
      const { col, row, offset } = boundColRowOffsetInSheet(
        this.getters,
        sheetId,
        { col: zones[0].left, row: zones[0].top },
        clippedFigure.copiedFigure
      );
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
          sheetId: clippedFigure.sheetId,
          figureId: clippedFigure.copiedFigure.id,
        });
      }
      this.dispatch("SELECT_FIGURE", {
        figureId,
        selectMultiple: clippedContent.figureIds.length > 1,
      });
    }
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
