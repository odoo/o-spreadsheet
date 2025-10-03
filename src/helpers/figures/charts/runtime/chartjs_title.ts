import { CHART_PADDING, CHART_TITLE_FONT_SIZE } from "@odoo/o-spreadsheet-engine/constants";
import { ChartWithDataSetDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { TitleOptions } from "chart.js";
import { _DeepPartialObject } from "chart.js/dist/types/utils";
import { Getters } from "../../../../types";
import { chartMutedFontColor } from "../chart_common";

export function getChartTitle(
  definition: ChartWithDataSetDefinition,
  getters: Getters
): _DeepPartialObject<TitleOptions> {
  const chartTitle = definition.title;
  const fontColor = chartMutedFontColor(definition.background);
  return {
    display: !!chartTitle.text,
    text: chartTitle.text ? getters.dynamicTranslate(chartTitle.text) : "",
    color: chartTitle?.color ?? fontColor,
    align:
      chartTitle.align === "center" ? "center" : chartTitle.align === "right" ? "end" : "start",
    font: {
      size: definition.title.fontSize ?? CHART_TITLE_FONT_SIZE,
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
