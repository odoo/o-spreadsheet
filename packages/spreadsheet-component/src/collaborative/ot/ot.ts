import {
  getAddHeaderStartIndex,
  isDefined,
  isInside,
  moveHeaderIndexesOnHeaderAddition,
  moveHeaderIndexesOnHeaderDeletion,
} from "../../helpers/index";
import { otRegistry } from "../../registries/ot_registry";
import {
  AddColumnsRowsCommand,
  AddMergeCommand,
  CoreCommand,
  HeaderIndex,
  PositionDependentCommand,
  RemoveColumnsRowsCommand,
  SheetDependentCommand,
  TargetDependentCommand,
  Zone,
  isPositionDependent,
  isSheetDependent,
  isTargetDependent,
} from "../../types";
import {
  HeadersDependentCommand,
  RangesDependentCommand,
  ZoneDependentCommand,
  isHeadersDependant,
  isRangeDependant,
  isZoneDependent,
} from "./../../types/commands";
import { transformRangeData, transformZone } from "./ot_helpers";
import "./ot_specific";

type TransformResult = "SKIP_TRANSFORMATION" | "IGNORE_COMMAND";

const transformations: {
  match: (t: CoreCommand) => boolean;
  fn: (t: CoreCommand, e: CoreCommand) => CoreCommand | TransformResult;
}[] = [
  { match: isSheetDependent, fn: transformSheetId },
  { match: isTargetDependent, fn: transformTarget },
  { match: isZoneDependent, fn: transformZoneDependentCommand },
  { match: isPositionDependent, fn: transformPosition },
  { match: isHeadersDependant, fn: transformHeaders },
  { match: isRangeDependant, fn: transformRangesDependentCommand },
];

/**
 * Get the result of applying the operation transformations on the given command
 * to transform based on the executed command.
 * Let's see a small example:
 * Given
 *  - command A: set the content of C1 to "Hello"
 *  - command B: add a column after A
 *
 * If command B has been executed locally and not transmitted (yet) to
 * other clients, and command A arrives from an other client to be executed locally.
 * Command A is no longer valid and no longer reflects the user intention.
 * It needs to be transformed knowing that command B is already executed.
 * transform(A, B) => set the content of D1 to "Hello"
 */
export function transform(
  toTransform: CoreCommand,
  executed: CoreCommand
): CoreCommand | undefined {
  const specificTransform = otRegistry.getTransformation(toTransform.type, executed.type);
  return specificTransform
    ? specificTransform(toTransform, executed)
    : genericTransform(toTransform, executed);
}

/**
 * Get the result of applying the operation transformations on all the given
 * commands to transform for each executed commands.
 */
export function transformAll(
  toTransform: readonly CoreCommand[],
  executed: readonly CoreCommand[]
): CoreCommand[] {
  let transformedCommands = [...toTransform];
  for (const executedCommand of executed) {
    transformedCommands = transformedCommands
      .map((cmd) => transform(cmd, executedCommand))
      .filter(isDefined);
  }
  return transformedCommands;
}

/**
 * Apply all generic transformation based on the characteristic of the given commands.
 */
function genericTransform(cmd: CoreCommand, executed: CoreCommand): CoreCommand | undefined {
  for (const { match, fn } of transformations) {
    if (match(cmd)) {
      const result = fn(cmd, executed);
      if (result === "SKIP_TRANSFORMATION") {
        continue;
      }
      if (result === "IGNORE_COMMAND") {
        return undefined;
      }
      cmd = result;
    }
  }
  return cmd;
}

function transformSheetId(
  toTransform: Extract<CoreCommand, SheetDependentCommand>,
  executed: CoreCommand
): CoreCommand | TransformResult {
  if (!("sheetId" in executed)) {
    return toTransform;
  }

  const deleteSheet = executed.type === "DELETE_SHEET" && executed.sheetId;
  if (toTransform.sheetId === deleteSheet) {
    return "IGNORE_COMMAND";
  } else if (
    toTransform.type === "CREATE_SHEET" ||
    executed.type === "CREATE_SHEET" ||
    toTransform.sheetId !== executed.sheetId
  ) {
    return toTransform;
  }
  return "SKIP_TRANSFORMATION";
}

function transformTarget(
  cmd: Extract<CoreCommand, TargetDependentCommand>,
  executed: CoreCommand
): Extract<CoreCommand, TargetDependentCommand> | TransformResult {
  const transformSheetResult = transformSheetId(cmd, executed);
  if (transformSheetResult !== "SKIP_TRANSFORMATION") {
    return transformSheetResult === "IGNORE_COMMAND" ? "IGNORE_COMMAND" : cmd;
  }
  const target: Zone[] = [];
  for (const zone of cmd.target) {
    const newZone = transformZone(zone, executed);
    if (newZone) {
      target.push(newZone);
    }
  }
  if (!target.length) {
    return "IGNORE_COMMAND";
  }
  return { ...cmd, target };
}

function transformZoneDependentCommand(
  cmd: Extract<CoreCommand, ZoneDependentCommand>,
  executed: CoreCommand
) {
  const transformSheetResult = transformSheetId(cmd, executed);
  if (transformSheetResult !== "SKIP_TRANSFORMATION") {
    return transformSheetResult === "IGNORE_COMMAND" ? "IGNORE_COMMAND" : cmd;
  }
  const newZone = transformZone(cmd.zone, executed);
  if (newZone) {
    return { ...cmd, zone: newZone };
  }
  return "IGNORE_COMMAND";
}
function transformRangesDependentCommand(
  toTransform: Extract<CoreCommand, RangesDependentCommand>,
  executed: CoreCommand
): Extract<CoreCommand, RangesDependentCommand> | TransformResult {
  if (!("sheetId" in executed)) {
    return toTransform;
  }
  const ranges = toTransform.ranges
    .map((range) => transformRangeData(range, executed))
    .filter(isDefined);
  if (!ranges.length) {
    return "IGNORE_COMMAND";
  }
  return { ...toTransform, ranges };
}

function transformHeaders(
  toTransform: Extract<CoreCommand, HeadersDependentCommand>,
  executed: CoreCommand
): CoreCommand | TransformResult {
  const transformSheetResult = transformSheetId(toTransform, executed);
  if (transformSheetResult !== "SKIP_TRANSFORMATION") {
    return transformSheetResult === "IGNORE_COMMAND" ? "IGNORE_COMMAND" : toTransform;
  }
  if (executed.type !== "ADD_COLUMNS_ROWS" && executed.type !== "REMOVE_COLUMNS_ROWS") {
    return "SKIP_TRANSFORMATION";
  }
  if (executed.dimension !== toTransform.dimension) {
    return toTransform;
  }

  let result: HeaderIndex[] = [];
  if (executed.type === "REMOVE_COLUMNS_ROWS") {
    result = moveHeaderIndexesOnHeaderDeletion(executed.elements, toTransform.elements);
  } else if (executed.type === "ADD_COLUMNS_ROWS") {
    const base = getAddHeaderStartIndex(executed.position, executed.base);
    result = moveHeaderIndexesOnHeaderAddition(base, executed.quantity, toTransform.elements);
  }

  if (result.length === 0) {
    return "IGNORE_COMMAND";
  }
  return { ...toTransform, elements: result };
}

/**
 * Transform a PositionDependentCommand. It could be impacted by a grid command
 * (Add/remove cols/rows) and a merge
 */
function transformPosition(
  toTransform: Extract<CoreCommand, PositionDependentCommand>,
  executed: CoreCommand
): Extract<CoreCommand, PositionDependentCommand> | TransformResult {
  const transformSheetResult = transformSheetId(toTransform, executed);
  if (transformSheetResult !== "SKIP_TRANSFORMATION") {
    return transformSheetResult === "IGNORE_COMMAND" ? "IGNORE_COMMAND" : toTransform;
  }
  if (executed.type === "ADD_COLUMNS_ROWS" || executed.type === "REMOVE_COLUMNS_ROWS") {
    return transformPositionWithGrid(toTransform, executed);
  }
  if (executed.type === "ADD_MERGE") {
    return transformPositionWithMerge(toTransform, executed);
  }
  return "SKIP_TRANSFORMATION";
}

/**
 * Transform a PositionDependentCommand after a grid shape modification. This
 * transformation consists of updating the position.
 */
function transformPositionWithGrid(
  toTransform: Extract<CoreCommand, PositionDependentCommand>,
  executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
): Extract<CoreCommand, PositionDependentCommand> | TransformResult {
  const field = executed.dimension === "COL" ? "col" : "row";
  let base = toTransform[field];
  if (executed.type === "REMOVE_COLUMNS_ROWS") {
    const elements = [...executed.elements].sort((a, b) => b - a);
    if (elements.includes(base)) {
      return "IGNORE_COMMAND";
    }
    for (let removedElement of elements) {
      if (base >= removedElement) {
        base--;
      }
    }
  }
  if (executed.type === "ADD_COLUMNS_ROWS") {
    if (base > executed.base || (base === executed.base && executed.position === "before")) {
      base = base + executed.quantity;
    }
  }
  return { ...toTransform, [field]: base };
}

/**
 * Transform a PositionDependentCommand after a merge. This transformation
 * consists of checking that the position is not inside the merged zones
 */
function transformPositionWithMerge(
  toTransform: Extract<CoreCommand, PositionDependentCommand>,
  executed: AddMergeCommand
): Extract<CoreCommand, PositionDependentCommand> | TransformResult {
  for (const zone of executed.target) {
    const sameTopLeft = toTransform.col === zone.left && toTransform.row === zone.top;
    if (!sameTopLeft && isInside(toTransform.col, toTransform.row, zone)) {
      return "IGNORE_COMMAND";
    }
  }
  return toTransform;
}
