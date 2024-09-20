import { ChartType, Plugin } from "chart.js";
import {
  TREND_LINE_XAXIS_ID,
  chartFontColor,
} from "../../../../helpers/figures/charts/chart_common";
import { Color } from "../../../../types";

interface ChartShowValuesPluginOptions {
  showValues: boolean;
  background?: Color;
  horizontal?: boolean;
  callback: (value: number | string, axisId?: string) => string;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    chartShowValuesPlugin?: ChartShowValuesPluginOptions;
  }
}

/** This is a chartJS plugin that will draw the values of each data next to the point/bar/pie slice */
export const chartShowValuesPlugin: Plugin = {
  id: "chartShowValuesPlugin",
  afterDatasetsDraw(chart: any, args, options: ChartShowValuesPluginOptions) {
    if (!options.showValues) {
      return;
    }
    const drawData = chart._metasets?.[0]?.data;
    if (!drawData) {
      return;
    }
    const ctx = chart.ctx;
    ctx.save();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = chartFontColor(options.background);
    ctx.strokeStyle = chartFontColor(ctx.fillStyle);

    chart._metasets.forEach(function (dataset) {
      if (dataset.xAxisID === TREND_LINE_XAXIS_ID) {
        return; // ignore trend lines
      }
      switch (dataset.type) {
        case "doughnut":
        case "pie": {
          for (let i = 0; i < dataset._parsed.length; i++) {
            const bar = dataset.data[i];
            const { startAngle, endAngle, innerRadius, outerRadius } = bar;
            const midAngle = (startAngle + endAngle) / 2;
            const midRadius = (innerRadius + outerRadius) / 2;
            const x = bar.x + midRadius * Math.cos(midAngle);
            const y = bar.y + midRadius * Math.sin(midAngle) + 7;

            ctx.fillStyle = chartFontColor(bar.options.backgroundColor);
            ctx.strokeStyle = chartFontColor(ctx.fillStyle);

            const value = options.callback(dataset._parsed[i]);
            ctx.strokeText(value, x, y);
            ctx.fillText(value, x, y);
          }
          break;
        }
        case "bar":
        case "line": {
          const yOffset = dataset.type === "bar" && !options.horizontal ? 0 : 3;

          const horizontalChart = dataset.type === "bar" && options.horizontal;
          const axisId = horizontalChart ? dataset.xAxisID : dataset.yAxisID;

          for (let i = 0; i < dataset._parsed.length; i++) {
            const point = dataset.data[i];
            const value = options.horizontal ? dataset._parsed[i].x : dataset._parsed[i].y;
            const displayedValue = options.callback(value - 0, axisId);
            let xPosition = 0,
              yPosition = 0;
            if (options.horizontal) {
              yPosition = point.y;
              if (value < 0) {
                ctx.textAlign = "right";
                xPosition = point.x - yOffset;
              } else {
                ctx.textAlign = "left";
                xPosition = point.x + yOffset;
              }
            } else {
              xPosition = point.x;
              if (value < 0) {
                ctx.textBaseline = "top";
                yPosition = point.y + yOffset;
              } else {
                ctx.textBaseline = "bottom";
                yPosition = point.y - yOffset;
              }
            }
            ctx.strokeText(displayedValue, xPosition, yPosition);
            ctx.fillText(displayedValue, xPosition, yPosition);
          }
          break;
        }
      }
    });

    ctx.restore();
  },
};
