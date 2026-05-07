import { chartSubtypeRegistry } from "../registries/chart_subtype_registry";
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
  if (item.type === "dataLayer") {
    return "o-spreadsheet-Icon.DATA";
  }
  const definition = getters.getChartDefinition(item.id);
  const matchedChart =
    chartSubtypeRegistry.getAll().find((c) => c.matcher?.(definition)) ||
    chartSubtypeRegistry.get(definition.type);
  return matchedChart.preview;
}

export function getCarouselItemTitle(getters: Getters, item: CarouselItem): string {
  if (item.title) {
    return item.title;
  }
  if (item.type === "dataLayer") {
    return getters.getDataLayer(item.id).rangeXc;
  }
  const definition = getters.getChartDefinition(item.id);
  const matchedChart =
    chartSubtypeRegistry.getAll().find((c) => c.matcher?.(definition)) ||
    chartSubtypeRegistry.get(definition.type);
  return matchedChart.displayName;
}
