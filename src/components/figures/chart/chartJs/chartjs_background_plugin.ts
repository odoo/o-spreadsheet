import { BACKGROUND_CHART_COLOR } from "@odoo/o-spreadsheet-engine/constants";
import { ChartType, Plugin } from "chart.js";

export interface ChartBackgroundPluginOptions {
  color: string | undefined;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    background?: ChartBackgroundPluginOptions;
  }
}

/** This is a chartJS plugin that will draw the values of each data next to the point/bar/pie slice */
export const chartBackgroundPlugin: Plugin = {
  id: "background",
  beforeDraw(chart: any, args, options: ChartBackgroundPluginOptions) {
    const { ctx } = chart;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = options.color || BACKGROUND_CHART_COLOR;
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  },
};
