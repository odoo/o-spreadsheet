import type { DOMCoordinates, Figure, Getters } from "../../types";

/**
 * Transform a figure with coordinates from the model, to coordinates as they are shown on the screen,
 * taking into account the scroll position of the active sheet and the frozen panes.
 */
export function internalFigureToScreen(getters: Getters, fig: Figure): Figure {
  return { ...fig, ...internalToScreenCoordinates(getters, { x: fig.x, y: fig.y }) };
}

/**
 * Transform a figure with coordinates as they are shown on the screen, to coordinates as they are in the model,
 * taking into account the scroll position of the active sheet and the frozen panes.
 *
 * Note that this isn't  exactly the reverse operation as internalFigureToScreen, because the figure will always be on top
 * of the frozen panes.
 */
export function screenFigureToInternal(getters: Getters, fig: Figure): Figure {
  return { ...fig, ...screenCoordinatesToInternal(getters, { x: fig.x, y: fig.y }) };
}

function internalToScreenCoordinates(getters: Getters, { x, y }: DOMCoordinates): DOMCoordinates {
  const { x: viewportX, y: viewportY } = getters.getMainViewportCoordinates();
  const { scrollX, scrollY } = getters.getActiveSheetScrollInfo();

  x = x < viewportX ? x : x - scrollX;
  y = y < viewportY ? y : y - scrollY;

  return { x, y };
}

function screenCoordinatesToInternal(getters: Getters, { x, y }: DOMCoordinates): DOMCoordinates {
  const { x: viewportX, y: viewportY } = getters.getMainViewportCoordinates();
  const { scrollX, scrollY } = getters.getActiveSheetScrollInfo();

  x = viewportX && x < viewportX ? x : x + scrollX;
  y = viewportY && y < viewportY ? y : y + scrollY;

  return { x, y };
}
