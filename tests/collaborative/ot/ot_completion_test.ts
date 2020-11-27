import { coreTypes } from "../../../src";
import { inverseCommandRegistry } from "../../../src/registries";
import { otRegistry } from "../../../src/registries/ot_registry";
import { CoreCommandTypes } from "../../../src/types";

describe("Completion", () => {
  test("All transformations are written", () => {
    const commandList = coreTypes;
    let msg: string[] | undefined = undefined;
    let nbr = 0;
    let done = 0;
    for (let toTransform of commandList.values()) {
      for (let executed of commandList.values()) {
        if (whitelist[executed] && !whitelist[executed].has(toTransform)) {
          continue;
        }
        const fn = otRegistry.getTransformation(toTransform, executed);
        if (!fn) {
          if (!msg) {
            msg = ["Missing transformations:"];
          }
          msg.push(`${toTransform} - ${executed}`);
          nbr++;
        } else {
          done++;
        }
      }
    }
    if (msg) {
      msg.push(`Done: ${done}/${nbr + done} (${((done / (nbr + done)) * 100).toFixed(2)}%)`);
      msg.push(`Missing: ${nbr}`);
    }
    const missingTransformations: string | undefined = msg && msg.join("\n");
    expect(missingTransformations).toBeUndefined();
  });

  test("All inverses are written", () => {
    const commandList = coreTypes;
    let msg: string[] | undefined = undefined;
    for (let toInverse of commandList.values()) {
      if (inverseWhitelist.includes(toInverse)) {
        continue;
      }
      try {
        inverseCommandRegistry.get(toInverse);
      } catch (_) {
        if (!msg) {
          msg = ["Missing inverses:"];
          msg.push(`${toInverse}`);
        }
      }
    }
    let missingInverses: string | undefined = msg && msg.join("\n");
    if (missingInverses) {
      missingInverses += "\nPlease implement them or add them explicitly to the whitelist.";
    }
    expect(missingInverses).toBeUndefined();
  });
});

/**
 * Commands that do not need an inverse function
 */
const inverseWhitelist: CoreCommandTypes[] = [
  "UPDATE_CELL",
  "UPDATE_CELL_POSITION",
  "CLEAR_CELL",
  "DELETE_CONTENT",
  "RESIZE_COLUMNS",
  "RESIZE_ROWS",
  "MOVE_SHEET",
  "RENAME_SHEET",
  "ADD_CONDITIONAL_FORMAT",
  "REMOVE_CONDITIONAL_FORMAT",
  "DELETE_FIGURE",
  "UPDATE_FIGURE",
  "SET_FORMATTING",
  "CLEAR_FORMATTING",
  "SET_BORDER",
  "SET_DECIMAL",
  "UPDATE_CHART",
];

function none(): Set<CoreCommandTypes> {
  return new Set();
}

function allExcept(types: CoreCommandTypes[]) {
  const set = new Set(coreTypes);
  for (let type of types) {
    set.delete(type);
  }
  return set;
}

function only(types: CoreCommandTypes[]): Set<CoreCommandTypes> {
  return new Set(types);
}

const STYLE_COMMANDS = ["SET_FORMATTING", "CLEAR_FORMATTING", "SET_BORDER", "SET_DECIMAL"] as const;
const whitelist: Record<CoreCommandTypes, Set<CoreCommandTypes>> = {
  /** CELLS */
  UPDATE_CELL: none(),
  UPDATE_CELL_POSITION: none(),
  CLEAR_CELL: none(),
  DELETE_CONTENT: none(),

  /** GRID SHAPE */
  ADD_COLUMNS: only([
    "UPDATE_CELL",
    "CLEAR_CELL",
    "DELETE_CONTENT",
    "ADD_COLUMNS",
    "REMOVE_COLUMNS",
    "ADD_MERGE",
    "REMOVE_MERGE",
    "RESIZE_COLUMNS",
    ...STYLE_COMMANDS,
  ]),
  ADD_ROWS: only([
    "UPDATE_CELL",
    "CLEAR_CELL",
    "DELETE_CONTENT",
    "ADD_ROWS",
    "REMOVE_ROWS",
    "ADD_MERGE",
    "REMOVE_MERGE",
    "RESIZE_ROWS",
    ...STYLE_COMMANDS,
  ]),
  REMOVE_COLUMNS: only([
    "UPDATE_CELL",
    "CLEAR_CELL",
    "DELETE_CONTENT",
    "ADD_COLUMNS",
    "REMOVE_COLUMNS",
    "ADD_MERGE",
    "REMOVE_MERGE",
    "RESIZE_COLUMNS",
    ...STYLE_COMMANDS,
  ]),
  REMOVE_ROWS: only([
    "UPDATE_CELL",
    "CLEAR_CELL",
    "DELETE_CONTENT",
    "ADD_ROWS",
    "REMOVE_ROWS",
    "ADD_MERGE",
    "REMOVE_MERGE",
    "RESIZE_ROWS",
    ...STYLE_COMMANDS,
  ]),
  RESIZE_COLUMNS: none(),
  RESIZE_ROWS: none(),

  /** MERGE */
  ADD_MERGE: only(["UPDATE_CELL", "CLEAR_CELL", "ADD_MERGE", "REMOVE_MERGE"]),
  REMOVE_MERGE: none(),

  /** SHEETS MANIPULATION */
  CREATE_SHEET: none(),
  DELETE_SHEET: allExcept(["CREATE_SHEET"]),
  DUPLICATE_SHEET: none(),
  MOVE_SHEET: none(),
  RENAME_SHEET: none(),

  /** CONDITIONAL FORMAT */
  ADD_CONDITIONAL_FORMAT: none(),
  REMOVE_CONDITIONAL_FORMAT: none(),

  /** FIGURES */
  CREATE_FIGURE: none(),
  DELETE_FIGURE: only(["UPDATE_FIGURE", "UPDATE_CHART"]),
  UPDATE_FIGURE: none(),

  /** FORMATTING */
  SET_FORMATTING: none(),
  CLEAR_FORMATTING: none(),
  SET_BORDER: none(),
  SET_DECIMAL: none(),

  /** CHART */
  CREATE_CHART: none(),
  UPDATE_CHART: none(),
};
