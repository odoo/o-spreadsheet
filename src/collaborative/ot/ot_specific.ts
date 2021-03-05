import { isDefined, overlap, toZone, zoneToXc } from "../../helpers";
import { otRegistry } from "../../registries";
import {
  AddColumnsRowsCommand,
  AddMergeCommand,
  CreateChartCommand,
  DeleteFigureCommand,
  RemoveColumnsRowsCommand,
  RemoveMergeCommand,
  UpdateChartCommand,
  UpdateFigureCommand,
  Zone,
} from "../../types";
import { transformZone } from "./ot_helpers";

/*
 * This file contains the specifics transformations
 */

otRegistry.addTransformation(
  "ADD_COLUMNS_ROWS",
  ["CREATE_CHART", "UPDATE_CHART"],
  updateChartRangesTransformation
);
otRegistry.addTransformation(
  "REMOVE_COLUMNS_ROWS",
  ["CREATE_CHART", "UPDATE_CHART"],
  updateChartRangesTransformation
);
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

function updateChartRangesTransformation(
  toTransform: UpdateChartCommand | CreateChartCommand,
  executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
): UpdateChartCommand | CreateChartCommand {
  const definition = toTransform.definition;
  let labelZone: Zone | undefined;
  if (definition.labelRange) {
    labelZone = transformZone(toZone(definition.labelRange), executed);
  }
  return {
    ...toTransform,
    definition: {
      ...definition,
      dataSets: definition.dataSets
        .map((range) => toZone(range))
        .map((zone) => transformZone(zone, executed))
        .filter(isDefined)
        .map(zoneToXc),
      labelRange: labelZone ? zoneToXc(labelZone) : undefined,
    },
  };
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
