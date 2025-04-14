import { UuidGenerator } from "../helpers";
import { AbstractChart } from "../helpers/figures/charts";
import {
  ClipboardFigureData,
  ClipboardOptions,
  ClipboardPasteTarget,
  CommandResult,
  Figure,
  UID,
  Zone,
} from "../types";
import { AbstractFigureClipboardHandler } from "./abstract_figure_clipboard_handler";

type ClipboardContent = {
  figureId: UID;
  copiedFigure: Figure;
  copiedChart: AbstractChart;
};

export class ChartClipboardHandler extends AbstractFigureClipboardHandler<ClipboardContent> {
  copy(data: ClipboardFigureData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    const figure = this.getters.getFigure(sheetId, data.figureId);
    if (!figure) {
      throw new Error(`No figure for the given id: ${data.figureId}`);
    }
    if (figure.tag !== "chart") {
      return;
    }
    const copiedFigure = { ...figure };
    const chart = this.getters.getChart(data.figureId);
    if (!chart) {
      throw new Error(`No chart for the given id: ${data.figureId}`);
    }
    const copiedChart = chart.copyInSheetId(sheetId);
    return {
      figureId: data.figureId,
      copiedFigure,
      copiedChart,
    };
  }

  getPasteTarget(
    sheetId: UID,
    target: Zone[],
    content: ClipboardContent,
    options?: ClipboardOptions
  ): ClipboardPasteTarget {
    const newId = new UuidGenerator().smallUuid();
    return { zones: [], figureId: newId, sheetId };
  }

  paste(target: ClipboardPasteTarget, clippedContent: ClipboardContent, options: ClipboardOptions) {
    if (!target.figureId) {
      return;
    }
    const { zones, figureId } = target;
    const sheetId = target.sheetId;
    const { width, height } = clippedContent.copiedFigure;
    const copy = clippedContent.copiedChart.copyInSheetId(sheetId);
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
    this.dispatch("CREATE_CHART", {
      figureId,
      sheetId,
      definition: copy.getDefinition(),
      col,
      row,
      offset,
      size: { height, width },
    });

    if (options.isCutOperation) {
      this.dispatch("DELETE_FIGURE", {
        sheetId: clippedContent.copiedChart.sheetId,
        figureId: clippedContent.copiedFigure.id,
      });
    }
    this.dispatch("SELECT_FIGURE", { figureId });
  }

  isPasteAllowed(sheetId: UID, target: Zone[], content: any, option?: ClipboardOptions) {
    if (target.length === 0) {
      return CommandResult.EmptyTarget;
    }
    if (option?.pasteOption !== undefined) {
      return CommandResult.WrongFigurePasteOption;
    }
    return CommandResult.Success;
  }
}
