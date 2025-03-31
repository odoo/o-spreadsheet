import { ActiveDataPoint, ChartType, Plugin } from "chart.js";
import { deepEquals, lightenColor } from "../../../../helpers";
import { GHOST_SUNBURST_VALUE } from "../../../../helpers/figures/charts/runtime/chartjs_dataset";
import { SunburstChartRawData } from "../../../../types/chart";

export interface CharthierarchicalHoverPluginOptions {
  enabled: boolean;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    hierarchicalHoverPlugin?: CharthierarchicalHoverPluginOptions;
  }
}

/**
 * When a chart element is hovered (active), this plugin also activates all of its child elements and
 * lightens the color of the other elements.
 */
export const hierarchicalHoverPlugin: Plugin = {
  id: "hierarchicalHoverPlugin",
  afterEvent(chart: any, args, options: CharthierarchicalHoverPluginOptions) {
    const type = chart.config["type"] as "doughnut" | "treemap";
    if (!options.enabled || (type !== "doughnut" && type !== "treemap")) {
      return;
    }
    const chartActiveElements = chart.getActiveElements();
    let activeDataPoints: ActiveDataPoint[] = chartActiveElements.map((el) => ({
      datasetIndex: el.datasetIndex,
      index: el.index,
    }));
    for (const activeEl of chartActiveElements) {
      const activeDataset = chart.data.datasets[activeEl.datasetIndex];
      const activeData = activeDataset.data[activeEl.index] as unknown as SunburstChartRawData;

      for (let datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex++) {
        const dataset = chart.data.datasets[datasetIndex];
        for (let index = 0; index < dataset.data.length; index++) {
          const data = dataset.data[index] as unknown as SunburstChartRawData;
          if (isChildGroup(getDataPointGroups(type, activeData), getDataPointGroups(type, data))) {
            if (
              !activeDataPoints.some((el) => el.datasetIndex === datasetIndex && el.index === index)
            ) {
              activeDataPoints.push({ datasetIndex, index });
            }
          }
        }
      }
    }

    activeDataPoints = activeDataPoints.filter((point) => {
      const { datasetIndex, index } = point;
      const data = chart.data.datasets[datasetIndex].data[index] as unknown as SunburstChartRawData;
      return data.label !== GHOST_SUNBURST_VALUE;
    });
    chart.setActiveElements(activeDataPoints);
    if (deepEquals(chart.cachedThings, activeDataPoints)) {
      return;
    }
    console.log("to the update", chart.cachedThings, activeDataPoints);
    chart.cachedThings = activeDataPoints;
    if (activeDataPoints.length === 0) {
      console.log("total update of the hearth");
      chart.update();
      return;
    }

    for (const metaSet of chart.getSortedVisibleDatasetMetas()) {
      for (const arcElement of metaSet.data) {
        const context = arcElement["$context"];
        const { datasetIndex, index, dataset, raw } = context;
        if (raw.label === GHOST_SUNBURST_VALUE) {
          continue;
        }

        const originalBackgroundColor =
          typeof dataset.backgroundColor === "function"
            ? dataset.backgroundColor(context)
            : dataset.backgroundColor;
        const originalLabelColor =
          typeof dataset.labels.color === "function"
            ? dataset.labels?.color(context)
            : dataset.labels?.color;
        if (
          activeDataPoints.length &&
          !activeDataPoints.some((el) => el.datasetIndex === datasetIndex && el.index === index)
        ) {
          const color = lightenColor(originalBackgroundColor, 0.5);
          arcElement.options.backgroundColor = color;
          arcElement.options.originalBackgroundColor = originalBackgroundColor;
          if (type === "treemap") {
            arcElement.options.labels.color = "#fff";
          }
        } else {
          arcElement.options.backgroundColor = originalBackgroundColor;
          if (type === "treemap") {
            arcElement.options.labels.color = originalLabelColor;
          }
        }
      }
    }
  },
};

function isChildGroup(parentGroup: string[], childGroup: string[]) {
  return (
    childGroup.length > parentGroup.length &&
    parentGroup.every((group, i) => group === childGroup[i])
  );
}

function getDataPointGroups(chartType: "doughnut" | "treemap", data: any): string[] {
  if (chartType === "doughnut") {
    return data.groups;
  }
  const groups: string[] = [];
  for (let i = 0; i <= data.l; i++) {
    groups.push(data._data[i]);
  }
  return groups;
}
