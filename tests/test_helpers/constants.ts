import { BACKGROUND_CHART_COLOR, DEFAULT_BORDER_DESC } from "../../src/constants";
import { CoreCommand, CoreCommandTypes } from "../../src/types";
import { target, toRangesData } from "./helpers";

export const TEST_CHART_DATA = {
  basicChart: {
    type: "bar" as const,
    dataSets: ["B1:B4"],
    labelRange: "A2:A4",
    dataSetsHaveTitle: true,
    title: "hello",
    background: BACKGROUND_CHART_COLOR,
    verticalAxisPosition: "left" as const,
    stacked: false,
    legendPosition: "top" as const,
  },
  scorecard: {
    type: "scorecard" as const,
    keyValue: "B1:B4",
    baseline: "A2:A4",
    title: "hello",
    baselineDescr: "description",
    baselineMode: "difference" as const,
  },
  gauge: {
    type: "gauge" as const,
    dataRange: "B1:B4",
    title: "hello",
    sectionRule: {
      rangeMin: "0",
      rangeMax: "100",
      colors: {
        lowerColor: "#6aa84f",
        middleColor: "#f1c232",
        upperColor: "#cc0000",
      },
      lowerInflectionPoint: {
        type: "number" as const,
        value: "33",
      },
      upperInflectionPoint: {
        type: "number" as const,
        value: "66",
      },
    },
  },
};

type CommandMapping = {
  [key in CoreCommandTypes]: Extract<CoreCommand, { type: key }>;
};

// TODO : use this in ot_*.test.ts files. should be at least -400 lines of code
const TEST_COMMANDS_PARTIAL: Partial<CommandMapping> = {
  UPDATE_CELL: {
    type: "UPDATE_CELL",
    col: 0,
    row: 0,
    content: "hello",
    sheetId: "sheetId",
  },
  CLEAR_CELL: {
    type: "CLEAR_CELL",
    col: 0,
    row: 0,
    sheetId: "sheetId",
  },
  DELETE_CONTENT: {
    type: "DELETE_CONTENT",
    target: target("A1"),
    sheetId: "sheetId",
  },
  ADD_MERGE: {
    type: "ADD_MERGE",
    target: target("A1:A2"),
    sheetId: "sheetId",
  },
  REMOVE_MERGE: {
    type: "REMOVE_MERGE",
    target: target("A1:A2"),
    sheetId: "sheetId",
  },
  SET_FORMATTING: {
    type: "SET_FORMATTING",
    target: target("A1"),
    style: { bold: true },
    sheetId: "sheetId",
  },
  CLEAR_FORMATTING: {
    type: "CLEAR_FORMATTING",
    target: target("A1"),
    sheetId: "sheetId",
  },
  SET_BORDER: {
    type: "SET_BORDER",
    col: 0,
    row: 0,
    border: { top: DEFAULT_BORDER_DESC },
    sheetId: "sheetId",
  },
  CREATE_FILTER_TABLE: {
    type: "CREATE_FILTER_TABLE",
    target: target("A1"),
    sheetId: "sheetId",
  },
  REMOVE_FILTER_TABLE: {
    type: "REMOVE_FILTER_TABLE",
    target: target("A1"),
    sheetId: "sheetId",
  },
  HIDE_SHEET: {
    type: "HIDE_SHEET",
    sheetId: "sheetId",
  },
  CREATE_SHEET: {
    type: "CREATE_SHEET",
    sheetId: "newSheetId",
    name: "newSheetName",
    position: 0,
  },
  DUPLICATE_SHEET: {
    type: "DUPLICATE_SHEET",
    sheetId: "sheetId",
    sheetIdTo: "duplicateSheetId",
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
    sheetId: "sheetId",
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
    sheetId: "sheetId",
  },
  CREATE_CHART: {
    type: "CREATE_CHART",
    definition: TEST_CHART_DATA.basicChart,
    position: { x: 0, y: 0 },
    size: { width: 200, height: 200 },
    id: "figureId",
    sheetId: "sheetId",
  },
  CREATE_IMAGE: {
    type: "CREATE_IMAGE",
    position: { x: 0, y: 0 },
    size: { width: 200, height: 200 },
    definition: { path: "/image/1", size: { width: 200, height: 200 } },
    sheetId: "sheetId",
    figureId: "figureId",
  },
  RESIZE_COLUMNS_ROWS: {
    type: "RESIZE_COLUMNS_ROWS",
    dimension: "ROW",
    elements: [0],
    size: 100,
    sheetId: "sheetId",
  },
  ADD_COLUMNS_ROWS: {
    type: "ADD_COLUMNS_ROWS",
    position: "after",
    dimension: "ROW",
    base: 0,
    quantity: 1,
    sheetId: "sheetId",
  },
};
export const TEST_COMMANDS = TEST_COMMANDS_PARTIAL as CommandMapping;
