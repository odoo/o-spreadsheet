import { ChartDataset } from "chart.js";
import { Color } from "../../../..";
import { ChartType } from "../../../../types/chart";
import { setColorAlpha } from "../../../color";

export function getHighlightsHelpers(type: ChartType) {
  switch (type) {
    case "scatter":
    case "radar":
    case "line":
      return {
        highlightItem: highlightLineChartItem,
        unHighlightItems: unHighlightLineChartItems,
      };
    case "bar":
      return {
        highlightItem: highlightBarChartItem,
        unHighlightItems: unHighlightBarChartItems,
      };
    case "pie":
      return {
        highlightItem: highlightPieChartItem,
        unHighlightItems: unHighlightPieChartItems,
      };
    case "combo":
      return {
        highlightItem: highlightComboChartItem,
        unHighlightItems: unHighlightComboChartItems,
      };
    default:
      return {
        highlightItem: () => {},
        unHighlightItems: () => {},
      };
  }
}

function highlightPieChartItem(item: { index?: number }, dataSets: ChartDataset[]) {
  const index = item.index;
  dataSets.forEach((dataset) => {
    const backgroundColors = dataset.backgroundColor as Color[] | undefined;
    if (!backgroundColors) {
      return;
    }
    backgroundColors.forEach((color, i, colors) => {
      colors[i] = setColorAlpha(color, i === index ? 1 : 0.4);
    });
  });
}

function highlightLineChartItem(item: { datasetIndex?: number }, dataSets: ChartDataset[]) {
  const index = item.datasetIndex;
  dataSets.forEach((dataset, i) => {
    const color = setColorAlpha(dataset.borderColor as Color, i === index ? 1 : 0.4);
    dataset.borderColor = color;
    dataset["pointBackgroundColor"] = color;
  });
}

function highlightBarChartItem(item: { datasetIndex?: number }, dataSets: ChartDataset[]) {
  const index = item.datasetIndex;
  dataSets.forEach((dataset, i) => {
    const color = setColorAlpha(dataset.backgroundColor as Color, i === index ? 1 : 0.4);
    dataset.backgroundColor = color;
  });
}

function highlightComboChartItem(item: { datasetIndex?: number }, dataSets: ChartDataset[]) {
  const index = item.datasetIndex;
  dataSets.forEach((dataset, i) => {
    const color = setColorAlpha(dataset.borderColor as Color, i === index ? 1 : 0.4);
    dataset.borderColor = color;
    dataset.backgroundColor = color;
  });
}

function unHighlightLineChartItems(dataSets: ChartDataset[]) {
  dataSets.forEach((dataset) => {
    const color = setColorAlpha(dataset.borderColor as Color, 1);
    dataset.borderColor = color;
    dataset["pointBackgroundColor"] = color;
  });
}

function unHighlightBarChartItems(dataSets: ChartDataset[]) {
  dataSets.forEach((dataset) => {
    const color = setColorAlpha(dataset.backgroundColor as Color, 1);
    dataset.backgroundColor = color;
  });
}

function unHighlightComboChartItems(dataSets: ChartDataset[]) {
  dataSets.forEach((dataset) => {
    const color = setColorAlpha(dataset.borderColor as Color, 1);
    dataset.borderColor = color;
    dataset.backgroundColor = color;
  });
}

function unHighlightPieChartItems(dataSets: ChartDataset[]) {
  dataSets.forEach((dataset) => {
    const backgroundColors = dataset.backgroundColor as Color[] | undefined;
    if (!backgroundColors) {
      return;
    }
    backgroundColors.forEach((color, i, colors) => {
      colors[i] = setColorAlpha(color, 1);
    });
  });
}

export function getChartMouseOutPlugin(type: ChartType) {
  const unHighlightItems = getHighlightsHelpers(type).unHighlightItems;
  return {
    id: "eventPlugin",
    afterEvent(c, args, _) {
      if (args.event.type === "mouseout") {
        unHighlightItems(c.data.datasets);
        c.update();
      }
    },
  };
}
