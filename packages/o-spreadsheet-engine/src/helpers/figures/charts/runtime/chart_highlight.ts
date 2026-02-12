import { Chart, ChartDataset, LegendItem } from "chart.js";
import { Color } from "../../../..";
import { LINE_FILL_TRANSPARENCY } from "../../../../constants";
import { setColorAlpha } from "../../../color";

export function highlightBarChartItem(item: LegendItem, dataSets: ChartDataset<"bar">[]) {
  const index = item.datasetIndex;
  for (let i = 0; i < dataSets.length; i++) {
    const dataset = dataSets[i];
    const color = setColorAlpha(
      dataset.backgroundColor as Color,
      i === index ? 1 : LINE_FILL_TRANSPARENCY
    );
    dataset.backgroundColor = color;
  }
}

export function resetBarChartHighlights(dataSets: ChartDataset<"bar">[]) {
  for (const dataset of dataSets) {
    const color = setColorAlpha(dataset.backgroundColor as Color, 1);
    dataset.backgroundColor = color;
  }
}

export function highlightComboChartItem(
  item: LegendItem,
  dataSets: ChartDataset<"bar" | "line">[]
) {
  const index = item.datasetIndex;
  for (let i = 0; i < dataSets.length; i++) {
    const dataset = dataSets[i];
    const color = setColorAlpha(
      dataset.borderColor as Color,
      i === index ? 1 : LINE_FILL_TRANSPARENCY
    );
    dataset.borderColor = color;
    dataset.backgroundColor = color;
  }
}

export function resetComboChartHighlights(dataSets: ChartDataset<"bar" | "line">[]) {
  for (const dataset of dataSets) {
    const color = setColorAlpha(dataset.borderColor as Color, 1);
    dataset.borderColor = color;
    dataset.backgroundColor = color;
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
      i === index ? 1 : LINE_FILL_TRANSPARENCY
    );
    dataset.borderColor = color;
    dataset.pointBackgroundColor = color;
    dataset.backgroundColor = setColorAlpha(
      dataset.backgroundColor as Color,
      LINE_FILL_TRANSPARENCY * (i === index ? 1 : LINE_FILL_TRANSPARENCY)
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
      colors[i] = setColorAlpha(color, i === item.index ? 1 : LINE_FILL_TRANSPARENCY);
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
