import { CAROUSEL_LAYOUT, DEFAULT_CAROUSEL_TITLE_STYLE } from "../constants";
import { chartSubtypeRegistry } from "../registries/chart_subtype_registry";
import { ViewportsStore } from "../stores/viewports_store";
import { _t } from "../translation";
import { AnchorOffset, Carousel, CarouselItem } from "../types/figure";
import { Getters } from "../types/getters";
import { UID } from "../types/misc";
import { Rect } from "../types/rendering";
import { SpreadsheetChildEnv } from "../types/spreadsheet_env";

/**
 * Compute the anchor of a chart popped out of a carousel: slightly offset from the
 * carousel figure so the new chart does not perfectly overlap it.
 */
export function getPoppedOutChartAnchor(
  env: SpreadsheetChildEnv,
  sheetId: UID,
  carouselId: UID
): AnchorOffset {
  const figure = env.model.getters.getFigure(sheetId, carouselId);
  if (!figure) {
    throw new Error(`Could not find figure with id ${carouselId} in sheet ${sheetId}`);
  }
  const figureUI = env.model.getters.getFigureUI(sheetId, figure);
  return env.getStore(ViewportsStore).viewports.getPositionAnchorOffset(sheetId, {
    x: figureUI.x + 50,
    y: figureUI.y + 50,
  });
}

export function getCarouselItemPreview(getters: Getters, item: CarouselItem): string {
  if (item.type === "carouselDataView") {
    return "o-spreadsheet-Icon.DATA";
  }
  const definition = getters.getChartDefinition(item.chartId);
  const matchedChart =
    chartSubtypeRegistry.getAll().find((c) => c.matcher?.(definition)) ||
    chartSubtypeRegistry.get(definition.type);
  return matchedChart.preview;
}

export function getCarouselItemTitle(getters: Getters, item: CarouselItem): string {
  if (item.title) {
    return getters.dynamicTranslate(item.title);
  }
  if (item.type === "carouselDataView") {
    return _t("Data");
  }
  const definition = getters.getChartDefinition(item.chartId);
  const matchedChart =
    chartSubtypeRegistry.getAll().find((c) => c.matcher?.(definition)) ||
    chartSubtypeRegistry.get(definition.type);
  return matchedChart.displayName;
}

export function getCarouselLayout(
  figureRect: Rect,
  carousel: Carousel,
  selectedItem: CarouselItem | undefined
) {
  const layout = CAROUSEL_LAYOUT;
  const title = { ...DEFAULT_CAROUSEL_TITLE_STYLE, ...carousel.title };

  const x = figureRect.x + layout.paddingX;
  const width = Math.max(0, figureRect.width - 2 * layout.paddingX);

  const titleHeight = title.text ? title.fontSize * layout.headerLineHeight : 0;
  const headerRect: Rect = {
    x,
    y: figureRect.y + layout.paddingY + layout.headerPaddingTop,
    width,
    height: Math.max(layout.minHeaderHeight, titleHeight),
  };

  const headerBottom = headerRect.y + headerRect.height;
  const separatorRect: Rect | undefined = title.text
    ? { x, y: headerBottom + layout.paddingY, width, height: layout.separatorWidth }
    : undefined;

  const contentPaddingTop = selectedItem?.type === "carouselDataView" ? layout.paddingY : 0;
  const rectAboveContent = separatorRect || headerRect;
  const contentY = rectAboveContent.y + rectAboveContent.height + contentPaddingTop;
  const contentBottom = figureRect.y + figureRect.height - layout.paddingY;
  const contentRect: Rect = {
    x,
    y: contentY,
    width,
    height: Math.max(0, contentBottom - contentY),
  };

  return { headerRect, separatorRect, contentRect, headerLineHeight: layout.headerLineHeight };
}
