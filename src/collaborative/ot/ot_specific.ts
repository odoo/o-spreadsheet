import { isDefined, overlap, toZone, zoneToXc } from "../../helpers";
import { otRegistry } from "../../registries";
import {
  AddColumnsRowsCommand,
  AddMergeCommand,
  ChartUIDefinition,
  CreateChartCommand,
  CreateSheetCommand,
  DeleteFigureCommand,
  DeleteSheetCommand,
  MoveRangeCommand,
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
otRegistry.addTransformation("DELETE_SHEET", ["MOVE_RANGES"], transformTargetSheetId);
otRegistry.addTransformation("DELETE_FIGURE", ["UPDATE_FIGURE", "UPDATE_CHART"], updateChartFigure);
otRegistry.addTransformation("CREATE_SHEET", ["CREATE_SHEET"], createSheetTransformation);
otRegistry.addTransformation("ADD_MERGE", ["ADD_MERGE", "REMOVE_MERGE"], mergeTransformation);

function transformTargetSheetId(
  cmd: MoveRangeCommand,
  executed: DeleteSheetCommand
): MoveRangeCommand | undefined {
  const deletedSheetId = executed.sheetId;
  if (cmd.targetSheetId === deletedSheetId || cmd.sheetId === deletedSheetId) {
    return undefined;
  }
  return cmd;
}

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
  let baselineZone: Zone | undefined;
  let keyValueZone: Zone | undefined;
  let dataSets: string[] | undefined;
  if ("labelRange" in definition && definition.labelRange) {
    labelZone = transformZone(toZone(definition.labelRange), executed);
  }
  if ("dataSets" in definition && definition.dataSets) {
    dataSets = definition.dataSets
      .map(toZone)
      .map((zone) => transformZone(zone, executed))
      .filter(isDefined)
      .map(zoneToXc);
  }
  if ("baseline" in definition && definition.baseline) {
    baselineZone = transformZone(toZone(definition.baseline), executed);
  }
  if ("keyValue" in definition && definition.keyValue) {
    keyValueZone = transformZone(toZone(definition.keyValue), executed);
  }

  const def = {
    ...definition,
    dataSets,
    labelRange: labelZone ? zoneToXc(labelZone) : undefined,
    baseline: baselineZone ? zoneToXc(baselineZone) : undefined,
    keyValue: keyValueZone ? zoneToXc(keyValueZone) : undefined,
  };
  return {
    ...toTransform,
    definition: def as ChartUIDefinition,
  };
}

function createSheetTransformation(
  cmd: CreateSheetCommand,
  executed: CreateSheetCommand
): CreateSheetCommand {
  if (cmd.name === executed.name) {
    return {
      ...cmd,
      name: cmd.name?.match(/\d+/)
        ? cmd.name.replace(/\d+/, (n) => (parseInt(n) + 1).toString())
        : `${cmd.name}~`,
      position: cmd.position + 1,
    };
  }
  return cmd;
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
