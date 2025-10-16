import { Chart } from "chart.js";
import { Color } from "../../../..";

interface MinorGridOptions {
  display?: boolean;
  divisions?: number;
  color?: Color;
  lineWidth?: number;
  borderDash?: number[];
  opacity?: number;
}

export const chartMinorGridPlugin = {
  id: "o-spreadsheet-minor-gridlines",
  beforeDatasetsDraw(chart: Chart) {
    const ctx = chart.ctx;
    const chartArea = chart.chartArea;
    if (!chartArea) {
      return;
    }

    for (const scaleId of Object.keys(chart.scales)) {
      const scale = chart.scales[scaleId];
      const options = scale.options as any;
      const minor: MinorGridOptions | undefined = options?.grid?.minor;
      if (!minor?.display) {
        continue;
      }
      const ticks = scale.ticks;
      if (!ticks || ticks.length < 2) {
        continue;
      }
      const divisions = minor.divisions ?? 4;
      if (!divisions || divisions < 1) {
        continue;
      }

      const strokeStyle = minor.color ?? options?.grid?.color ?? "#bdbdbd";
      const lineWidth = minor.lineWidth ?? options?.grid?.lineWidth ?? 1 / 2;
      const dash = minor.borderDash ?? options?.grid?.borderDash ?? [];
      const opacity = minor.opacity ?? 0.6;

      ctx.save();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeStyle;
      ctx.setLineDash(dash);
      ctx.globalAlpha = opacity;

      const drawVerticalLine = (x: number) => {
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();
      };
      const drawHorizontalLine = (y: number) => {
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
      };

      for (let i = 0; i < ticks.length - 1; i++) {
        const start = scale.getPixelForTick(i);
        const end = scale.getPixelForTick(i + 1);
        if (!isFinite(start) || !isFinite(end)) {
          continue;
        }
        for (let j = 1; j < divisions; j++) {
          const ratio = j / divisions;
          const position = start + (end - start) * ratio;
          if (scale.isHorizontal()) {
            drawVerticalLine(position);
          } else {
            drawHorizontalLine(position);
          }
        }
      }

      ctx.restore();
    }
  },
};
