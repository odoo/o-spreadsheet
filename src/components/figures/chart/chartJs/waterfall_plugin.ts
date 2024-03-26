import { BarElement, ChartType, Plugin } from "chart.js";

interface WaterfallPluginOptions {
  enabled: boolean;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    waterfallLinesPlugin?: WaterfallPluginOptions;
  }
}

export const waterfallLinesPlugin: Plugin = {
  id: "waterfallLinesPlugin",
  afterDraw(chart, args, options: WaterfallPluginOptions) {
    console.log("beforeDraw", args, options);
    if (!options.enabled) {
      return;
    }
    const drawData = (chart as any)._metasets?.[0]?.data as BarElement[];
    if (!drawData) {
      return;
    }
    const ctx = chart.ctx;
    ctx.save();
    for (const bar of drawData) {
      const rect = getBarElementRect(bar);
      ctx.fillStyle = "pink";
      ctx.fillRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top);
      console.log(rect);
    }
    console.log(drawData);
    ctx.restore();
  },
};

function getBarElementRect(bar: any) {
  const flipped = bar.base < bar.y; // Bar are flipped for negative values in the dataset
  return {
    left: bar.x - bar.width / 2 - 1, // -1 and +2 to include bar borders
    bottom: (flipped ? bar.base + bar.height : bar.y + bar.height) + 2,
    top: (flipped ? bar.base : bar.y) - 1,
    right: bar.x + bar.width / 2 + 2,
  };
}
