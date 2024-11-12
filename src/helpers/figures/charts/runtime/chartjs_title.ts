import { TitleOptions } from "chart.js";
import { _DeepPartialObject } from "chart.js/dist/types/utils";
import { CHART_PADDING, CHART_TITLE_FONT_SIZE } from "../../../../constants";
import { _t } from "../../../../translation";
import { ChartWithDataSetDefinition } from "../../../../types/chart";
import { chartMutedFontColor } from "../chart_common";

export function getChartTitle(
  definition: ChartWithDataSetDefinition
): _DeepPartialObject<TitleOptions> {
  const chartTitle = definition.title;
  const fontColor = chartMutedFontColor(definition.background);
  return {
    display: !!chartTitle.text,
    text: _t(chartTitle.text!),
    color: chartTitle?.color ?? fontColor,
    align:
      chartTitle.align === "center" ? "center" : chartTitle.align === "right" ? "end" : "start",
    font: {
      size: CHART_TITLE_FONT_SIZE,
      weight: chartTitle.bold ? "bold" : "normal",
      style: chartTitle.italic ? "italic" : "normal",
    },
    padding: {
      // Disable title top/left/right padding to use the chart padding instead.
      // The legend already has a top padding, so bottom padding is useless for the title there.
      bottom: definition.legendPosition === "top" ? 0 : CHART_PADDING,
    },
  };
}
