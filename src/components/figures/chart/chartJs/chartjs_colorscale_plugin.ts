import { ChartType, Plugin } from "chart.js";
import { Color, Locale } from "../../../..";
import {
  CHART_AXIS_TITLE_FONT_SIZE,
  CHART_COLORSCALE_WIDTH,
  CHART_PADDING,
} from "../../../../constants";
import { getDefaultContextFont, humanizeNumber } from "../../../../helpers";

export interface ChartColorScalePluginOptions {
  position: "left" | "right" | "none";
  colorScale: Color[];
  fontColor?: Color;
  minValue: number;
  maxValue: number;
  locale: Locale;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    chartColorScalePlugin?: ChartColorScalePluginOptions;
  }
}

/** This is a chartJS plugin that will draw the values of each data next to the point/bar/pie slice */
export const chartColorScalePlugin: Plugin = {
  id: "chartColorScalePlugin",
  afterDatasetsDraw(chart: any, args, options: ChartColorScalePluginOptions) {
    if (!options.position || options.position === "none" || !options.colorScale.length) {
      return;
    }
    const ctx = chart.ctx as CanvasRenderingContext2D;
    ctx.save();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.miterLimit = 1; // Avoid sharp artifacts on strokeText

    const gradientHeight = (chart.chartArea.bottom - chart.chartArea.top) / 2;
    const gradientWidth = 10;
    const gradientX =
      options.position === "left" ? CHART_PADDING : ctx.canvas.width - CHART_COLORSCALE_WIDTH;
    const gradientY = chart.chartArea.top;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, gradientY, 0, gradientY + gradientHeight);
    const step = 1 / (options.colorScale.length - 1);
    options.colorScale.forEach((color, index) => {
      gradient.addColorStop(index * step, color);
    });

    // Draw gradient rectangle
    ctx.fillStyle = gradient;
    ctx.fillRect(gradientX, gradientY, gradientWidth, gradientHeight);

    // Draw min and max labels
    ctx.fillStyle = options.fontColor ?? "black";
    ctx.font = getDefaultContextFont(CHART_AXIS_TITLE_FONT_SIZE);
    ctx.textAlign = "left";
    const minValue = Math.round(options.minValue * 100) / 100;
    const maxValue = Math.round(options.maxValue * 100) / 100;
    const formattedMaxValue = humanizeNumber(
      { value: maxValue, format: undefined },
      options.locale
    );
    const formattedMinValue = humanizeNumber(
      { value: minValue, format: undefined },
      options.locale
    );
    ctx.fillText(formattedMinValue, gradientX + gradientWidth + 5, gradientY + gradientHeight - 6);
    ctx.fillText(formattedMaxValue, gradientX + gradientWidth + 5, gradientY + 6);

    ctx.restore();
  },
};
