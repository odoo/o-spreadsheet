import { chartSubtypeRegistry } from "../registries/chart_subtype_registry";
import { _t } from "../translation";
import { ChartDefinition } from "../types/chart/chart";
import { CarouselItem } from "../types/figure";
import { Getters } from "../types/getters";

export const CAROUSEL_DEFAULT_CHART_DEFINITION: ChartDefinition = {
  type: "bar",
  title: {},
  stacked: false,
  dataSetStyles: {},
  dataSource: { type: "range", dataSets: [], dataSetsHaveTitle: false },
  legendPosition: "top",
  humanize: true,
};

export function getCarouselItemPreview(getters: Getters, item: CarouselItem): string {
  if (item.type === "carouselDataView" || item.type === "dataLayer") {
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
  if (item.type === "dataLayer") {
    return item.rangeXc;
  }
  const definition = getters.getChartDefinition(item.chartId);
  const matchedChart =
    chartSubtypeRegistry.getAll().find((c) => c.matcher?.(definition)) ||
    chartSubtypeRegistry.get(definition.type);
  return matchedChart.displayName;
}
