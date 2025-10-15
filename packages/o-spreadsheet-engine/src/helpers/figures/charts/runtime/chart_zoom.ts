import { ChartConfiguration } from "chart.js";
import { isTrendLineAxis, truncateLabel } from "../chart_common";

export function generateMasterChartConfig(
  chartJsConfig: ChartConfiguration<any>
): ChartConfiguration<any> {
  return {
    ...chartJsConfig,
    data: {
      ...chartJsConfig.data,
      datasets: chartJsConfig.data.datasets
        .filter((ds) => !isTrendLineAxis(ds["xAxisID"]))
        .map((ds) => ({
          ...ds,
          pointRadius: 0,
          showLine: true,
        })),
    },
    options: {
      ...chartJsConfig.options,
      hover: { mode: null },
      plugins: {
        ...chartJsConfig.options.plugins,
        title: { display: false },
        legend: { display: false },
        tooltip: { enabled: false },
        chartShowValuesPlugin: undefined,
      },
      layout: {
        padding: {
          ...chartJsConfig.options.layout?.padding,
          top: 5,
          bottom: 10,
        },
      },
      scales: {
        y: {
          ...chartJsConfig.options.scales?.y,
          display: false,
        },
        y1: {
          ...chartJsConfig.options.scales?.y1,
          display: false,
        },
        x: {
          ...chartJsConfig.options.scales?.x,
          title: undefined,
          ticks: {
            ...chartJsConfig.options.scales?.x?.ticks,
            callback: function (value) {
              return truncateLabel(
                chartJsConfig.options.scales?.x?.ticks?.callback?.call(this, value),
                5
              );
            },
            padding: 0,
            font: {
              size: 9,
            },
          },
        },
      },
    },
  };
}
