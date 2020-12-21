import { toXC, isInside, overlap } from "../helpers/index";
import { AddMergeCommand } from "../types";
import { CellCommand } from "./ot_types";

export function mergedCellCommand(
  toTransform: CellCommand,
  executed: AddMergeCommand
): CellCommand | undefined {
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

export function mergedCellAddMerge(toTransform: AddMergeCommand, executed: AddMergeCommand): AddMergeCommand | undefined {
  if (toTransform.sheetId !== executed.sheetId) {
    return toTransform;
  }
  if (overlap(toTransform.zone, executed.zone)){
    return undefined;
  }
  return toTransform;
}