import { CoreCommand, DeleteSheetCommand } from "../types/commands";

export function sheetDeleted<T extends CoreCommand>(
  toTransform: T,
  executed: DeleteSheetCommand
): T | undefined {
  if ("sheetId" in toTransform && toTransform["sheetId"] === executed.sheetId) {
    return undefined;
  }
  return toTransform;
}
