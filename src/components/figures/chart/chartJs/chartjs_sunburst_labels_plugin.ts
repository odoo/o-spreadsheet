import { getDefaultContextFont, relativeLuminance, sliceTextToFitWidth } from "../../../../helpers";
import { GHOST_SUNBURST_VALUE } from "../../../../helpers/figures/charts/runtime/chartjs_dataset";
import { SunburstChartRawData } from "../../../../types/chart";

export interface ChartSunburstLabelsPluginOptions {
  showValues: boolean;
  showLabels: boolean;
  style: Style;
  callback: (value: number, axisId?: string) => string;
}

declare module "chart.js" {
  interface PluginOptionsByType<TType extends ChartType> {
    sunburstLabelsPlugin?: ChartSunburstLabelsPluginOptions;
  }
}

const Y_PADDING = 3;

export const sunburstLabelsPlugin: Plugin = {
  id: "sunburstLabelsPlugin",
  afterDatasetsDraw(chart: any, args, options: ChartSunburstLabelsPluginOptions) {
    if ((!options.showValues && !options.showLabels) || chart.config.type !== "doughnut") {
      return;
    }
    const ctx = chart.ctx as CanvasRenderingContext2D;
    drawSunburstChartValues(chart, options, ctx);
  },
};

function drawSunburstChartValues(
  chart: any,
  options: ChartSunburstLabelsPluginOptions,
  ctx: CanvasRenderingContext2D
) {
  const style = options.style;
  const fontSize = style.fontSize || 13;
  const lineHeight = fontSize + Y_PADDING;

  for (const dataset of chart._metasets) {
    for (let i = 0; i < dataset._dataset.data.length; i++) {
      const rawData = dataset._dataset.data[i] as SunburstChartRawData;
      if (rawData.label === GHOST_SUNBURST_VALUE) {
        continue;
      }
      const valuesToDisplay = [
        options.showLabels ? rawData.label : undefined,
        options.showValues ? options.callback(rawData.value, "y") : undefined,
      ].filter(isDefined);

      const arc = dataset.data[i];
      let { startAngle, endAngle, innerRadius, outerRadius, circumference } = arc;
      // Same computations as in ChartJs ArcElement's draw method. Don't ask me why they divide by 4.
      const offset = arc.options.offset / 4;
      const fix = 1 - Math.sin(Math.min(Math.PI, circumference || 0));
      const radiusOffset = offset * fix;
      innerRadius += radiusOffset;
      outerRadius += radiusOffset;

      const midAngle = (startAngle + endAngle) / 2;
      const midRadius = (innerRadius + outerRadius) / 2;

      const availableWidth = (outerRadius - innerRadius) * 0.9;
      const angle = endAngle - startAngle;
      const availableHeight =
        angle >= Math.PI ? outerRadius : Math.sin(angle / 2) * innerRadius * 2;
      if (availableHeight < valuesToDisplay.length * lineHeight) {
        continue;
      }

      ctx.save();

      const centerOffset = { x: Math.cos(midAngle) * offset, y: Math.sin(midAngle) * offset };
      const centerX = chart.chartArea.left + chart.chartArea.width / 2 + centerOffset.x;
      const centerY = chart.chartArea.top + chart.chartArea.height / 2 + centerOffset.y;
      ctx.translate(centerX, centerY);

      let x: number;
      if (midAngle > Math.PI / 2) {
        ctx.rotate(midAngle - Math.PI);
        x = -midRadius;
      } else {
        x = midRadius;
        ctx.rotate(midAngle);
      }

      const backgroundColor = arc.options.backgroundColor;
      const defaultColor = relativeLuminance(backgroundColor) > 0.7 ? "#666666" : "#FFFFFF";
      ctx.fillStyle = style.textColor || defaultColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = getDefaultContextFont(fontSize, style.bold, style.italic);

      const y = -((valuesToDisplay.length - 1) * lineHeight) / 2;
      for (let j = 0; j < valuesToDisplay.length; j++) {
        const fittedText = sliceTextToFitWidth(
          ctx,
          availableWidth,
          valuesToDisplay[j],
          style,
          "px"
        );
        ctx.fillText(fittedText, x, y + j * lineHeight);
      }

      ctx.restore();
    }
  }
}
