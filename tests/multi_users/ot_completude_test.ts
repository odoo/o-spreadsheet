import { otRegistry } from "../../src/ot/ot";
import { CoreCommandTypes, coreTypes } from "../../src/types";

// Not sure it should be merged, but will help us at least
describe("OT Completude", () => {
  test("All transformations are written", () => {
    const commandList = coreTypes;
    let msg: string | undefined = undefined;
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
            msg = `Missing transformation: ${toTransform} - ${executed}`;
          }
          nbr++;
        } else {
          done++;
        }
      }
    }
    console.log(nbr, "/", nbr + done, "(", ((done / (nbr + done)) * 100).toFixed(2), "%)");
    expect(msg).toBeUndefined();
  });
});

function all(): Set<CoreCommandTypes> {
  return coreTypes;
}

function none(): Set<CoreCommandTypes> {
  return new Set();
}

// function allExcept(types: CoreCommandTypes[]) {
//   const set = new Set(coreTypes);
//   for (let type of types) {
//     set.delete(type);
//   }
//   return set;
// }

function only(types: CoreCommandTypes[]): Set<CoreCommandTypes> {
  return new Set(types);
}

const STYLE_COMMANDS = ["SET_FORMATTING", "CLEAR_FORMATTING", "SET_BORDER", "SET_DECIMAL"] as const;
const RESIZE_COMMANDS = ["RESIZE_COLUMNS", "RESIZE_ROWS"] as const;
// Record<Executed, ToTransform[]>
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
    ...STYLE_COMMANDS,
    ...RESIZE_COMMANDS,
  ]),
  ADD_ROWS: only([
    "UPDATE_CELL",
    "CLEAR_CELL",
    "DELETE_CONTENT",
    "ADD_ROWS",
    "REMOVE_ROWS",
    "ADD_MERGE",
    ...STYLE_COMMANDS,
    ...RESIZE_COMMANDS,
  ]),
  REMOVE_COLUMNS: only([
    "UPDATE_CELL",
    "CLEAR_CELL",
    "DELETE_CONTENT",
    "ADD_COLUMNS",
    "REMOVE_COLUMNS",
    "ADD_MERGE",
    ...STYLE_COMMANDS,
    ...RESIZE_COMMANDS,
  ]),
  REMOVE_ROWS: only([
    "UPDATE_CELL",
    "CLEAR_CELL",
    "DELETE_CONTENT",
    "ADD_ROWS",
    "REMOVE_ROWS",
    "ADD_MERGE",
    ...STYLE_COMMANDS,
    ...RESIZE_COMMANDS,
  ]),
  RESIZE_COLUMNS: none(),
  RESIZE_ROWS: none(),

  /** MERGE */
  ADD_MERGE: only(["UPDATE_CELL", "CLEAR_CELL", "DELETE_CONTENT", "ADD_MERGE", ...STYLE_COMMANDS]),
  REMOVE_MERGE: none(),

  /** SHEETS MANIPULATION */
  CREATE_SHEET: none(),
  DELETE_SHEET: all(),
  DUPLICATE_SHEET: only(["CREATE_SHEET", "DUPLICATE_SHEET", "MOVE_SHEET"]),
  MOVE_SHEET: only(["CREATE_SHEET", "DUPLICATE_SHEET", "MOVE_SHEET"]),
  RENAME_SHEET: only(["UPDATE_CELL"]),

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
  UPDATE_CHART: only(["DELETE_FIGURE"]),
};
