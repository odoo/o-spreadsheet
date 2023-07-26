import { Figure, PixelPosition, SheetScrollInfo } from "../../types";

export function dragFigureForMove(
  { x: mouseX, y: mouseY }: PixelPosition,
  { x: mouseInitialX, y: mouseInitialY }: PixelPosition,
  initialFigure: Figure,
  { x: viewportX, y: viewportY }: PixelPosition,
  { maxX, maxY }: { maxX: number; maxY: number },
  { scrollX, scrollY }: SheetScrollInfo
): Figure {
  const minX = viewportX ? 0 : -scrollX;
  const minY = viewportY ? 0 : -scrollY;
  const deltaX = mouseX - mouseInitialX;
  const newX = clamp(initialFigure.x + deltaX, minX, maxX - initialFigure.width - scrollX);
  const deltaY = mouseY - mouseInitialY;
  const newY = clamp(initialFigure.y + deltaY, minY, maxY - initialFigure.height - scrollY);
  return { ...initialFigure, x: newX, y: newY };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function dragFigureForResize(
  initialFigure: Figure,
  dirX: -1 | 0 | 1,
  dirY: -1 | 0 | 1,
  { x: mouseX, y: mouseY }: PixelPosition,
  { x: mouseInitialX, y: mouseInitialY }: PixelPosition,
  keepRatio: boolean,
  minFigSize: number
): Figure {
  let { x, y, width, height } = initialFigure;

  if (keepRatio && dirX != 0 && dirY != 0) {
    const deltaX = Math.min(dirX * (mouseInitialX - mouseX), initialFigure.width - minFigSize);
    const deltaY = Math.min(dirY * (mouseInitialY - mouseY), initialFigure.height - minFigSize);
    const fraction = Math.min(deltaX / initialFigure.width, deltaY / initialFigure.height);
    width = initialFigure.width * (1 - fraction);
    height = initialFigure.height * (1 - fraction);
    if (dirX < 0) {
      x = initialFigure.x + initialFigure.width * fraction;
    }
    if (dirY < 0) {
      y = initialFigure.y + initialFigure.height * fraction;
    }
  } else {
    const deltaX = Math.max(dirX * (mouseX - mouseInitialX), minFigSize - initialFigure.width);
    const deltaY = Math.max(dirY * (mouseY - mouseInitialY), minFigSize - initialFigure.height);
    width = initialFigure.width + deltaX;
    height = initialFigure.height + deltaY;

    if (dirX < 0) {
      x = initialFigure.x - deltaX;
    }
    if (dirY < 0) {
      y = initialFigure.y - deltaY;
    }
  }

  // Restrict resizing if x or y reaches header boundaries
  if (x < 0) {
    width += x;
    x = 0;
  }
  if (y < 0) {
    height += y;
    y = 0;
  }

  return { ...initialFigure, x, y, width, height };
}
