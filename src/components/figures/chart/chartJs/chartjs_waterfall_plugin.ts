import { ChartType, Plugin } from "chart.js";

interface WaterfallPluginOptions {
  showConnectorLines: boolean;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    waterfallLinesPlugin?: WaterfallPluginOptions;
  }
}

/** This is a chartJS plugin that will draw connector lines between the bars of a Waterfall chart */
export const waterfallLinesPlugin: Plugin = {
  id: "waterfallLinesPlugin",
  beforeDraw(chart, args, options: WaterfallPluginOptions) {
    if (!options.showConnectorLines) {
      return;
    }
    // Note: private properties are not in the typing of chartJS (and some of the existing types are missing properties)
    // so we don't type anything in this file
    const drawData = (chart as any)._metasets?.[0]?.data;
    if (!drawData) {
      return;
    }
    const ctx = chart.ctx;
    ctx.save();

    ctx.setLineDash([3, 2]);
    for (let i = 0; i < drawData.length; i++) {
      const bar = drawData[i];
      if (bar.height === 0) {
        continue;
      }
      const nextBar = getNextNonEmptyBar(drawData, i);
      if (!nextBar) {
        break;
      }
      const rect = getBarElementRect(bar);
      const nextBarRect = getBarElementRect(nextBar);
      const rawBarValues = bar.$context.raw;
      const value = rawBarValues[1] - rawBarValues[0];

      const lineY = Math.round(value < 0 ? rect.bottom - 1 : rect.top);
      const lineStart = Math.round(rect.right);
      const lineEnd = Math.round(nextBarRect.left);

      ctx.strokeStyle = "#999";
      ctx.beginPath();
      ctx.moveTo(lineStart + 1, lineY + 0.5);
      ctx.lineTo(lineEnd, lineY + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  },
};

function getBarElementRect(bar: any) {
  const flipped = bar.base < bar.y; // Bar are flipped for negative values in the dataset
  return {
    left: bar.x - bar.width / 2,
    right: bar.x + bar.width / 2,
    bottom: flipped ? bar.base + bar.height : bar.y + bar.height,
    top: flipped ? bar.base : bar.y,
  };
}

function getNextNonEmptyBar(bars: any[], startIndex: number) {
  return bars.find((bar, i) => i > startIndex && bar.height !== 0);
}
