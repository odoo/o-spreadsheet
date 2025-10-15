import { SunburstChartRawData } from "@odoo/o-spreadsheet-engine/types/chart";
import { ActiveDataPoint, ChartType, Plugin } from "chart.js";
import { lightenColor } from "../../../../helpers";
import { GHOST_SUNBURST_VALUE } from "../../../../helpers/figures/charts/runtime/chartjs_dataset";

export interface ChartSunburstHoverPluginOptions {
  enabled: boolean;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    sunburstHoverPlugin?: ChartSunburstHoverPluginOptions;
  }
}

/**
 * When a chart element is hovered (active), this plugin also activates all of its child elements and
 * lightens the color of the other elements.
 */
export const sunburstHoverPlugin: Plugin = {
  id: "sunburstHoverPlugin",
  afterEvent(chart, args, options: ChartSunburstHoverPluginOptions) {
    if (!options.enabled) {
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
          if (isChildGroup(activeData.groups, data.groups)) {
            activeDataPoints.push({ datasetIndex, index });
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
        if (
          activeDataPoints.length &&
          !activeDataPoints.some((el) => el.datasetIndex === datasetIndex && el.index === index)
        ) {
          arcElement.options.backgroundColor = lightenColor(originalBackgroundColor, 0.5);
        } else {
          arcElement.options.backgroundColor = originalBackgroundColor;
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
