import { FIGURE_BORDER_WIDTH } from "../../constants";
import { rectUnion } from "../../helpers/rectangle";
import { Model } from "../../model";
import { FigureUI } from "../../types/figure";
import { Pixel, PixelPosition, UID } from "../../types/misc";
import { DOMCoordinates, Rect } from "../../types/rendering";

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

interface SnapMoveReturn extends SnapReturn {
  snappedFigures: FigureUI[];
}

export interface SnapReturn {
  verticalSnapLine?: SnapLine<VFigureAxisType>;
  horizontalSnapLine?: SnapLine<HFigureAxisType>;
}

export interface SnapHelperArgs {
  model: Model;
  isPositionVisible: (figureId: UID, position: DOMCoordinates) => boolean;
}

/**
 * Try to snap the given figure to other figures when moving the figure, and return the snapped
 * figure and the possible snap lines, if any were found
 */
export function snapForMove(
  args: SnapHelperArgs,
  figuresToSnap: FigureUI[],
  otherFigures: FigureUI[]
): SnapMoveReturn {
  const aggregateRect = rectUnion(...figuresToSnap);

  const verticalSnapLine = getSnapLine(
    args,
    aggregateRect,
    ["hCenter", "right", "left"],
    otherFigures,
    ["hCenter", "right", "left"]
  );

  const horizontalSnapLine = getSnapLine(
    args,
    aggregateRect,
    ["vCenter", "bottom", "top"],
    otherFigures,
    ["vCenter", "bottom", "top"]
  );

  for (const figureToSnap of figuresToSnap) {
    if (horizontalSnapLine) {
      figureToSnap.y -= horizontalSnapLine.snapOffset;
    }

    if (verticalSnapLine) {
      figureToSnap.x -= verticalSnapLine.snapOffset;
    }
  }

  return { snappedFigures: figuresToSnap, verticalSnapLine, horizontalSnapLine };
}

/**
 * Try to snap the given figure to the other figures when resizing the figure, and return the snapped
 * figure and the possible snap lines, if any were found
 */
export function snapForResize(
  args: SnapHelperArgs,
  resizeDirX: -1 | 0 | 1,
  resizeDirY: -1 | 0 | 1,
  rect: Rect,
  otherFigures: FigureUI[]
): { snappedRect: Rect } & SnapReturn {
  const verticalSnapLine = getSnapLine(
    args,
    rect,
    [resizeDirX === -1 ? "left" : "right"],
    otherFigures,
    ["right", "left"]
  );
  const horizontalSnapLine = getSnapLine(
    args,
    rect,
    [resizeDirY === -1 ? "top" : "bottom"],
    otherFigures,
    ["bottom", "top"]
  );

  if (verticalSnapLine) {
    if (resizeDirX === 1) {
      rect.width -= verticalSnapLine.snapOffset;
    } else if (resizeDirX === -1) {
      rect.x -= verticalSnapLine.snapOffset;
      rect.width += verticalSnapLine.snapOffset;
    }
  }

  if (horizontalSnapLine) {
    if (resizeDirY === 1) {
      rect.height -= horizontalSnapLine.snapOffset;
    } else if (resizeDirY === -1) {
      rect.y -= horizontalSnapLine.snapOffset;
      rect.height += horizontalSnapLine.snapOffset;
    }
  }

  const snappedRect = {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };

  return { snappedRect, verticalSnapLine, horizontalSnapLine };
}

/**
 * Get the position of snap axes for the given figure
 *
 * @param figure the figure
 * @param axesTypes the list of axis types to return the positions of
 */
function getVisibleAxes<T extends HFigureAxisType | VFigureAxisType>(
  args: SnapHelperArgs,
  figure: FigureUI,
  axesTypes: T[]
): FigureAxis<T>[] {
  const axes = axesTypes.map((axisType) => getAxis(args, figure, false, axisType));
  return axes.filter((axis) => isAxisVisible(args, figure, axis));
}

function isAxisVisible<T extends HFigureAxisType | VFigureAxisType>(
  args: SnapHelperArgs,
  figureUI: FigureUI,
  axis: FigureAxis<T>
): boolean {
  const axisStartEndPositions: PixelPosition[] = [];
  switch (axis.axisType) {
    case "top":
    case "bottom":
    case "vCenter":
      axisStartEndPositions.push({ x: figureUI.x, y: axis.position });
      axisStartEndPositions.push({ x: figureUI.x + figureUI.width, y: axis.position });
      break;
    case "left":
    case "right":
    case "hCenter":
      axisStartEndPositions.push({ x: axis.position, y: figureUI.y });
      axisStartEndPositions.push({ x: axis.position, y: figureUI.y + figureUI.height });
      break;
  }

  return axisStartEndPositions.some((position) => args.isPositionVisible(figureUI.id, position));
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
  args: SnapHelperArgs,
  figureToSnap: Rect,
  figAxesTypes: T,
  otherFigures: FigureUI[],
  otherAxesTypes: T
): SnapLine<T[number]> | undefined {
  const axesOfFigure = figAxesTypes.map((axisType) => getAxis(args, figureToSnap, true, axisType));

  let closestMatch: SnapLine<T[number]> | undefined = undefined;

  for (const otherFigure of otherFigures) {
    const axesOfOtherFig = getVisibleAxes(args, otherFigure, otherAxesTypes);
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
  args: SnapHelperArgs,
  figureUI: Rect,
  dnd: boolean,
  axisType: T
): FigureAxis<T> {
  let position = 0;
  const x = figureUI.x;
  const y = figureUI.y;

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
