import {
  DEFAULT_FIGURE_HEIGHT,
  DEFAULT_FIGURE_WIDTH,
  DEFAULT_SCORECARD_HEIGHT,
  DEFAULT_SCORECARD_WIDTH,
} from "../../constants";
import { ChartDefinition } from "../../types/chart/chart";
import { FigureSize, FigureUI } from "../../types/figure";

export function getDefaultChartFigureSize(type: ChartDefinition["type"]): FigureSize {
  if (type === "scorecard") {
    return { width: DEFAULT_SCORECARD_WIDTH, height: DEFAULT_SCORECARD_HEIGHT };
  }
  return { width: DEFAULT_FIGURE_WIDTH, height: DEFAULT_FIGURE_HEIGHT };
}

export function getOverlappedFigure(
  figureUI: { tag: string; x: number; y: number; width: number; height: number },
  otherFigures: FigureUI[],
  matchTags: FigureUI["tag"][]
): FigureUI | undefined {
  if (figureUI.tag !== "chart") {
    return undefined;
  }
  const figureCenterX = figureUI.x + figureUI.width / 2;
  const figureCenterY = figureUI.y + figureUI.height / 2;
  let bestMatch: FigureUI | undefined;
  let smallestDistance = Infinity;
  for (const figure of otherFigures) {
    if (!matchTags.includes(figure.tag)) {
      continue;
    }
    const targetCenterX = figure.x + figure.width / 2;
    const targetCenterY = figure.y + figure.height / 2;
    const distanceX = Math.abs(figureCenterX - targetCenterX);
    const distanceY = Math.abs(figureCenterY - targetCenterY);
    const squaredDistance = distanceX ** 2 + distanceY ** 2;
    if (
      distanceX <= figureUI.width / 2 &&
      distanceY <= figureUI.height / 2 &&
      squaredDistance < smallestDistance
    ) {
      smallestDistance = squaredDistance;
      bestMatch = figure;
    }
  }
  return bestMatch;
}
