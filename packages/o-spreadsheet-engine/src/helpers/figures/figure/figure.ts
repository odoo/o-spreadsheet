import { HeaderIndex, PixelPosition, UID } from "../../..";
import { AnchorOffset, FigureSize } from "../../../types/figure";
import { Getters } from "../../../types/getters";
import { deepCopy } from "../../misc";

export function centerFigurePosition(getters: Getters, size: FigureSize): AnchorOffset {
  const { scrollX, scrollY } = getters.getActiveSheetScrollInfo();
  const dim = getters.getSheetViewDimension();

  const posX = scrollX + Math.max(0, (dim.width - size.width) / 2);
  const posY = scrollY + Math.max(0, (dim.height - size.height) / 2);
  return getters.getPositionAnchorOffset({ x: posX, y: posY });
}

export function getMaxFigureSize(getters: Getters, figureSize: FigureSize): FigureSize {
  const size = deepCopy(figureSize);
  const dim = getters.getSheetViewDimension();
  const maxWidth = dim.width;
  const maxHeight = dim.height;
  if (size.width > maxWidth) {
    const ratio = maxWidth / size.width;
    size.width = maxWidth;
    size.height = size.height * ratio;
  }
  if (size.height > maxHeight) {
    const ratio = maxHeight / size.height;
    size.height = maxHeight;
    size.width = size.width * ratio;
  }
  return size;
}

export function getColRowOffset(
  getters: Getters,
  sheetId: UID,
  col: HeaderIndex,
  row: HeaderIndex,
  offset: PixelPosition
) {
  offset = { ...offset };
  for (
    let colSize = getters.getColSize(sheetId, col);
    offset.x > colSize;
    colSize = getters.getColSize(sheetId, col)
  ) {
    col += 1;
    offset.x -= colSize;
  }
  for (
    let rowSize = getters.getRowSize(sheetId, row);
    offset.y > rowSize;
    rowSize = getters.getRowSize(sheetId, row)
  ) {
    row += 1;
    offset.y -= rowSize;
  }
  return { col, row, offset };
}
