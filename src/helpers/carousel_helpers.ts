import { chartSubtypeRegistry } from "../registries/chart_subtype_registry";
import { _t } from "../translation";
import { ChartDefinition } from "../types/chart/chart";
import { AnchorOffset, CarouselItem } from "../types/figure";
import { Getters } from "../types/getters";
import { UID } from "../types/misc";
import { SpreadsheetChildEnv } from "../types/spreadsheet_env";

export const CAROUSEL_DEFAULT_CHART_DEFINITION: ChartDefinition = {
  type: "bar",
  title: {},
  stacked: false,
  dataSetStyles: {},
  dataSource: { type: "range", dataSets: [], dataSetsHaveTitle: false },
  legendPosition: "top",
  humanize: true,
};

/**
 * Compute the anchor of a chart popped out of a carousel: slightly offset from the
 * carousel figure so the new chart does not perfectly overlap it.
 */
export function getPoppedOutChartAnchor(
  env: SpreadsheetChildEnv,
  sheetId: UID,
  carouselId: UID
): AnchorOffset {
  const figure = env.model.getters.getFigure(sheetId, carouselId);
  if (!figure) {
    throw new Error(`Could not find figure with id ${carouselId} in sheet ${sheetId}`);
  }
  const figureUI = env.model.getters.getFigureUI(sheetId, figure);
  return env.model.getters.getPositionAnchorOffset({ x: figureUI.x + 50, y: figureUI.y + 50 });
}

export function getCarouselItemPreview(getters: Getters, item: CarouselItem): string {
  if (item.type === "carouselDataView") {
    return "o-spreadsheet-Icon.DATA";
  }
  const definition = getters.getChartDefinition(item.chartId);
  const matchedChart =
    chartSubtypeRegistry.getAll().find((c) => c.matcher?.(definition)) ||
    chartSubtypeRegistry.get(definition.type);
  return matchedChart.preview;
}

export function getCarouselItemTitle(getters: Getters, item: CarouselItem): string {
  if (item.title) {
    return item.title;
  }
  if (item.type === "carouselDataView") {
    return _t("Data");
  }
  const definition = getters.getChartDefinition(item.chartId);
  const matchedChart =
    chartSubtypeRegistry.getAll().find((c) => c.matcher?.(definition)) ||
    chartSubtypeRegistry.get(definition.type);
  return matchedChart.displayName;
}
