import { ActiveDataPoint, ChartType, Plugin } from "chart.js";
import { SunburstChartRawData } from "../../../../types/chart";

export interface ChartSunburstHoverPluginOptions {
  enabled: boolean;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    sunburstHoverPlugin?: ChartSunburstHoverPluginOptions;
  }
}

/** When a chart element is hovered (active), this plugin also activates all of its child elements */
export const sunburstHoverPlugin: Plugin = {
  id: "sunburstHoverPlugin",
  afterEvent(chart, args, options: ChartSunburstHoverPluginOptions) {
    if (!options.enabled) {
      return;
    }
    const chartActiveElements = chart.getActiveElements();
    const activeDataPoints: ActiveDataPoint[] = chartActiveElements.map((el) => ({
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
          if (isChildGroup(activeData.groups, data.groups)) {
            activeDataPoints.push({ datasetIndex, index });
          }
        }
      }
    }
    chart.setActiveElements(activeDataPoints);
  },
};

function isChildGroup(parentGroup: string[], childGroup: string[]) {
  return (
    childGroup.length > parentGroup.length &&
    parentGroup.every((group, i) => group === childGroup[i])
  );
}
