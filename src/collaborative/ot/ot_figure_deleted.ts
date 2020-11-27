import { otRegistry } from "../../registries";
import { DeleteFigureCommand, UpdateChartCommand, UpdateFigureCommand } from "../../types";

/*
 * This file contains the transformations when an deleteFigure is executed
 * before the command to transform.
 * Basically, the transformation is to skip the command if the command update the
 * deleted figure
 */

otRegistry.addTransformation("DELETE_FIGURE", ["UPDATE_FIGURE", "UPDATE_CHART"], updateChartFigure);

function updateChartFigure(
  toTransform: UpdateFigureCommand | UpdateChartCommand,
  executed: DeleteFigureCommand
): UpdateFigureCommand | UpdateChartCommand | undefined {
  if (toTransform.id === executed.id) {
    return undefined;
  }
  return toTransform;
}
