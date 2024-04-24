import { AbstractChart } from "../helpers/figures/charts";
import {
  ClipboardFigureData,
  ClipboardOptions,
  ClipboardPasteTarget,
  CommandResult,
  DOMCoordinates,
  FigureSize,
  UID,
  Zone,
} from "../types";
import {
  AbstractFigureClipboardHandler,
  FigureClipboardContent,
} from "./abstract_figure_clipboard_handler";

interface ClipboardContent extends FigureClipboardContent {
  copiedChart?: AbstractChart;
}

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
      sheetId,
    };
  }

  paste(target: ClipboardPasteTarget, clippedContent: ClipboardContent, options: ClipboardOptions) {
    if (!clippedContent?.copiedFigure || !clippedContent?.copiedChart || !target.figureId) {
      return;
    }
    const { zones, figureId } = target;
    const { width, height } = clippedContent.copiedFigure;
    const sheetId = target.sheetId;
    const targetX = this.getters.getColDimensions(sheetId, zones[0].left).start;
    const targetY = this.getters.getRowDimensions(sheetId, zones[0].top).start;
    const position = { x: targetX, y: targetY };
    const copy = clippedContent.copiedChart.copyInSheetId(sheetId);
    this.dispatch("CREATE_CHART", {
      id: figureId,
      sheetId,
      position,
      size: { height, width },
      definition: copy.getDefinition(),
    });

    if (options?.isCutOperation) {
      this.dispatch("DELETE_FIGURE", {
        sheetId: clippedContent.copiedChart.sheetId,
        id: clippedContent.copiedFigure.id,
      });
    }
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

  pasteFigure(
    sheetId: UID,
    copiedContent: ClipboardContent,
    figureId: UID,
    position: DOMCoordinates,
    size: FigureSize
  ): void {
    if (!copiedContent.copiedChart) {
      return;
    }
    const copy = copiedContent.copiedChart.copyInSheetId(sheetId);
    this.dispatch("CREATE_CHART", {
      id: figureId,
      sheetId,
      position,
      size,
      definition: copy.getDefinition(),
    });
  }
}
