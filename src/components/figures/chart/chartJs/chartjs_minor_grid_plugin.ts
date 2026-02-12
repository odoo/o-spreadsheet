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
      const showMajorGrid = options?.grid?.display;
      const ticks = scale.ticks;
      if (!ticks || ticks.length < 2) {
        continue;
      }

      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = minor.color ?? options?.grid?.color ?? "#e6e6e6";

      for (let i = 0; i < ticks.length - 1; i++) {
        const start = scale.getPixelForTick(i);
        const end = scale.getPixelForTick(i + 1);
        if (!isFinite(start) || !isFinite(end)) {
          continue;
        }
        for (let j = showMajorGrid ? 1 : 0; j < 4; j++) {
          const ratio = j / 4;
          const position = Math.round(start + (end - start) * ratio) + 0.5;
          ctx.beginPath();
          if (scale.isHorizontal()) {
            ctx.moveTo(position, chartArea.top);
            ctx.lineTo(position, chartArea.bottom);
          } else {
            ctx.moveTo(chartArea.left, position);
            ctx.lineTo(chartArea.right, position);
          }
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  },
};
