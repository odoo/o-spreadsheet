import { FIGURE_BORDER_WIDTH } from "@odoo/o-spreadsheet-engine/constants";
import { FigureUI, Getters, Pixel, PixelPosition, UID } from "../../types";

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
  const verticalSnapLine = getSnapLine(
    getters,
    figureToSnap,
    ["hCenter", "right", "left"],
    otherFigures,
    ["hCenter", "right", "left"]
  );

  const horizontalSnapLine = getSnapLine(
    getters,
    figureToSnap,
    ["vCenter", "bottom", "top"],
    otherFigures,
    ["vCenter", "bottom", "top"]
  );

  const { y: viewportY, x: viewportX } = getters.getMainViewportCoordinates();
  const { scrollY, scrollX } = getters.getActiveSheetScrollInfo();

  // If the snap cause the figure to change pane, we need to also apply the scroll as an offset
  if (horizontalSnapLine) {
    figureToSnap.y -= horizontalSnapLine.snapOffset;

    const isBaseFigFrozenY = figureToSnap.y < viewportY;
    const isSnappedFrozenY = figureToSnap.y < viewportY;

    if (isBaseFigFrozenY && !isSnappedFrozenY) {
      figureToSnap.y += scrollY;
    } else if (!isBaseFigFrozenY && isSnappedFrozenY) {
      figureToSnap.y -= scrollY;
    }
  }

  if (verticalSnapLine) {
    figureToSnap.x -= verticalSnapLine.snapOffset;

    const isBaseFigFrozenX = figureToSnap.x < viewportX;
    const isSnappedFrozenX = figureToSnap.x < viewportX;

    if (isBaseFigFrozenX && !isSnappedFrozenX) {
      figureToSnap.x += scrollX;
    } else if (!isBaseFigFrozenX && isSnappedFrozenX) {
      figureToSnap.x -= scrollX;
    }
  }

  return { snappedFigure: figureToSnap, verticalSnapLine, horizontalSnapLine };
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
  // Vertical snap line
  const verticalSnapLine = getSnapLine(
    getters,
    figureToSnap,
    [resizeDirX === -1 ? "left" : "right"],
    otherFigures,
    ["right", "left"]
  );
  if (verticalSnapLine) {
    if (resizeDirX === 1) {
      figureToSnap.width -= verticalSnapLine.snapOffset;
    } else if (resizeDirX === -1) {
      figureToSnap.x -= verticalSnapLine.snapOffset;
      figureToSnap.width += verticalSnapLine.snapOffset;
    }
  }

  // Horizontal snap line
  const horizontalSnapLine = getSnapLine(
    getters,
    figureToSnap,
    [resizeDirY === -1 ? "top" : "bottom"],
    otherFigures,
    ["bottom", "top"]
  );
  if (horizontalSnapLine) {
    if (resizeDirY === 1) {
      figureToSnap.height -= horizontalSnapLine.snapOffset;
    } else if (resizeDirY === -1) {
      figureToSnap.y -= horizontalSnapLine.snapOffset;
      figureToSnap.height += horizontalSnapLine.snapOffset;
    }
  }

  figureToSnap.x = Math.round(figureToSnap.x);
  figureToSnap.y = Math.round(figureToSnap.y);
  figureToSnap.height = Math.round(figureToSnap.height);
  figureToSnap.width = Math.round(figureToSnap.width);

  return { snappedFigure: figureToSnap, verticalSnapLine, horizontalSnapLine };
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
  const axes = axesTypes.map((axisType) => getAxis(getters, figure, false, axisType));
  return axes.filter((axis) => isAxisVisible(getters, figure, axis));
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
      if (figureUI.y < mainViewportY) {
        return true;
      }
      axisStartEndPositions.push({ x: figureUI.x, y: axis.position });
      axisStartEndPositions.push({ x: figureUI.x + figureUI.width, y: axis.position });
      break;
    case "left":
    case "right":
    case "hCenter":
      if (figureUI.x < mainViewportX) {
        return true;
      }
      axisStartEndPositions.push({ x: axis.position, y: figureUI.y });
      axisStartEndPositions.push({ x: axis.position, y: figureUI.y + figureUI.height });
      break;
  }

  return axisStartEndPositions.some(getters.isPixelPositionVisible);
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
  const axesOfFigure = figAxesTypes.map((axisType) =>
    getAxis(getters, figureToSnap, true, axisType)
  );

  let closestMatch: SnapLine<T[number]> | undefined = undefined;

  for (const otherFigure of otherFigures) {
    const axesOfOtherFig = getVisibleAxes(getters, otherFigure, otherAxesTypes);
    for (const axisOfFigure of axesOfFigure) {
      for (const axisOfOtherFig of axesOfOtherFig) {
        if (!canSnap(axisOfFigure.position, axisOfOtherFig.position)) {
          continue;
        }

        const snapOffset = axisOfFigure.position - axisOfOtherFig.position;

        if (closestMatch && snapOffset === closestMatch.snapOffset) {
          closestMatch.matchedFigIds.push(otherFigure.id);
        } else if (!closestMatch || Math.abs(snapOffset) <= Math.abs(closestMatch.snapOffset)) {
          closestMatch = {
            matchedFigIds: [otherFigure.id],
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
  getters: Getters,
  figureUI: FigureUI,
  dnd: boolean,
  axisType: T
): FigureAxis<T> {
  let position = 0;
  const { scrollX, scrollY } = getters.getActiveSheetScrollInfo();
  const { x: viewportX, y: viewportY } = getters.getMainViewportCoordinates();
  const y = !dnd && figureUI.y < viewportY ? figureUI.y + scrollY : figureUI.y;
  const x = !dnd && figureUI.x < viewportX ? figureUI.x + scrollX : figureUI.x;

  switch (axisType) {
    case "top":
      position = y;
      break;
    case "bottom":
      position = y + figureUI.height - FIGURE_BORDER_WIDTH;
      break;
    case "vCenter":
      position = y + Math.floor(figureUI.height / 2) - FIGURE_BORDER_WIDTH;
      break;
    case "left":
      position = x;
      break;
    case "right":
      position = x + figureUI.width - FIGURE_BORDER_WIDTH;
      break;
    case "hCenter":
      position = x + Math.floor(figureUI.width / 2) - FIGURE_BORDER_WIDTH;
      break;
  }

  return { position, axisType: axisType };
}
