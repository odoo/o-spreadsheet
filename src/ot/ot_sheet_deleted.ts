import { DeleteSheetCommand } from "../types/commands";
import { SheetyCommand } from "./ot_types";

export function sheetDeleted(
  toTransform: SheetyCommand,
  executed: DeleteSheetCommand
): SheetyCommand | undefined {
  if (toTransform.sheetId === executed.sheetId) {
    return undefined;
  }
  return toTransform;
}
