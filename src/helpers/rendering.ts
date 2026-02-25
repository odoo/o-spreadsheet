import { toHex } from "@odoo/o-spreadsheet-engine/helpers/color";
import { GridRenderingContext, GridRenderingTheme, Highlight, Rect } from "../types";

import {
  BACKGROUND_HEADER_ACTIVE_COLOR,
  BACKGROUND_HEADER_COLOR,
  BACKGROUND_HEADER_SELECTED_COLOR,
  CELL_BORDER_COLOR,
  FROZEN_PANE_BORDER_COLOR,
  FROZEN_PANE_HEADER_BORDER_COLOR,
  GRAY_200_DARK,
  GRAY_700,
  HEADER_BORDER_COLOR,
  HIGHLIGHT_COLOR,
  TEXT_HEADER_COLOR,
} from "@odoo/o-spreadsheet-engine/constants";
import { setColorAlpha } from "@odoo/o-spreadsheet-engine/helpers/color";

export function drawHighlight(
  renderingContext: GridRenderingContext,
  highlight: Highlight,
  rect: Rect
) {
  const { x, y, width, height } = rect;
  if (width < 0 || height < 0) {
    return;
  }
  const color = highlight.color || HIGHLIGHT_COLOR;

  const { ctx } = renderingContext;
  ctx.save();
  if (!highlight.noBorder) {
    if (highlight.dashed) {
      ctx.setLineDash([5, 3]);
    }
    ctx.strokeStyle = color;
    if (highlight.thinLine) {
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
    } else {
      ctx.lineWidth = 2;
      /** + 0.5 offset to have sharp lines. See comment in {@link RendererPlugin#drawBorder} for more details */
      ctx.strokeRect(x + 0.5, y + 0.5, width, height);
    }
  }
  if (!highlight.noFill) {
    ctx.fillStyle = setColorAlpha(toHex(color), highlight.fillAlpha ?? 0.12);
    ctx.fillRect(x, y, width, height);
  }
  ctx.restore();
}

export function getSpreadsheetTheme(isDarkMode: boolean): GridRenderingTheme {
  const target = document.querySelector(".o-spreadsheet") as HTMLElement;
  const style = target ? window.getComputedStyle(target) : undefined;
  return {
    backgroundColor:
      style?.getPropertyValue("--os-view-bg")?.trim() || (isDarkMode ? GRAY_200_DARK : "#ffffff"),
    textColor:
      style?.getPropertyValue("--os-cell-text-color")?.trim() ||
      (isDarkMode ? "#d1d5db" : "#000000"),
    gridBorderColor: isDarkMode ? GRAY_700 : CELL_BORDER_COLOR,
    headerBackgroundColor: isDarkMode ? GRAY_200_DARK : BACKGROUND_HEADER_COLOR,
    headerActiveBackgroundColor: isDarkMode ? "#4b5563" : BACKGROUND_HEADER_ACTIVE_COLOR,
    headerSelectedBackgroundColor: isDarkMode ? "#374151" : BACKGROUND_HEADER_SELECTED_COLOR,
    headerTextColor: isDarkMode ? "#d1d5db" : TEXT_HEADER_COLOR,
    headerBorderColor: isDarkMode ? "#4b5563" : HEADER_BORDER_COLOR,
    frozenPaneBorderColor: isDarkMode ? "#4b5563" : FROZEN_PANE_BORDER_COLOR,
    frozenPaneHeaderBorderColor:
      style?.getPropertyValue("--os-frozen-pane-header-border-color")?.trim() ??
      (isDarkMode ? "#4b5563" : FROZEN_PANE_HEADER_BORDER_COLOR),
  };
}
