import { BACKGROUND_CHART_COLOR, DEFAULT_BORDER_DESC } from "../../src/constants";
import { CoreCommand, CoreCommandTypes } from "../../src/types";
import { target, toRangesData } from "./helpers";

type CommandMapping = {
  [key in CoreCommandTypes]: Extract<CoreCommand, { type: key }>;
};

const TEST_CHART_DATA = {
  basicChart: {
    type: "bar" as const,
    dataSets: ["B1:B4"],
    labelRange: "A2:A4",
    dataSetsHaveTitle: true,
    title: "hello",
    background: BACKGROUND_CHART_COLOR,
    stacked: false,
    legendPosition: "top" as const,
    verticalAxisPosition: "left" as const,
  },
};

export const TEST_COMMANDS: CommandMapping = {
  UPDATE_CELL: {
    type: "UPDATE_CELL",
    col: 0,
    row: 0,
    content: "hello",
    sheetId: "Sheet1",
  },
  UPDATE_CELL_POSITION: {
    type: "UPDATE_CELL_POSITION",
    cellId: "Id",
    sheetId: "Sheet1",
    row: 0,
    col: 0,
  },
  CLEAR_CELL: {
    type: "CLEAR_CELL",
    col: 0,
    row: 0,
    sheetId: "Sheet1",
  },
  DELETE_CONTENT: {
    type: "DELETE_CONTENT",
    target: target("A1"),
    sheetId: "Sheet1",
  },
  ADD_MERGE: {
    type: "ADD_MERGE",
    target: target("A1:A2"),
    sheetId: "Sheet1",
  },
  REMOVE_MERGE: {
    type: "REMOVE_MERGE",
    target: target("A1:A2"),
    sheetId: "Sheet1",
  },
  SET_FORMATTING: {
    type: "SET_FORMATTING",
    target: target("A1"),
    style: { bold: true },
    sheetId: "Sheet1",
  },
  CLEAR_FORMATTING: {
    type: "CLEAR_FORMATTING",
    target: target("A1"),
    sheetId: "Sheet1",
  },
  SET_BORDER: {
    type: "SET_BORDER",
    col: 0,
    row: 0,
    border: { top: DEFAULT_BORDER_DESC },
    sheetId: "Sheet1",
  },
  CREATE_FILTER_TABLE: {
    type: "CREATE_FILTER_TABLE",
    target: target("A1"),
    sheetId: "Sheet1",
  },
  REMOVE_FILTER_TABLE: {
    type: "REMOVE_FILTER_TABLE",
    target: target("A1"),
    sheetId: "Sheet1",
  },
  HIDE_SHEET: {
    type: "HIDE_SHEET",
    sheetId: "Sheet1",
  },
  CREATE_SHEET: {
    type: "CREATE_SHEET",
    sheetId: "newSheetId",
    name: "newSheetName",
    position: 0,
  },
  DUPLICATE_SHEET: {
    type: "DUPLICATE_SHEET",
    sheetId: "Sheet1",
    sheetIdTo: "duplicateSheetId",
  },
  MOVE_SHEET: {
    type: "MOVE_SHEET",
    sheetId: "Sheet1",
    direction: "left",
  },
  DELETE_SHEET: {
    type: "DELETE_SHEET",
    sheetId: "Sheet1",
  },
  RENAME_SHEET: {
    type: "RENAME_SHEET",
    sheetId: "Sheet1",
    name: "newName",
  },
  SHOW_SHEET: {
    type: "SHOW_SHEET",
    sheetId: "Sheet1",
  },
  ADD_CONDITIONAL_FORMAT: {
    type: "ADD_CONDITIONAL_FORMAT",
    ranges: toRangesData("sheetId", "A1"),
    cf: {
      id: "cfId",
      rule: {
        values: ["1"],
        operator: "Equal",
        type: "CellIsRule",
        style: { fillColor: "#FF0000" },
      },
    },
    sheetId: "Sheet1",
  },
  REMOVE_CONDITIONAL_FORMAT: {
    type: "REMOVE_CONDITIONAL_FORMAT",
    id: "cfId",
    sheetId: "Sheet1",
  },
  MOVE_CONDITIONAL_FORMAT: {
    type: "MOVE_CONDITIONAL_FORMAT",
    sheetId: "Sheet1",
    cfId: "cfId",
    direction: "up",
  },
  CREATE_FIGURE: {
    type: "CREATE_FIGURE",
    figure: {
      id: "figureId",
      tag: "tag",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
    sheetId: "Sheet1",
  },
  DELETE_FIGURE: {
    type: "DELETE_FIGURE",
    id: "figureId",
    sheetId: "Sheet1",
  },
  UPDATE_FIGURE: {
    type: "UPDATE_FIGURE",
    id: "figureId",
    sheetId: "Sheet1",
  },
  CREATE_CHART: {
    type: "CREATE_CHART",
    definition: TEST_CHART_DATA.basicChart,
    position: { x: 0, y: 0 },
    size: { width: 200, height: 200 },
    id: "figureId",
    sheetId: "Sheet1",
  },
  UPDATE_CHART: {
    type: "UPDATE_CHART",
    definition: TEST_CHART_DATA.basicChart,
    id: "figureId",
    sheetId: "Sheet1",
  },
  RESIZE_COLUMNS_ROWS: {
    type: "RESIZE_COLUMNS_ROWS",
    dimension: "ROW",
    elements: [0],
    size: 100,
    sheetId: "Sheet1",
  },
  ADD_COLUMNS_ROWS: {
    type: "ADD_COLUMNS_ROWS",
    position: "after",
    dimension: "ROW",
    base: 0,
    quantity: 1,
    sheetId: "Sheet1",
  },
  REMOVE_COLUMNS_ROWS: {
    type: "REMOVE_COLUMNS_ROWS",
    dimension: "ROW",
    elements: [0],
    sheetId: "Sheet1",
  },
  FREEZE_COLUMNS: {
    type: "FREEZE_COLUMNS",
    sheetId: "Sheet1",
    quantity: 1,
  },
  FREEZE_ROWS: {
    type: "FREEZE_ROWS",
    sheetId: "Sheet1",
    quantity: 1,
  },
  UNFREEZE_COLUMNS: {
    type: "UNFREEZE_COLUMNS",
    sheetId: "Sheet1",
  },
  UNFREEZE_ROWS: {
    type: "UNFREEZE_ROWS",
    sheetId: "Sheet1",
  },
  UNFREEZE_COLUMNS_ROWS: {
    type: "UNFREEZE_COLUMNS_ROWS",
    sheetId: "Sheet1",
  },
  HIDE_COLUMNS_ROWS: {
    type: "HIDE_COLUMNS_ROWS",
    dimension: "ROW",
    elements: [0],
    sheetId: "Sheet1",
  },
  UNHIDE_COLUMNS_ROWS: {
    type: "UNHIDE_COLUMNS_ROWS",
    dimension: "ROW",
    elements: [0],
    sheetId: "Sheet1",
  },
  SET_GRID_LINES_VISIBILITY: {
    type: "SET_GRID_LINES_VISIBILITY",
    sheetId: "Sheet1",
    areGridLinesVisible: true,
  },
  MOVE_RANGES: {
    type: "MOVE_RANGES",
    target: target("A1"),
    sheetId: "Sheet1",
    targetSheetId: "Sheet1",
    col: 0,
    row: 0,
  },
};
