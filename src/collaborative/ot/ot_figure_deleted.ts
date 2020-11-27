import { otRegistry } from "../../registries";
import { UpdateFigureCommand, UpdateChartCommand, DeleteFigureCommand } from "../../types";

/*
 * This file contains the transformations when an deleteFigure is executed
 * before the command to transform.
 * Basically, the transformation is to skip the command if the command update the
 * deleted figure
 */

otRegistry.addTransformation("UPDATE_FIGURE", "DELETE_FIGURE", updateChartFigure);
otRegistry.addTransformation("UPDATE_CHART", "DELETE_FIGURE", updateChartFigure);

function updateChartFigure(
  toTransform: UpdateFigureCommand | UpdateChartCommand,
  executed: DeleteFigureCommand
): UpdateFigureCommand | UpdateChartCommand | undefined {
  if (toTransform.id === executed.id) {
    return undefined;
  }
  return toTransform;
}
