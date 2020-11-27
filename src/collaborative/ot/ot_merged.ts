import { isInside, overlap, toXC } from "../../helpers/index";
import { otRegistry } from "../../registries";
import { AddMergeCommand } from "../../types";
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
  if (overlap(toTransform.zone, executed.zone)) {
    return undefined;
  }
  return toTransform;
}
