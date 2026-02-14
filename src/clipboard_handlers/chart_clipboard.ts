import { AbstractFigureClipboardHandler } from "@odoo/o-spreadsheet-engine/clipboard_handlers/abstract_figure_clipboard_handler";
import { boundColRowOffsetInSheet } from "@odoo/o-spreadsheet-engine/helpers/figures/figure/figure";
import { UuidGenerator } from "../helpers";
import { AbstractChart } from "../helpers/figures/charts";
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
  figures: ClipboardCharts[];
  figureIds: UID[];
};

type ClipboardCharts = {
  figureId: UID;
  copiedFigure: Figure;
  copiedChart: AbstractChart;
  offset: PixelPosition;
};

export class ChartClipboardHandler extends AbstractFigureClipboardHandler<ClipboardContent> {
  copy(data: ClipboardFigureData): ClipboardContent | undefined {
    const sheetId = data.sheetId;
    const figures: ClipboardCharts[] = [];
    const copyRect = this.getCopyRect(data);
    for (const figureId of data.figureIds) {
      const figure = this.getters.getFigure(sheetId, figureId);
      if (!figure) {
        throw new Error(`No figure for the given id: ${figureId}`);
      }
      if (figure.tag !== "chart") {
        continue;
      }
      const copiedFigure = { ...figure };
      const { x, y } = this.getters.getFigureUI(sheetId, figure);
      const chart = this.getters.getChartFromFigureId(figureId);
      if (!chart) {
        throw new Error(`No chart for the given id: ${figureId}`);
      }
      const copiedChart = chart.copyInSheetId(sheetId);
      figures.push({
        figureId,
        copiedFigure,
        copiedChart,
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
    return { zones: [], figureIds, sheetId };
  }

  paste(target: ClipboardPasteTarget, clippedContent: ClipboardContent, options: ClipboardOptions) {
    if (!target.figureIds) {
      return;
    }
    const { zones } = target;
    const sheetId = target.sheetId;
    for (const clippedFigure of clippedContent.figures) {
      const figureId = target.figureIds[clippedFigure.figureId];
      const { width, height } = clippedFigure.copiedFigure;
      const copy = clippedFigure.copiedChart.copyInSheetId(sheetId);
      const { col, row, offset } = boundColRowOffsetInSheet(
        this.getters,
        sheetId,
        { col: zones[0].left, row: zones[0].top },
        clippedFigure.copiedFigure
      );
      this.dispatch("CREATE_CHART", {
        figureId,
        chartId: new UuidGenerator().smallUuid(),
        sheetId,
        definition: copy.getDefinition(),
        col,
        row,
        offset,
        size: { height, width },
      });

      if (options.isCutOperation) {
        this.dispatch("DELETE_FIGURE", {
          sheetId: clippedFigure.copiedChart.sheetId,
          figureId: clippedFigure.copiedFigure.id,
        });
      }
      this.dispatch("SELECT_FIGURE", {
        figureId,
        selectMultiple: clippedContent.figureIds.length > 1,
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
}
