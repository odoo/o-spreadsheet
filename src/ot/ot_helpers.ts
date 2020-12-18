import { UID, Zone } from "../types";
import { CoreCommand, DeleteSheetCommand } from "../types/commands";

export type SheetyCommand = Extract<CoreCommand, { sheetId: UID }>;

export type CellCommand = Extract<CoreCommand, { col: number; row: number }>;
export type TargetCommand = Extract<CoreCommand, { target: Zone[] }>;

export function sheetDeleted(
  toTransform: SheetyCommand,
  executed: DeleteSheetCommand
): SheetyCommand | undefined {
  if (toTransform.sheetId === executed.sheetId) {
    return undefined;
  }
  return toTransform;
}
