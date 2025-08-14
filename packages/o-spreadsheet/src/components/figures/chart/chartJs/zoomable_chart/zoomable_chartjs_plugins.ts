import { ChartType, Plugin } from "chart.js";

/*
 * This plugin draws a shaded area on the master chart to indicate the current zoom window, ie the
 * area of the detail chart that is currently being viewed or analyzed.
 * It uses the `getLowerBound` and `getUpperBound` functions from the zoomable chart to determine the
 * bounds of the shaded area and then draws it on the master chart.
 */
interface CurrentAreaPluginOptions {
  getLowerBound: () => number | undefined;
  getUpperBound: () => number | undefined;
}

export const zoomWindowPlugin: Plugin = {
  id: "zoomWindowPlugin",
  afterDatasetsDraw: function (chart, args, options: CurrentAreaPluginOptions) {
    if (!options.getLowerBound || !options.getUpperBound) {
      return;
    }
    const {
      ctx,
      chartArea: { left, right, top, bottom },
    } = chart;
    let lowerBound = options.getLowerBound() ?? left;
    let upperBound = options.getUpperBound() ?? right;
    if (lowerBound > upperBound) {
      [lowerBound, upperBound] = [upperBound, lowerBound];
    }
    lowerBound = Math.max(left, lowerBound);
    upperBound = Math.min(right, upperBound);
    if (lowerBound === left) {
      lowerBound -= 1;
    }
    if (upperBound === right) {
      upperBound += 1;
    }
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.rect(left, bottom, lowerBound - left, top - bottom);
    ctx.rect(upperBound, bottom, right - upperBound, top - bottom);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = "#bbb";
    ctx.rect(lowerBound, bottom, upperBound - lowerBound, top - bottom);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lowerBound - 3, (top + bottom) / 2 - 7);
    ctx.lineTo(lowerBound - 3, (top + bottom) / 2 + 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(upperBound + 3, (top + bottom) / 2 - 7);
    ctx.lineTo(upperBound + 3, (top + bottom) / 2 + 7);
    ctx.stroke();
    ctx.restore();
  },
};

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    zoomWindowPlugin?: CurrentAreaPluginOptions;
  }
}
