import { Model } from "../../src";
import { concat, zoneToXc } from "../../src/helpers";
import { Branch } from "../../src/history/branch";
import { Tree } from "../../src/history/tree";
import { UID } from "../../src/types";
import { getEvaluatedGrid } from "./getters_helpers";
import { toCellPosition } from "./helpers";

interface Data {
  _commands?: any[];
}

interface Instruction {
  data: Data;
  id: UID;
}

export function getDebugInfo(tree: Tree) {
  let id = 0;
  const instructionsIds: Record<UID, Instruction> = {};
  const allStrings: string[] = [];

  function printBranch(branch: Branch<unknown>, level = 0) {
    const stringArray: string[] = [];
    for (let i = 0; i < level - 1; i++) {
      stringArray.push("".padEnd(10));
    }
    if (level > 0) {
      stringArray.push(">".padEnd(10));
    }
    for (let instruction of branch.getOperations()) {
      const idToShow = `${instruction.id.toString().substring(0, 4)}(${id})`;
      stringArray.push(idToShow.padEnd(10));
      instructionsIds[id++] = {
        // @ts-ignore
        data: instruction.data,
        id: instruction.id,
      };
    }
    allStrings.push(concat(stringArray));
  }
  let level = 0;
  for (const branch of tree["branches"]) {
    printBranch(branch, level);
    if (branch !== tree["branches"][tree["branches"].length - 1]) {
      const index = branch
        .getOperations()
        .findIndex((i) => tree["branchingOperationIds"].get(branch) === i.id);
      if (index === -1) {
        allStrings.push("Detached");
        level = 0;
      } else {
        level += index + 1;
      }
    }
  }
  allStrings.push("");
  allStrings.push("Instructions:");
  for (let [id, instruction] of Object.entries(instructionsIds)) {
    const data = instruction.data._commands
      ? JSON.stringify(instruction.data._commands)
      : JSON.stringify(instruction.data);
    allStrings.push(`${id}: ${data}`);
  }
  return allStrings.join("\n");
}

/**
 * Display the branches of the revisions of the given model
 */
export function printDebugModel(model: Model) {
  // @ts-ignore
  console.log(getDebugInfo(model["session"]["revisions"]["tree"]));
}

/**
 * Display the result of a PIVOT formula (the spill one)
 */
export function printPivot(model: Model, xc: string) {
  const sheetId = model.getters.getActiveSheetId();
  const position = toCellPosition(sheetId, xc);
  const zone = model.getters.getSpreadZone(position);
  if (!zone) {
    throw new Error("No zone found");
  }
  console.table(getEvaluatedGrid(model, zoneToXc(zone)));
}
