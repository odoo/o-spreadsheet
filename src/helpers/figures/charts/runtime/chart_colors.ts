import { Color } from "@odoo/o-spreadsheet-engine";
import { chartFontColor } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { Getters } from "@odoo/o-spreadsheet-engine/types/getters";
import { Range } from "@odoo/o-spreadsheet-engine/types/range";
import { resolveFigureBackgroundColor } from "../../figures_common";

interface EvaluationChartStyle {
  background: Color;
  fontColor: Color;
}

export function getStyleOfSingleCellChart(
  chartBackground: Color | undefined,
  mainRange: Range | undefined,
  getters: Getters
): EvaluationChartStyle {
  if (chartBackground || !mainRange) {
    const background = resolveFigureBackgroundColor(chartBackground, getters.isDarkMode());
    return { background, fontColor: chartFontColor(background) };
  }
  const col = mainRange.zone.left;
  const row = mainRange.zone.top;
  const sheetId = mainRange.sheetId;
  const style = getters.getCellComputedStyle({ sheetId, col, row });
  const background = resolveFigureBackgroundColor(style.fillColor, getters.isDarkMode());
  return {
    background,
    fontColor: style.textColor || chartFontColor(background),
  };
}
