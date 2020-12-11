import { otRegistry } from "../../src/ot/ot";
import { CoreCommandTypes, coreTypes } from "../../src/types";

// Not sure it should be merged, but will help us at least
describe.skip("OT Completude", () => {
  test("All transformations are written", () => {
    const commandList = coreTypes;
    for (let a of commandList.values()) {
      for (let b of commandList.values()) {
        if (whitelist[a] && whitelist[a].includes(b)) {
          continue;
        }
        const fn = otRegistry.getTransformation(a, b);
        if (!fn) {
          expect(`Missing transformation: ${a} - ${b}`).toBe(true);
        }
      }
    }
    expect(1).toBe(1);
  });
});

const whitelist: Record<CoreCommandTypes, CoreCommandTypes[]> = {
  /** CELLS */
  UPDATE_CELL: ["UPDATE_CELL_POSITION", "CLEAR_CELL", "DELETE_CONTENT"],
  UPDATE_CELL_POSITION: [],
  CLEAR_CELL: [],
  DELETE_CONTENT: [],

  /** GRID SHAPE */
  ADD_COLUMNS: [],
  ADD_ROWS: [],
  REMOVE_COLUMNS: [],
  REMOVE_ROWS: [],
  RESIZE_COLUMNS: [],
  RESIZE_ROWS: [],

  /** MERGE */
  ADD_MERGE: [],
  REMOVE_MERGE: [],

  /** SHEETS MANIPULATION */
  CREATE_SHEET: [],
  DELETE_SHEET: [],
  DUPLICATE_SHEET: [],
  MOVE_SHEET: [],
  RENAME_SHEET: [],

  /** CONDITIONAL FORMAT */
  ADD_CONDITIONAL_FORMAT: [],
  REMOVE_CONDITIONAL_FORMAT: [],

  /** FIGURES */
  CREATE_FIGURE: [],
  DELETE_FIGURE: [],
  UPDATE_FIGURE: [],

  /** FORMATTING */
  SET_FORMATTING: [],
  CLEAR_FORMATTING: [],
  SET_BORDER: [],
  SET_DECIMAL: [],

  /** CHART */
  CREATE_CHART: [],
  UPDATE_CHART: [],
};
