import { overlap } from "../../helpers";
import { otRegistry } from "../../registries";
import {
  AddMergeCommand,
  DeleteFigureCommand,
  RemoveMergeCommand,
  UpdateChartCommand,
  UpdateFigureCommand,
  Zone,
} from "../../types";

/*
 * This file contains the specifics transformations
 */

otRegistry.addTransformation("DELETE_FIGURE", ["UPDATE_FIGURE", "UPDATE_CHART"], updateChartFigure);
otRegistry.addTransformation("ADD_MERGE", ["ADD_MERGE", "REMOVE_MERGE"], mergeTransformation);

function updateChartFigure(
  toTransform: UpdateFigureCommand | UpdateChartCommand,
  executed: DeleteFigureCommand
): UpdateFigureCommand | UpdateChartCommand | undefined {
  if (toTransform.id === executed.id) {
    return undefined;
  }
  return toTransform;
}

function mergeTransformation(
  cmd: AddMergeCommand | RemoveMergeCommand,
  executed: AddMergeCommand
): AddMergeCommand | RemoveMergeCommand | undefined {
  if (cmd.sheetId !== executed.sheetId) {
    return cmd;
  }
  const target: Zone[] = [];
  for (const zone1 of cmd.target) {
    for (const zone2 of executed.target) {
      if (!overlap(zone1, zone2)) {
        target.push({ ...zone1 });
      }
    }
  }
  if (target.length) {
    return { ...cmd, target };
  }
  return undefined;
}
