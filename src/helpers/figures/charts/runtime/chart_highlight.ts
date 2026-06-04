import { Chart, ChartDataset, LegendItem } from "chart.js";
import { Color } from "../../../..";
import { LINE_FILL_TRANSPARENCY } from "../../../../constants";
import { setColorAlpha } from "../../../color";

const HIGHLIGHT_TRANSPARENCY = 0.2;

export function highlightComboChartItem(
  item: LegendItem,
  dataSets: ChartDataset<"bar" | "line">[]
) {
  const index = item.datasetIndex;
  for (let i = 0; i < dataSets.length; i++) {
    if (i === index) {
      continue;
    }
    const dataset = dataSets[i];
    for (const key of ["borderColor", "backgroundColor"] as const) {
      if (!(key in dataset)) {
        continue;
      }
      const color = setColorAlpha(dataset[key] as Color, i === index ? 1 : HIGHLIGHT_TRANSPARENCY);
      dataset[key] = color;
    }
  }
}

export function resetComboChartHighlights(dataSets: ChartDataset<"bar" | "line">[]) {
  for (const dataset of dataSets) {
    for (const key of ["borderColor", "backgroundColor"] as const) {
      if (!(key in dataset)) {
        continue;
      }
      const color = setColorAlpha(dataset[key] as Color, 1);
      dataset[key] = color;
    }
  }
}

export function highlightLineChartItem(
  item: LegendItem,
  dataSets: ChartDataset<"line" | "radar">[]
) {
  const index = item.datasetIndex;
  for (let i = 0; i < dataSets.length; i++) {
    const dataset = dataSets[i];
    const color = setColorAlpha(
      dataset.borderColor as Color,
      i === index ? 1 : HIGHLIGHT_TRANSPARENCY
    );
    dataset.borderColor = color;
    dataset.pointBackgroundColor = color;
    dataset.backgroundColor = setColorAlpha(
      dataset.backgroundColor as Color,
      LINE_FILL_TRANSPARENCY * (i === index ? 1 : HIGHLIGHT_TRANSPARENCY)
    );
  }
}

export function resetLineChartHighlights(dataSets: ChartDataset<"line" | "radar">[]) {
  for (const dataset of dataSets) {
    const color = setColorAlpha(dataset.borderColor as Color, 1);
    dataset.borderColor = color;
    dataset.pointBackgroundColor = color;
    dataset.backgroundColor = setColorAlpha(
      dataset.backgroundColor as Color,
      LINE_FILL_TRANSPARENCY
    );
  }
}

export function highlightBubbleChartItem(item: LegendItem, dataSets: ChartDataset<"line">[]) {
  const dataset = dataSets[0];
  const backgroundColors = dataset.hoverBackgroundColor;
  const borderColors = dataset.hoverBorderColor;
  if (!Array.isArray(backgroundColors) || !Array.isArray(borderColors)) {
    return;
  }
  dataset.backgroundColor = backgroundColors.map((color, i) =>
    setColorAlpha(color, i === item.datasetIndex ? 1 : HIGHLIGHT_TRANSPARENCY)
  );
  dataset.borderColor = borderColors.map((color, i) =>
    setColorAlpha(color, i === item.datasetIndex ? 1 : HIGHLIGHT_TRANSPARENCY)
  );
}

export function resetBubbleChartHighlights(dataSets: ChartDataset<"line">[]) {
  const dataset = dataSets[0];
  const backgroundColors = dataset.hoverBackgroundColor;
  const borderColors = dataset.hoverBorderColor;
  if (!Array.isArray(backgroundColors) || !Array.isArray(borderColors)) {
    return;
  }
  dataset.backgroundColor = [...backgroundColors];
  dataset.borderColor = [...borderColors];
}

export function toggleLineBarDataVisibility(
  chart: Chart<"line" | "bar" | "radar">,
  item: LegendItem
) {
  const index = item.datasetIndex;
  if (index === undefined) {
    return;
  }
  if (chart.isDatasetVisible(index)) {
    chart.hide(index);
  } else {
    chart.show(index);
  }
}

export function highlightPieChartItem(item: LegendItem, dataSets: ChartDataset<"pie">[]) {
  for (const dataset of dataSets) {
    const backgroundColors = dataset.backgroundColor as Color[] | undefined;
    if (!backgroundColors) {
      return;
    }
    backgroundColors.forEach((color, i, colors) => {
      colors[i] = setColorAlpha(color, i === item.index ? 1 : HIGHLIGHT_TRANSPARENCY);
    });
  }
}

export function resetPieChartHighlights(dataSets: ChartDataset<"pie">[]) {
  for (const dataset of dataSets) {
    const backgroundColors = dataset.backgroundColor as Color[] | undefined;
    if (!backgroundColors) {
      return;
    }
    backgroundColors.forEach((color, i, colors) => {
      colors[i] = setColorAlpha(color, 1);
    });
  }
}

export function togglePieDataVisibility(chart: Chart, item: LegendItem) {
  const index = item.index;
  if (index === undefined) {
    return;
  }
  chart.toggleDataVisibility(index);
}
