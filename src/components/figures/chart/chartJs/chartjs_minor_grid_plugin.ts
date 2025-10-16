import { Chart } from "chart.js";
import { Color } from "../../../..";

interface MinorGridOptions {
  display?: boolean;
  color?: Color;
}

export const chartMinorGridPlugin = {
  id: "o-spreadsheet-minor-gridlines",
  beforeDatasetsDraw(chart: Chart) {
    const ctx = chart.ctx;
    const chartArea = chart.chartArea;
    if (!chartArea) {
      return;
    }

    for (const scaleId in chart.scales) {
      const scale = chart.scales[scaleId];
      const options: any = scale.options;
      const minor: MinorGridOptions | undefined = options?.grid?.minor;
      if (!minor?.display) {
        continue;
      }
      const ticks = scale.ticks;
      if (!ticks || ticks.length < 2) {
        continue;
      }

      ctx.save();
      ctx.lineWidth = 1 / 2;
      ctx.strokeStyle = minor.color ?? options?.grid?.color ?? "#bdbdbd";
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.6;

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
        for (let j = 1; j < 4; j++) {
          const ratio = j / 4;
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
