import { Carousel, CarouselItem, Position, Rect, UID } from "../../..";
import { CAROUSEL_LAYOUT, DEFAULT_CAROUSEL_TITLE_STYLE } from "../../../constants";
import { ViewportsStore } from "../../../stores/viewports_store";
import { AnchorOffset, Figure, FigureSize } from "../../../types/figure";
import { Getters } from "../../../types/getters";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { deepCopy } from "../../misc";

const MAX_FIGURE_WIDTH = 1000;
const MAX_FIGURE_HEIGHT = 1000;

export function centerFigurePosition(env: SpreadsheetChildEnv, size: FigureSize): AnchorOffset {
  const viewStore = env.getStore(ViewportsStore);
  const { scrollX, scrollY } = viewStore.activeSheetScrollInfo;
  const dim = viewStore.sheetViewDimension;

  const posX = scrollX + Math.max(0, (dim.width - size.width) / 2);
  const posY = scrollY + Math.max(0, (dim.height - size.height) / 2);
  const sheetId = env.model.getters.getActiveSheetId();
  return viewStore.viewports.getPositionAnchorOffset(sheetId, { x: posX, y: posY });
}

export function getMaxFigureSize(figureSize: FigureSize): FigureSize {
  const size = deepCopy(figureSize);
  if (size.width > MAX_FIGURE_WIDTH) {
    const ratio = MAX_FIGURE_WIDTH / size.width;
    size.width = MAX_FIGURE_WIDTH;
    size.height = size.height * ratio;
  }
  if (size.height > MAX_FIGURE_HEIGHT) {
    const ratio = MAX_FIGURE_HEIGHT / size.height;
    size.height = MAX_FIGURE_HEIGHT;
    size.width = size.width * ratio;
  }
  return size;
}

/*
 * Return col, row and offset where offset is within the cell at col/row
 * keeping the position similar
 */
export function boundColRowOffsetInSheet(
  getters: Getters,
  sheetId: UID,
  position: Position,
  figure: Figure
) {
  const maxPosition = getters.getMaxAnchorOffset(sheetId, figure.height, figure.width);
  let { col, row } = position;
  const offset = { ...figure.offset };
  for (
    let colSize = getters.getColSize(sheetId, col);
    offset.x > colSize;
    colSize = getters.getColSize(sheetId, col)
  ) {
    col += 1;
    offset.x -= colSize;
  }
  if (col > maxPosition.col) {
    col = maxPosition.col;
    offset.x = maxPosition.offset.x;
  }
  for (
    let rowSize = getters.getRowSize(sheetId, row);
    offset.y > rowSize;
    rowSize = getters.getRowSize(sheetId, row)
  ) {
    row += 1;
    offset.y -= rowSize;
  }
  if (row > maxPosition.row) {
    row = maxPosition.row;
    offset.y = maxPosition.offset.y;
  }
  return { col, row, offset };
}

export function getCarouselLayout(fullRect: Rect, carousel: Carousel, selectedItem: CarouselItem) {
  const layout = CAROUSEL_LAYOUT;
  const { paddingY, paddingX } = layout;

  const innerWidth = fullRect.width - paddingX * 2;
  const innerHeight = fullRect.height - layout.paddingY * 2;

  const title = { ...DEFAULT_CAROUSEL_TITLE_STYLE, ...carousel.title };
  const headerSize = Math.max(title.fontSize * 1.5, layout.minHeaderHeight);
  const headerGap = title.text
    ? layout.headerPaddingBeforeSeparator + layout.headerBorderBottomWidth
    : 0;

  const headerRect: Rect = {
    x: fullRect.x + paddingX,
    y: fullRect.y + layout.paddingY + layout.headerPaddingTop,
    width: innerWidth,
    height: headerSize,
  };

  const contentY = headerRect.y + headerSize + headerGap;
  const isDataView = selectedItem.type === "carouselDataView";
  const contentPaddingTop = isDataView ? layout.dataViewContentPaddingTop : 0;
  const contentPaddingBottom = isDataView ? layout.dataViewContentPaddingBottom : 0;
  const contentRect: Rect = {
    x: fullRect.x + paddingX + contentPaddingTop,
    y: contentY,
    width: innerWidth,
    height:
      innerHeight - headerSize - headerGap - contentPaddingTop - contentPaddingBottom - paddingY,
  };

  return { fullRect, headerRect, contentRect };
}
