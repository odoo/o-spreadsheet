import { toXC, isInside } from "../helpers/index";
import { AddMergeCommand } from "../types";
import { CellCommand } from "./ot_helpers";

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
