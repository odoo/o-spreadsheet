import { Chart, ChartType, Plugin } from "chart.js";

// Plugin to show the current visible area on master chart
interface CurrentAreaPluginOptions {
  getLowerBound: (chart: Chart) => number | undefined;
  getUpperBound: (chart: Chart) => number | undefined;
}

export const currentlyShownArea: Plugin = {
  id: "currentlyShownArea",
  afterDatasetsDraw: function (chart, args, options: CurrentAreaPluginOptions) {
    const eventStartX = options.getLowerBound?.(chart);
    const eventEndX = options.getUpperBound?.(chart);
    if (eventStartX === undefined || eventEndX === undefined) {
      return;
    }
    const {
      ctx,
      chartArea: { left, right, top, bottom },
    } = chart;
    const xMin = Math.min(eventStartX, eventEndX);
    const xMax = Math.max(eventStartX, eventEndX);
    ctx.fillStyle = "rgba(225,225,225,0.6)";
    ctx.beginPath();
    ctx.rect(left, bottom, xMin - left, top - bottom);
    ctx.rect(xMax, bottom, right - xMax, top - bottom);
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = "#3266ca";
    ctx.rect(xMin, bottom, xMax - xMin, top - bottom);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = "#3266ca";
    ctx.roundRect(xMin - 4, bottom, 8, top - bottom, 3);
    ctx.roundRect(xMax - 4, bottom, 8, top - bottom, 3);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "#fff";
    ctx.moveTo(xMin, (top + bottom) / 2 - 5);
    ctx.lineTo(xMin, (top + bottom) / 2 + 5);
    ctx.moveTo(xMax, (top + bottom) / 2 - 5);
    ctx.lineTo(xMax, (top + bottom) / 2 + 5);
    ctx.stroke();
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
    const { min, max } = chart.scales.x;
    if (hoverCoordinate < min || hoverCoordinate > max) {
      return;
    }
    const {
      ctx,
      chartArea: { left, right, top, bottom },
    } = chart;
    const hoverPosition = left + ((right - left) * (hoverCoordinate - min)) / (max - min);
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
