import { deepCopy } from "../helpers/misc";
import { UuidGenerator } from "../helpers/uuid";
import { ClipboardFigureData, ClipboardOptions, ClipboardPasteTarget } from "../types/clipboard";
import { CommandResult } from "../types/commands";
import { DataLayerDefinition } from "../types/data_layer";
import { Figure } from "../types/figure";
import { UID, Zone } from "../types/misc";
import { AbstractFigureClipboardHandler } from "./abstract_figure_clipboard_handler";

type ClipboardContent = {
  figureId: UID;
  copiedFigure: Figure;
  copiedDefinition: DataLayerDefinition;
  sheetId: UID;
};

export class DataLayerClipboardHandler extends AbstractFigureClipboardHandler<ClipboardContent> {
  copy(data: ClipboardFigureData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    const figure = this.getters.getFigure(sheetId, data.figureId);
    if (!figure) {
      throw new Error(`No figure for the given id: ${data.figureId}`);
    }
    if (figure.tag !== "dataLayer") {
      return;
    }
    const definition = this.getters.getDataLayer(data.figureId);
    return {
      figureId: data.figureId,
      copiedFigure: { ...figure },
      copiedDefinition: deepCopy(definition),
      sheetId,
    };
  }

  getPasteTarget(
    sheetId: UID,
    target: Zone[],
    content: ClipboardContent,
    options?: ClipboardOptions
  ): ClipboardPasteTarget {
    const newId = UuidGenerator.smallUuid();
    return { sheetId, zones: [], figureId: newId };
  }

  paste(target: ClipboardPasteTarget, clippedContent: ClipboardContent, options: ClipboardOptions) {
    if (!target.figureId) {
      return;
    }
    const { zones, figureId } = target;
    const sheetId = this.getters.getActiveSheetId();
    const { width, height } = clippedContent.copiedFigure;
    const copy = deepCopy(clippedContent.copiedDefinition);
    const maxPosition = this.getters.getMaxAnchorOffset(sheetId, height, width);
    let { left: col, top: row } = zones[0];
    const offset = { x: 0, y: 0 };
    if (col > maxPosition.col) {
      col = maxPosition.col;
      offset.x = maxPosition.offset.x;
    }
    if (row > maxPosition.row) {
      row = maxPosition.row;
      offset.y = maxPosition.offset.y;
    }
    this.dispatch("CREATE_DATA_LAYER", {
      figureId,
      dataLayerId: figureId,
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
