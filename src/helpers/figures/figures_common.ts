import { Color } from "@odoo/o-spreadsheet-engine";
import { BACKGROUND_CHART_COLOR, GRAY_200_DARK } from "@odoo/o-spreadsheet-engine/constants";

/**
 * Resolve the background color of a chart.
 * If no background color is provided, it returns the theme background color.
 */
export function resolveFigureBackgroundColor(
  backgroundColor: Color | undefined,
  isDarkMode: boolean
): Color {
  if (backgroundColor) {
    return backgroundColor;
  }
  return isDarkMode ? GRAY_200_DARK : BACKGROUND_CHART_COLOR;
}
