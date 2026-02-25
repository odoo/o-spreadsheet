import { Color } from "../../..";
import { AnchorOffset, FigureSize } from "../../../types/figure";
import { Getters } from "../../../types/getters";
import { relativeLuminance } from "../../color";
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

export function figureMutedFontColor(backgroundColor: Color | undefined): Color {
  if (!backgroundColor) {
    return "#666666";
  }
  return relativeLuminance(backgroundColor) < 0.3 ? "#C8C8C8" : "#666666";
}
