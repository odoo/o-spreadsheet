import { AnchorOffset, FigureSize, Getters } from "../../../types";
import { deepCopy } from "../../misc";

export function centerFigurePosition(getters: Getters, size: FigureSize): AnchorOffset {
  const { x: offsetCorrectionX, y: offsetCorrectionY } = getters.getMainViewportCoordinates();
  const { scrollX, scrollY } = getters.getActiveSheetScrollInfo();
  const sheetId = getters.getActiveSheetId();
  const dim = getters.getSheetViewDimension();
  const rect = getters.getVisibleRect(getters.getActiveMainViewport());

  const scrollableViewportWidth = Math.min(rect.width, dim.width - offsetCorrectionX);
  const scrollableViewportHeight = Math.min(rect.height, dim.height - offsetCorrectionY);

  const posX =
    offsetCorrectionX + scrollX + Math.max(0, (scrollableViewportWidth - size.width) / 2);
  const posY =
    offsetCorrectionY + scrollY + Math.max(0, (scrollableViewportHeight - size.height) / 2);

  const anchor = {
    col: getters.getColIndex(Math.max(0, (scrollableViewportWidth - size.width) / 2)),
    row: getters.getRowIndex(Math.max(0, (scrollableViewportHeight - size.height) / 2)),
  };

  const offset = {
    x: posX - getters.getColDimensions(sheetId, anchor.col)["start"],
    y: posY - getters.getRowDimensions(sheetId, anchor.row)["start"],
  };

  return { anchor, offset };
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
