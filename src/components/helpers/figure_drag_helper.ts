import { clip } from "../../helpers";
import { FigureUI, PixelPosition, SheetScrollInfo } from "../../types";

export function dragFigureForMove(
  { x: mouseX, y: mouseY }: PixelPosition,
  { x: mouseInitialX, y: mouseInitialY }: PixelPosition,
  initialFigure: FigureUI,
  { x: viewportX, y: viewportY }: PixelPosition,
  { maxX, maxY }: { maxX: number; maxY: number },
  { scrollX, scrollY }: SheetScrollInfo
): FigureUI {
  const minX = viewportX ? 0 : -scrollX;
  const minY = viewportY ? 0 : -scrollY;
  const deltaX = mouseX - mouseInitialX;
  const newX = clip(initialFigure.x + deltaX, minX, maxX - initialFigure.figure.width - scrollX);
  const deltaY = mouseY - mouseInitialY;
  const newY = clip(initialFigure.y + deltaY, minY, maxY - initialFigure.figure.height - scrollY);
  return { ...initialFigure, x: newX, y: newY };
}

export function dragFigureForResize(
  initialFigure: FigureUI,
  dirX: -1 | 0 | 1,
  dirY: -1 | 0 | 1,
  { x: mouseX, y: mouseY }: PixelPosition,
  { x: mouseInitialX, y: mouseInitialY }: PixelPosition,
  keepRatio: boolean,
  minFigSize: number,
  { scrollX, scrollY }: SheetScrollInfo
): FigureUI {
  let { x, y, figure } = initialFigure;
  let { width, height } = figure;

  if (keepRatio && dirX != 0 && dirY != 0) {
    const deltaX = Math.min(dirX * (mouseInitialX - mouseX), width - minFigSize);
    const deltaY = Math.min(dirY * (mouseInitialY - mouseY), height - minFigSize);
    const fraction = Math.min(deltaX / width, deltaY / height);
    width = width * (1 - fraction);
    height = height * (1 - fraction);
    if (dirX < 0) {
      x = x + width * fraction;
    }
    if (dirY < 0) {
      y = y + height * fraction;
    }
  } else {
    const deltaX = Math.max(dirX * (mouseX - mouseInitialX), minFigSize - width);
    const deltaY = Math.max(dirY * (mouseY - mouseInitialY), minFigSize - height);
    width = width + deltaX;
    height = height + deltaY;

    if (dirX < 0) {
      x = x - deltaX;
    }
    if (dirY < 0) {
      y = y - deltaY;
    }
  }

  // Adjusts figure dimensions to ensure it remains within header boundaries and viewport during resizing.
  if (x + scrollX <= 0) {
    width = width + x + scrollX;
    x = -scrollX;
  }
  if (y + scrollY <= 0) {
    height = height + y + scrollY;
    y = -scrollY;
  }

  return { x, y, figure: { ...figure, width, height } };
}
