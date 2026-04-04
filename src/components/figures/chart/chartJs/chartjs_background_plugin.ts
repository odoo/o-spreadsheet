import { ChartType, Plugin } from "chart.js";

export interface ChartBackgroundPluginOptions {
  color: string | undefined;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    background?: ChartBackgroundPluginOptions;
  }
}

/** This is a chartJS plugin that will draw a background of a chart */
export const chartBackgroundPlugin: Plugin = {
  id: "background",
  beforeDraw(chart: any, args, options: ChartBackgroundPluginOptions) {
    const { ctx } = chart;
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = options.color || "#FFFFFF";
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  },
};
