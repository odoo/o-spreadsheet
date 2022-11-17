import { Figure, PixelPosition, SheetScrollInfo } from "../../types";

export function dragFigureForMove(
  { x: mouseX, y: mouseY }: PixelPosition,
  { x: mouseInitialX, y: mouseInitialY }: PixelPosition,
  initialFigure: Figure,
  { x: viewportX, y: viewportY }: PixelPosition,
  { scrollX, scrollY }: SheetScrollInfo
): Figure {
  const minX = viewportX ? 0 : -scrollX;
  const minY = viewportY ? 0 : -scrollY;

  let deltaX = mouseX - mouseInitialX;
  const newX = Math.max(initialFigure.x + deltaX, minX);
  let deltaY = mouseY - mouseInitialY;
  const newY = Math.max(initialFigure.y + deltaY, minY);

  return { ...initialFigure, x: newX, y: newY };
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

  return { ...initialFigure, x, y, width, height };
}
