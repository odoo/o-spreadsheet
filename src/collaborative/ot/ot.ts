import {
  expandZoneOnInsertion,
  isDefined,
  isInside,
  reduceZoneOnDeletion,
} from "../../helpers/index";
import { otRegistry } from "../../registries/ot_registry";
import {
  AddColumnsRowsCommand,
  AddMergeCommand,
  CoreCommand,
  GridDependentCommand,
  isGridDependent,
  isPositionDependent,
  isSheetDependent,
  isTargetDependent,
  PositionDependentCommand,
  RemoveColumnsRowsCommand,
  SheetDependentCommand,
  TargetDependentCommand,
  Zone,
} from "../../types";
import "./ot_specific";

type TransformResult = "SKIP_TRANSFORMATION" | "IGNORE_COMMAND";

const transformations: {
  match: (t: CoreCommand) => boolean;
  fn: (t: CoreCommand, e: CoreCommand) => CoreCommand | TransformResult;
}[] = [
  { match: isSheetDependent, fn: transformSheetId },
  { match: isTargetDependent, fn: transformTarget },
  { match: isPositionDependent, fn: transformPosition },
  { match: isGridDependent, fn: transformDimension },
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
 * Apply a generic transformation based on the characteristic of the given commands.
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
      return result;
    }
  }
  return cmd;
}

function transformSheetId(
  cmd: Extract<CoreCommand, SheetDependentCommand>,
  executed: CoreCommand
): CoreCommand | TransformResult {
  const deleteSheet = executed.type === "DELETE_SHEET" && executed.sheetId;
  if (cmd.sheetId === deleteSheet) {
    return "IGNORE_COMMAND";
  }
  if (cmd.sheetId !== executed.sheetId) {
    return cmd;
  }
  return "SKIP_TRANSFORMATION";
}

function transformTarget(
  cmd: Extract<CoreCommand, TargetDependentCommand>,
  executed: CoreCommand
): Extract<CoreCommand, TargetDependentCommand> | TransformResult {
  const target: Zone[] = [];
  for (const zone of cmd.target) {
    let newZone: Zone | undefined = { ...zone };
    if (executed.type === "REMOVE_COLUMNS_ROWS") {
      newZone = reduceZoneOnDeletion(
        zone,
        executed.dimension === "COL" ? "left" : "top",
        executed.elements
      );
    }
    if (executed.type === "ADD_COLUMNS_ROWS") {
      newZone = expandZoneOnInsertion(
        zone,
        executed.dimension === "COL" ? "left" : "top",
        executed.base,
        executed.position,
        executed.quantity
      );
    }
    if (newZone) {
      target.push(newZone);
    }
  }
  if (!target.length) {
    return "IGNORE_COMMAND";
  }
  return { ...cmd, target };
}

function transformDimension(
  cmd: Extract<CoreCommand, GridDependentCommand>,
  executed: CoreCommand
): CoreCommand | TransformResult {
  if (executed.type === "ADD_COLUMNS_ROWS" || executed.type === "REMOVE_COLUMNS_ROWS") {
    const isUnique = cmd.type === "ADD_COLUMNS_ROWS";
    const field = isUnique ? "base" : "elements";
    let elements: number[] = isUnique ? [cmd[field]] : cmd[field];
    if (executed.type === "REMOVE_COLUMNS_ROWS") {
      elements = elements
        .map((element) => {
          if (executed.elements.includes(element)) {
            return undefined;
          }
          for (let removedElement of executed.elements) {
            if (element > removedElement) {
              element--;
            }
          }
          return element;
        })
        .filter(isDefined);
    }
    if (executed.type === "ADD_COLUMNS_ROWS") {
      const base = executed.position === "before" ? executed.base - 1 : executed.base;
      elements = elements.map((el) => (el > base ? el + executed.quantity : el));
    }
    if (elements.length) {
      let result: number[] | number = elements;
      if (isUnique) {
        result = elements[0];
      }
      return { ...cmd, [field]: result };
    }
    return "IGNORE_COMMAND";
  }
  return "SKIP_TRANSFORMATION";
}

/**
 * Transform a PositionDependentCommand. It could be impacted by a grid command
 * (Add/remove cols/rows) and a merge
 */
function transformPosition(
  cmd: Extract<CoreCommand, PositionDependentCommand>,
  executed: CoreCommand
): Extract<CoreCommand, PositionDependentCommand> | TransformResult {
  if (executed.type === "ADD_COLUMNS_ROWS" || executed.type === "REMOVE_COLUMNS_ROWS") {
    return transformPositionWithGrid(cmd, executed);
  }
  if (executed.type === "ADD_MERGE") {
    return transformPositionWithMerge(cmd, executed);
  }
  return "SKIP_TRANSFORMATION";
}

/**
 * Transform a PositionDependentCommand after a grid shape modification. This
 * transformation consists of updating the position.
 */
function transformPositionWithGrid(
  cmd: Extract<CoreCommand, PositionDependentCommand>,
  executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
): Extract<CoreCommand, PositionDependentCommand> | TransformResult {
  const field = executed.dimension === "COL" ? "col" : "row";
  let base = cmd[field];
  if (executed.type === "REMOVE_COLUMNS_ROWS") {
    if (executed.elements.includes(base)) {
      return "IGNORE_COMMAND";
    }
    for (let removedElement of executed.elements) {
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
  return { ...cmd, [field]: base };
}

/**
 * Transform a PositionDependentCommand after a merge. This transformation
 * consists of checking that the position is not inside the merged zones
 */
function transformPositionWithMerge(
  cmd: Extract<CoreCommand, PositionDependentCommand>,
  executed: AddMergeCommand
): Extract<CoreCommand, PositionDependentCommand> | TransformResult {
  for (const zone of executed.target) {
    const sameTopLeft = cmd.col === zone.left && cmd.row === zone.top;
    if (!sameTopLeft && isInside(cmd.col, cmd.row, zone)) {
      return "IGNORE_COMMAND";
    }
  }
  return cmd;
}
