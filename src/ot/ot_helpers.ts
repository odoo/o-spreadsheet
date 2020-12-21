import {
  DeleteFigureCommand,
  DeleteSheetCommand,
  DuplicateSheetCommand,
  UpdateChartCommand,
  UpdateFigureCommand,
} from "../types/commands";
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

export function sheetDeletedAndDuplicate(
  toTransform: DuplicateSheetCommand,
  executed: DeleteSheetCommand
): DuplicateSheetCommand | undefined {
  if (toTransform.sheetIdFrom === executed.sheetId) {
    return undefined;
  }
  return toTransform;
}

export function figureDeletedUpdateChartFigure(
  toTransform: UpdateFigureCommand | UpdateChartCommand,
  executed: DeleteFigureCommand
): UpdateFigureCommand | UpdateChartCommand | undefined {
  if (toTransform.id === executed.id) {
    return undefined;
  }
  return toTransform;
}
