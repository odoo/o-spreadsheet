import { FigureUI, Getters, Pixel, PixelPosition, UID } from "../../types";
import { FIGURE_BORDER_WIDTH } from "./../../constants";

const SNAP_MARGIN: Pixel = 5;

export type HFigureAxisType = "top" | "bottom" | "vCenter";
export type VFigureAxisType = "right" | "left" | "hCenter";

type FigureAxis<T extends HFigureAxisType | VFigureAxisType> = {
  axisType: T;
  position: Pixel;
};

export interface SnapLine<T extends HFigureAxisType | VFigureAxisType> {
  matchedFigIds: UID[];
  snapOffset: number;
  snappedAxisType: T;
  position: Pixel;
}

interface SnapReturn {
  snappedFigure: FigureUI;
  verticalSnapLine?: SnapLine<VFigureAxisType>;
  horizontalSnapLine?: SnapLine<HFigureAxisType>;
}

/**
 * Try to snap the given figure to other figures when moving the figure, and return the snapped
 * figure and the possible snap lines, if any were found
 */
export function snapForMove(
  getters: Getters,
  figureToSnap: FigureUI,
  otherFigures: FigureUI[]
): SnapReturn {
  const snappedFigure = { ...figureToSnap };

  const verticalSnapLine = getSnapLine(
    getters,
    snappedFigure,
    ["hCenter", "right", "left"],
    otherFigures,
    ["hCenter", "right", "left"]
  );

  const horizontalSnapLine = getSnapLine(
    getters,
    snappedFigure,
    ["vCenter", "bottom", "top"],
    otherFigures,
    ["vCenter", "bottom", "top"]
  );

  const { y: viewportY, x: viewportX } = getters.getMainViewportCoordinates();
  const { scrollY, scrollX } = getters.getActiveSheetScrollInfo();

  // If the snap cause the figure to change pane, we need to also apply the scroll as an offset
  if (horizontalSnapLine) {
    snappedFigure.y -= horizontalSnapLine.snapOffset;

    const isBaseFigFrozenY = figureToSnap.y < viewportY;
    const isSnappedFrozenY = snappedFigure.y < viewportY;

    if (isBaseFigFrozenY && !isSnappedFrozenY) snappedFigure.y += scrollY;
    else if (!isBaseFigFrozenY && isSnappedFrozenY) snappedFigure.y -= scrollY;
  }

  if (verticalSnapLine) {
    snappedFigure.x -= verticalSnapLine.snapOffset;

    const isBaseFigFrozenX = figureToSnap.x < viewportX;
    const isSnappedFrozenX = snappedFigure.x < viewportX;

    if (isBaseFigFrozenX && !isSnappedFrozenX) snappedFigure.x += scrollX;
    else if (!isBaseFigFrozenX && isSnappedFrozenX) snappedFigure.x -= scrollX;
  }

  return { snappedFigure, verticalSnapLine, horizontalSnapLine };
}

/**
 * Try to snap the given figure to the other figures when resizing the figure, and return the snapped
 * figure and the possible snap lines, if any were found
 */
export function snapForResize(
  getters: Getters,
  resizeDirX: -1 | 0 | 1,
  resizeDirY: -1 | 0 | 1,
  figureToSnap: FigureUI,
  otherFigures: FigureUI[]
): SnapReturn {
  const snappedFigure = { ...figureToSnap };

  // Vertical snap line
  const verticalSnapLine = getSnapLine(
    getters,
    snappedFigure,
    [resizeDirX === -1 ? "left" : "right"],
    otherFigures,
    ["right", "left"]
  );
  if (verticalSnapLine) {
    if (resizeDirX === 1) {
      snappedFigure.figure.width -= verticalSnapLine.snapOffset;
    } else if (resizeDirX === -1) {
      snappedFigure.x -= verticalSnapLine.snapOffset;
      snappedFigure.figure.width += verticalSnapLine.snapOffset;
    }
  }

  // Horizontal snap line
  const horizontalSnapLine = getSnapLine(
    getters,
    snappedFigure,
    [resizeDirY === -1 ? "top" : "bottom"],
    otherFigures,
    ["bottom", "top"]
  );
  if (horizontalSnapLine) {
    if (resizeDirY === 1) {
      snappedFigure.figure.height -= horizontalSnapLine.snapOffset;
    } else if (resizeDirY === -1) {
      snappedFigure.y -= horizontalSnapLine.snapOffset;
      snappedFigure.figure.height += horizontalSnapLine.snapOffset;
    }
  }

  snappedFigure.x = Math.round(snappedFigure.x);
  snappedFigure.y = Math.round(snappedFigure.y);
  snappedFigure.figure.height = Math.round(snappedFigure.figure.height);
  snappedFigure.figure.width = Math.round(snappedFigure.figure.width);

  return { snappedFigure, verticalSnapLine, horizontalSnapLine };
}

/**
 * Get the position of snap axes for the given figure
 *
 * @param figure the figure
 * @param axesTypes the list of axis types to return the positions of
 */
function getVisibleAxes<T extends HFigureAxisType | VFigureAxisType>(
  getters: Getters,
  figure: FigureUI,
  axesTypes: T[]
): FigureAxis<T>[] {
  const axes = axesTypes.map((axisType) => getAxis(figure, axisType));
  return axes
    .filter((axis) => isAxisVisible(getters, figure, axis))
    .map((axis) => getAxisScreenPosition(getters, figure, axis));
}

/**
 * We need two positions for the figure axis :
 *  - the position (core) of the axis in the figure. This is used to know whether or not the axis is
 *      displayed, or is hidden by the scroll/the frozen panes
 *  - the position in the screen, which is used to find snap matches. We cannot use the core position for this,
 *      because figures partially in frozen panes aren't displayed at their actual coordinates
 */
function getAxisScreenPosition<T extends HFigureAxisType | VFigureAxisType>(
  getters: Getters,
  figure: FigureUI,
  figureAxis: FigureAxis<T>
): FigureAxis<T> {
  return getAxis(figure, figureAxis.axisType);
}

function isAxisVisible<T extends HFigureAxisType | VFigureAxisType>(
  getters: Getters,
  figureUI: FigureUI,
  axis: FigureAxis<T>
): boolean {
  const { x: mainViewportX, y: mainViewportY } = getters.getMainViewportCoordinates();

  const axisStartEndPositions: PixelPosition[] = [];
  switch (axis.axisType) {
    case "top":
    case "bottom":
    case "vCenter":
      if (figureUI.y < mainViewportY) return true;
      axisStartEndPositions.push({ x: figureUI.x, y: axis.position });
      axisStartEndPositions.push({ x: figureUI.x + figureUI.figure.width, y: axis.position });
      break;
    case "left":
    case "right":
    case "hCenter":
      if (figureUI.x < mainViewportX) return true;
      axisStartEndPositions.push({ x: axis.position, y: figureUI.y });
      axisStartEndPositions.push({ x: axis.position, y: figureUI.y + figureUI.figure.height });
      break;
  }

  return axisStartEndPositions.some(getters.isPositionVisible);
}

/**
 * Get a snap line for the given figure, if the figure can snap to any other figure
 *
 * @param figureToSnap figure to get the snap line for
 * @param figAxesTypes figure axes of the given figure to be considered to find a snap line
 * @param otherFigures figures to match against the snapped figure to find a snap line
 * @param otherAxesTypes figure axes of the other figures to be considered to find a snap line
 */

function getSnapLine<T extends HFigureAxisType[] | VFigureAxisType[]>(
  getters: Getters,
  figureToSnap: FigureUI,
  figAxesTypes: T,
  otherFigures: FigureUI[],
  otherAxesTypes: T
): SnapLine<T[number]> | undefined {
  const axesOfFigure = getVisibleAxes(getters, figureToSnap, figAxesTypes);

  let closestMatch: SnapLine<T[number]> | undefined = undefined;

  for (const otherFigure of otherFigures) {
    const axesOfOtherFig = getVisibleAxes(getters, otherFigure, otherAxesTypes);

    for (const axisOfFigure of axesOfFigure) {
      for (const axisOfOtherFig of axesOfOtherFig) {
        if (!canSnap(axisOfFigure.position, axisOfOtherFig.position)) continue;

        const snapOffset = axisOfFigure.position - axisOfOtherFig.position;

        if (closestMatch && snapOffset === closestMatch.snapOffset) {
          closestMatch.matchedFigIds.push(otherFigure.figure.id);
        } else if (!closestMatch || Math.abs(snapOffset) <= Math.abs(closestMatch.snapOffset)) {
          closestMatch = {
            matchedFigIds: [otherFigure.figure.id],
            snapOffset,
            snappedAxisType: axisOfFigure.axisType,
            position: axisOfOtherFig.position,
          };
        }
      }
    }
  }
  return closestMatch;
}

/** Check if two axes are close enough to snap */
function canSnap(axisPosition1: Pixel, axisPosition2: Pixel) {
  return Math.abs(axisPosition1 - axisPosition2) <= SNAP_MARGIN;
}

function getAxis<T extends HFigureAxisType | VFigureAxisType>(
  figureUI: FigureUI,
  axisType: T
): FigureAxis<T> {
  let position = 0;
  switch (axisType) {
    case "top":
      position = figureUI.y;
      break;
    case "bottom":
      position = figureUI.y + figureUI.figure.height - FIGURE_BORDER_WIDTH;
      break;
    case "vCenter":
      position = figureUI.y + Math.floor(figureUI.figure.height / 2) - FIGURE_BORDER_WIDTH;
      break;
    case "left":
      position = figureUI.x;
      break;
    case "right":
      position = figureUI.x + figureUI.figure.width - FIGURE_BORDER_WIDTH;
      break;
    case "hCenter":
      position = figureUI.x + Math.floor(figureUI.figure.width / 2) - FIGURE_BORDER_WIDTH;
      break;
  }

  return { position, axisType: axisType };
}
