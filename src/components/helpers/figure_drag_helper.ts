import { clip } from "../../helpers";
import { FigureUI, PixelPosition, SheetDOMScrollInfo } from "../../types";

export function dragFigureForMove(
  { x: mouseX, y: mouseY }: PixelPosition,
  { x: mouseInitialX, y: mouseInitialY }: PixelPosition,
  initialFigures: FigureUI[],
  { maxX, maxY }: { maxX: number; maxY: number },
  { scrollX: initialScrollX, scrollY: initialScrollY }: SheetDOMScrollInfo,
  { scrollX, scrollY }: SheetDOMScrollInfo
): FigureUI[] {
  let deltaX = mouseX - mouseInitialX + scrollX - initialScrollX;
  let deltaY = mouseY - mouseInitialY + scrollY - initialScrollY;

  for (const figure of initialFigures) {
    deltaX = clip(deltaX, -figure.x, maxX - figure.x - figure.width);
    deltaY = clip(deltaY, -figure.y, maxY - figure.y - figure.height);
  }

  return initialFigures.map((f) => {
    return { ...f, x: f.x + deltaX, y: f.y + deltaY };
  });
}

export function dragFigureForResize(
  initialFigure: FigureUI,
  dirX: -1 | 0 | 1,
  dirY: -1 | 0 | 1,
  { x: mouseX, y: mouseY }: PixelPosition,
  { x: mouseInitialX, y: mouseInitialY }: PixelPosition,
  keepRatio: boolean,
  minFigSize: number,
  { scrollX: initialScrollX, scrollY: initialScrollY }: SheetDOMScrollInfo,
  { scrollX, scrollY }: SheetDOMScrollInfo,
  { maxX, maxY }: { maxX: number; maxY: number }
): FigureUI {
  let { x, y, width, height } = initialFigure;

  if (keepRatio && dirX !== 0 && dirY !== 0) {
    const deltaX = Math.min(
      dirX * (mouseInitialX - mouseX + scrollX - initialScrollX),
      width - minFigSize
    );
    const deltaY = Math.min(
      dirY * (mouseInitialY - mouseY + scrollY - initialScrollY),
      height - minFigSize
    );
    const fraction = Math.min(deltaX / width, deltaY / height);
    if (dirX < 0) {
      x = x + width * fraction;
    }
    if (dirY < 0) {
      y = y + height * fraction;
    }
    width = width * (1 - fraction);
    height = height * (1 - fraction);
  } else {
    const deltaX = Math.max(
      dirX * (mouseX - mouseInitialX + scrollX - initialScrollX),
      minFigSize - width
    );
    const deltaY = Math.max(
      dirY * (mouseY - mouseInitialY + scrollY - initialScrollY),
      minFigSize - height
    );
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
  } else if (x + width > maxX) {
    width = maxX - x;
  }
  if (y + scrollY <= 0) {
    height = height + y + scrollY;
    y = -scrollY;
  } else if (y + height > maxY) {
    height = maxY - y;
  }

  return { ...initialFigure, x, y, width, height };
}
