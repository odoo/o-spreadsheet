import { TitleOptions } from "chart.js";
import { CHART_PADDING, CHART_TITLE_FONT_SIZE } from "../../../../constants";
import { DeepPartial, TitleDesign } from "../../../../types";
import { Getters } from "../../../../types/getters";
import { chartMutedFontColor } from "../chart_common";

export function getChartTitle(
  {
    title,
    legendPosition,
    background,
  }: { title: TitleDesign; legendPosition: string; background?: string },
  getters: Getters
): DeepPartial<TitleOptions> {
  const fontColor = chartMutedFontColor(background);
  return {
    display: !!title.text,
    text: title.text ? getters.dynamicTranslate(title.text) : "",
    color: title?.color ?? fontColor,
    align: title.align === "center" ? "center" : title.align === "right" ? "end" : "start",
    font: {
      size: title.fontSize ?? CHART_TITLE_FONT_SIZE,
      weight: title.bold ? "bold" : "normal",
      style: title.italic ? "italic" : "normal",
    },
    padding: {
      // Disable title top/left/right padding to use the chart padding instead.
      // The legend already has a top padding, so bottom padding is useless for the title there.
      bottom: legendPosition === "top" ? 0 : CHART_PADDING,
    },
  };
}
