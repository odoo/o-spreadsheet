import { isInside, overlap, toXC } from "../../helpers/index";
import { otRegistry } from "../../registries";
import { AddMergeCommand, Zone } from "../../types";
import { PositionalCommand } from "../../types/collaborative/ot_types";
import { withSheetCheck } from "./ot_helpers";

/*
 * This file contains the transformations when an AddMergeCommand is executed
 * before the command to transform.
 * Basically, the transformation is to skip the command if the command is inside
 * the merge
 */

otRegistry.addTransformation(
  "ADD_MERGE",
  ["UPDATE_CELL", "UPDATE_CELL_POSITION", "CLEAR_CELL", "SET_BORDER"],
  withSheetCheck(cellCommand)
);

otRegistry.addTransformation(
  "ADD_MERGE",
  ["ADD_MERGE", "REMOVE_MERGE"],
  withSheetCheck(mergeCommand)
);

function cellCommand(
  toTransform: PositionalCommand,
  executed: AddMergeCommand
): PositionalCommand | undefined {
  const xc = toXC(toTransform.col, toTransform.row);
  for (const zone of executed.target) {
    const xcMerge = toXC(zone.left, zone.top);
    if (xc !== xcMerge && isInside(toTransform.col, toTransform.row, zone)) {
      return undefined;
    }
  }
  return toTransform;
}

function mergeCommand(
  toTransform: AddMergeCommand,
  executed: AddMergeCommand
): AddMergeCommand | undefined {
  const target: Zone[] = [];
  for (const toTransformZone of toTransform.target) {
    for (const executedZone of executed.target) {
      if (!overlap(toTransformZone, executedZone)) {
        target.push({ ...toTransformZone });
      }
    }
  }
  if (target.length) {
    return { ...toTransform, target };
  }
  return undefined;
}
