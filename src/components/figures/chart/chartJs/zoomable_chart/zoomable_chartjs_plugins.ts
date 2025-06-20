import { ChartType, Plugin } from "chart.js";

// Plugin to show the current visible area on master chart
interface CurrentAreaPluginOptions {
  getLowerBound: () => number | undefined;
  getUpperBound: () => number | undefined;
}

export const currentlyShownArea: Plugin = {
  id: "currentlyShownArea",
  afterDatasetsDraw: function (chart, args, options: CurrentAreaPluginOptions) {
    if (!options.getLowerBound || !options.getUpperBound) {
      return;
    }
    const {
      ctx,
      chartArea: { left, right, top, bottom },
    } = chart;
    const originalLineWidth = ctx.lineWidth;
    let lowerBound = options.getLowerBound() ?? left;
    let upperBound = options.getUpperBound() ?? right;
    if (lowerBound > upperBound) {
      [lowerBound, upperBound] = [upperBound, lowerBound];
    }
    if (lowerBound === left) {
      lowerBound -= 1;
    }
    if (upperBound === right) {
      upperBound += 1;
    }
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
    ctx.lineWidth = originalLineWidth;
  },
};

window.Chart?.register(currentlyShownArea);

// Plugin to show the current hover position on detail chart
interface HoverPositionOptions {
  position?: () => number;
}

export const hoveredPosition: Plugin = {
  id: "hoveredPosition",
  afterDatasetsDraw: function (chart, args, options: HoverPositionOptions) {
    const hoverCoordinate = options.position?.();
    if (hoverCoordinate === undefined) {
      return;
    }
    const { min, max, type } = chart.scales.x;
    if (hoverCoordinate < min || hoverCoordinate > max) {
      return;
    }
    const {
      ctx,
      chartArea: { left, right, top, bottom },
    } = chart;
    const hoverPosition =
      type === "linear"
        ? chart.scales.x.getPixelForValue(hoverCoordinate)
        : left + ((right - left) * (hoverCoordinate - min + 0.5)) / (max + 1 - min);
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.moveTo(hoverPosition, top);
    ctx.lineTo(hoverPosition, bottom);
    ctx.stroke();
  },
};

window.Chart?.register(hoveredPosition);

interface MainZoomPluginOptions {
  enabled?: boolean;
  sliceable?: boolean;
  wheelable?: boolean;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    currentlyShownArea?: CurrentAreaPluginOptions;
    hoverPositionPlugin?: HoverPositionOptions;
    zoom?: MainZoomPluginOptions;
  }
}
