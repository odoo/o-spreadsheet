import { toXC, isInside, overlap } from "../../helpers/index";
import { otRegistry } from "../../registries";
import { AddMergeCommand } from "../../types";
import { PositionalCommand } from "../../types/ot_types";

/*
 * This file contains the transformations when an AddMergeCommand is executed
 * before the command to transform.
 * Basically, the transformation is to skip the command if the command is inside
 * the merge
 */

otRegistry.addTransformation(
  "ADD_MERGE",
  ["UPDATE_CELL", "UPDATE_CELL_POSITION", "CLEAR_CELL", "SET_BORDER"],
  cellCommand
);

otRegistry.addTransformation("ADD_MERGE", ["ADD_MERGE", "REMOVE_MERGE"], mergeCommand);

function cellCommand(
  toTransform: PositionalCommand,
  executed: AddMergeCommand
): PositionalCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  const xc = toXC(toTransform.col, toTransform.row);
  const xcMerge = toXC(executed.zone.left, executed.zone.top);
  if (xc === xcMerge || !isInside(toTransform.col, toTransform.row, executed.zone)) {
    return toTransform;
  }
  return undefined;
}

function mergeCommand(
  toTransform: AddMergeCommand,
  executed: AddMergeCommand
): AddMergeCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  if (overlap(toTransform.zone, executed.zone)) {
    return undefined;
  }
  return toTransform;
}
