import { ChartType, Plugin } from "chart.js";
import {
  CHART_AXIS_TITLE_FONT_SIZE,
  CHART_COLORSCALE_WIDTH,
  CHART_PADDING,
  GRAY_300,
} from "../../../../constants";
import { getColorGridLegendCorner } from "../../../../helpers/figures/charts/chart_common";
import { humanizeNumber } from "../../../../helpers/format/format";
import { getDefaultContextFont } from "../../../../helpers/text_helper";
import { _t } from "../../../../translation";
import { LegendPosition } from "../../../../types/chart/common_chart";
import { Locale } from "../../../../types/locale";
import { Color } from "../../../../types/misc";

export interface ChartColorScalePluginOptions {
  position: LegendPosition;
  colorScale: Color[];
  fontColor?: Color;
  minValue: number;
  maxValue: number;
  locale: Locale;
  missingValueColor?: Color;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    chartColorScalePlugin?: ChartColorScalePluginOptions;
  }
}

/** This is a chartJS plugin that will draw the heatmap colorscale at the chart legend position */
export const chartColorScalePlugin: Plugin = {
  id: "chartColorScalePlugin",
  afterDatasetsDraw(chart: any, args, options: ChartColorScalePluginOptions) {
    if (!options.position || !options.colorScale?.length) {
      return;
    }
    const corner = getColorGridLegendCorner(options.position);
    if (corner === undefined) {
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
      corner.horizontal === "left" ? CHART_PADDING : ctx.canvas.width - CHART_COLORSCALE_WIDTH;
    const missingValueHeight = options.missingValueColor ? 20 + gradientWidth : 0;
    const totalHeight = gradientHeight + missingValueHeight;
    const gradientY =
      corner.vertical === "top" ? chart.chartArea.top : chart.chartArea.bottom - totalHeight;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, gradientY + gradientHeight, 0, gradientY);
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
    let minValue = Math.round(options.minValue * 100) / 100;
    let maxValue = Math.round(options.maxValue * 100) / 100;
    if (options.minValue === options.maxValue) {
      minValue -= 1;
      maxValue += 1;
    }
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

    if (options.missingValueColor) {
      const missingValueY = gradientY + gradientHeight + 20;

      ctx.fillStyle = options.missingValueColor;
      ctx.fillRect(gradientX, missingValueY, gradientWidth, gradientWidth);
      ctx.strokeStyle = GRAY_300;
      ctx.lineWidth = 1;
      ctx.strokeRect(gradientX, missingValueY, gradientWidth, gradientWidth);

      ctx.fillStyle = options.fontColor ?? "black";
      ctx.fillText(_t("No Data"), gradientX + gradientWidth + 5, missingValueY + gradientWidth / 2);
    }

    ctx.restore();
  },
};
