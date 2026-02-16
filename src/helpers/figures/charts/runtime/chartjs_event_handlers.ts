import { GoToDataSetFunction } from "@odoo/o-spreadsheet-engine/registries/chart_registry";
import { ChartData, ChartDefinitionWithDataSource } from "@odoo/o-spreadsheet-engine/types/chart";
import { GeoChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/geo_chart";
import { Getters } from "@odoo/o-spreadsheet-engine/types/getters";
import type { ChartConfiguration } from "chart.js";

/**
 * Check if the even is a middle mouse click or ctrl+click
 *
 * ChartJS doesn't receive a click event when the user middle clicks on a chart, so we use the mouseup event instead.
 *
 */
function isChartJSMiddleClick(event) {
  return (
    (event.type === "click" &&
      event.native.button === 0 &&
      (event.native.ctrlKey || event.native.metaKey)) ||
    (event.type === "mouseup" && event.native.button === 1)
  );
}

export function getChartJsEventHandlers(
  definition: ChartDefinitionWithDataSource,
  data: ChartData,
  getters: Getters,
  goToDataSet: GoToDataSetFunction<"geo"> | undefined
): ChartConfiguration["options"] {
  return {
    onHover: (event, items, chart) => {
      if (!goToDataSet || !event.native) {
        return;
      }
      if (items.length > 0) {
        (event.native.target as HTMLElement).style.cursor = "pointer";
      } else {
        (event.native.target as HTMLElement).style.cursor = "";
      }
    },
    onClick: (event, items, chart) => {
      if (!goToDataSet || !items.length || !data.dataSetsValues[items[0].datasetIndex]) {
        return;
      }
      if (event.type === "click" || (isChartJSMiddleClick(event) && event.native)) {
        (event.native as MouseEvent).preventDefault(); // Prevent other click actions
      } else {
        return;
      }
      const { dataSetsValues, labelValues } = data;
      const { datasetIndex, index } = items[0];
      const dataset = dataSetsValues[datasetIndex];
      let name = labelValues[index].value;
      if (dataset.label) {
        name += ` / ${dataset.label}`;
      }
      return goToDataSet(
        definition.dataSource,
        name?.toString() ?? "",
        dataset,
        index,
        isChartJSMiddleClick(event),
        getters
      );
    },
  };
}

export function getGeoChartEventHandlers(
  definition: GeoChartDefinition,
  data: ChartData,
  getters: Getters,
  goToDataSet: GoToDataSetFunction<"geo"> | undefined
): ChartConfiguration["options"] {
  return {
    onHover: (event, items, chart) => {
      if (!goToDataSet || !event.native) {
        return;
      }
      if (!items.length) {
        (event.native.target as HTMLElement).style.cursor = "";
        return;
      }

      const item = items[0];
      const data = chart.data.datasets?.[item.datasetIndex]?.data?.[item.index];
      if (typeof data === "object" && data && "value" in data && data.value !== undefined) {
        (event.native.target as HTMLElement).style.cursor = "pointer";
      } else {
        (event.native.target as HTMLElement).style.cursor = "";
      }
    },
    onClick: (event, items, chart) => {
      if (!goToDataSet || !items.length || !data.dataSetsValues[items[0].datasetIndex]) {
        return;
      }
      if (event.type === "click" || (isChartJSMiddleClick(event) && event.native)) {
        (event.native as MouseEvent).preventDefault(); // Prevent other click actions
      } else {
        return;
      }
      const item = items[0];
      // @ts-ignore
      const label = item.element.feature.properties.name;
      const { dataSetsValues, labelValues } = data;
      const index = labelValues.map(({ value }) => value).indexOf(label);
      if (index === -1) {
        return {};
      }
      const dataset = dataSetsValues[0];
      let name = labelValues[index].value;
      if (dataset.label) {
        name += ` / ${dataset.label}`;
      }
      return goToDataSet(
        definition.dataSource,
        name?.toString() ?? "",
        dataset,
        index,
        isChartJSMiddleClick(event),
        getters
      );
    },
  };
}
