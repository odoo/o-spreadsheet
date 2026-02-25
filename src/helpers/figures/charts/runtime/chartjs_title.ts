import { CHART_PADDING, CHART_TITLE_FONT_SIZE } from "@odoo/o-spreadsheet-engine/constants";
import { figureMutedFontColor } from "@odoo/o-spreadsheet-engine/helpers/figures/figure/figure";
import {
  ChartRuntimeGenerationArgs,
  ChartWithDataSetDefinition,
} from "@odoo/o-spreadsheet-engine/types/chart";
import { Getters } from "@odoo/o-spreadsheet-engine/types/getters";
import { TitleOptions } from "chart.js";
import { _DeepPartialObject } from "chart.js/dist/types/utils";

export function getChartTitle(
  definition: ChartWithDataSetDefinition,
  args: ChartRuntimeGenerationArgs,
  getters: Getters
): _DeepPartialObject<TitleOptions> {
  const chartTitle = definition.title;
  let color = chartTitle.color;
  if (args.colorAdapter && color) {
    color = args.colorAdapter(color);
  } else if (!color) {
    color = figureMutedFontColor(args.background);
  }
  return {
    display: !!chartTitle.text,
    text: chartTitle.text ? getters.dynamicTranslate(chartTitle.text) : "",
    color,
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
