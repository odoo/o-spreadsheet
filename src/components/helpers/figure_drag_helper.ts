import { clip } from "../../helpers/misc";
import { FigureUI } from "../../types/figure";
import { PixelPosition } from "../../types/misc";
import { DOMDimension, Rect, SheetDOMScrollInfo } from "../../types/rendering";

export function dragFigureForMove(
  { x: mouseX, y: mouseY }: PixelPosition,
  { x: mouseInitialX, y: mouseInitialY }: PixelPosition,
  initialFigures: FigureUI[],
  boundaries: Rect
): FigureUI[] {
  let deltaX = mouseX - mouseInitialX;
  let deltaY = mouseY - mouseInitialY;

  for (const figure of initialFigures) {
    deltaX = clip(
      deltaX,
      boundaries.x - figure.x,
      boundaries.x + boundaries.width - figure.x - figure.width
    );
    deltaY = clip(
      deltaY,
      boundaries.y - figure.y,
      boundaries.y + boundaries.height - figure.y - figure.height
    );
  }

  return initialFigures.map((f) => {
    return { ...f, x: f.x + deltaX, y: f.y + deltaY };
  });
}

export function dragFigureForResize(
  initialRect: Rect,
  dirX: -1 | 0 | 1,
  dirY: -1 | 0 | 1,
  { x: mouseX, y: mouseY }: PixelPosition,
  { x: mouseInitialX, y: mouseInitialY }: PixelPosition,
  keepRatio: boolean,
  minFigSize: DOMDimension,
  { scrollX: initialScrollX, scrollY: initialScrollY }: SheetDOMScrollInfo,
  { scrollX, scrollY }: SheetDOMScrollInfo,
  boundaries: Rect
): Rect {
  let { x, y, width, height } = initialRect;
  const scrollOffset = {
    x: scrollX - initialScrollX,
    y: scrollY - initialScrollY,
  };

  // The displayed dragged figure moves with the scroll. But for resize, we want its position to stay the same, and change the size on scroll
  x -= scrollOffset.x;
  y -= scrollOffset.y;

  if (keepRatio && dirX !== 0 && dirY !== 0) {
    const deltaX = Math.min(
      dirX * (mouseInitialX - mouseX + scrollOffset.x),
      width - minFigSize.width
    );
    const deltaY = Math.min(
      dirY * (mouseInitialY - mouseY + scrollOffset.y),
      height - minFigSize.height
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
      dirX * (mouseX - mouseInitialX + scrollOffset.x),
      minFigSize.width - width
    );
    const deltaY = Math.max(
      dirY * (mouseY - mouseInitialY + scrollOffset.y),
      minFigSize.height - height
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
  if (x <= boundaries.x) {
    width = width + x - boundaries.x;
    x = boundaries.x;
  } else if (x + width > boundaries.x + boundaries.width) {
    width = boundaries.x + boundaries.width - x;
  }
  if (y <= boundaries.y) {
    height = height + y - boundaries.y;
    y = boundaries.y;
  } else if (y + height > boundaries.y + boundaries.height) {
    height = boundaries.y + boundaries.height - y;
  }

  return { x, y, width, height };
}
