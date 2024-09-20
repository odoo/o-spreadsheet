import { SpreadsheetPivotTable } from "../../src";
import { BACKGROUND_CHART_COLOR, DEFAULT_BORDER_DESC } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { CoreCommand, CoreCommandTypes, DEFAULT_LOCALE, Locale, TableStyle } from "../../src/types";
import { PivotCoreDefinition } from "../../src/types/pivot";
import { target, toRangesData } from "./helpers";

export const TEST_CHART_DATA = {
  basicChart: {
    type: "bar" as const,
    dataSets: [
      {
        dataRange: "B1:B4",
        yAxisId: "y",
      },
    ],
    labelRange: "A2:A4",
    dataSetsHaveTitle: true,
    title: { text: "hello" },
    background: BACKGROUND_CHART_COLOR,
    stacked: false,
    legendPosition: "top" as const,
  },
  combo: {
    type: "combo" as const,
    dataSets: [
      {
        dataRange: "B1:B4",
      },
    ],
    labelRange: "A2:A4",
    dataSetsHaveTitle: true,
    title: { text: "hello" },
    background: BACKGROUND_CHART_COLOR,
    legendPosition: "top" as const,
  },
  scorecard: {
    type: "scorecard" as const,
    keyValue: "B1:B4",
    baseline: "A2:A4",
    title: { text: "hello" },
    baselineDescr: "description",
    baselineMode: "difference" as const,
  },
  gauge: {
    type: "gauge" as const,
    dataRange: "B1:B4",
    title: { text: "hello" },
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
        operator: "<=" as const,
      },
      upperInflectionPoint: {
        type: "number" as const,
        value: "66",
        operator: "<=" as const,
      },
    },
  },
};

const PIVOT: PivotCoreDefinition = {
  dataSet: {
    zone: toZone("A1:B1"),
    sheetId: "Sheet1",
  },
  columns: [],
  rows: [],
  measures: [],
  name: "pivot",
  type: "SPREADSHEET",
};

type CommandMapping = {
  [key in CoreCommandTypes]: Extract<CoreCommand, { type: key }>;
};

export const TEST_COMMANDS: CommandMapping = {
  UPDATE_CELL: {
    type: "UPDATE_CELL",
    col: 0,
    row: 0,
    content: "hello",
    sheetId: "sheetId",
  },
  UPDATE_CELL_POSITION: {
    type: "UPDATE_CELL_POSITION",
    cellId: "Id",
    sheetId: "sheetId",
    row: 0,
    col: 0,
  },
  CLEAR_CELL: {
    type: "CLEAR_CELL",
    col: 0,
    row: 0,
    sheetId: "sheetId",
  },
  CLEAR_CELLS: {
    type: "CLEAR_CELLS",
    target: target("A1"),
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
  CREATE_TABLE: {
    type: "CREATE_TABLE",
    ranges: toRangesData("sheetId", "A1"),
    sheetId: "sheetId",
    tableType: "static",
  },
  REMOVE_TABLE: {
    type: "REMOVE_TABLE",
    target: target("A1"),
    sheetId: "sheetId",
  },
  UPDATE_TABLE: {
    type: "UPDATE_TABLE",
    sheetId: "sheetId",
    zone: { top: 0, left: 0, bottom: 1, right: 1 },
  },
  CREATE_TABLE_STYLE: {
    type: "CREATE_TABLE_STYLE",
    tableStyleId: "MyStyle",
    tableStyleName: "MyStyle",
    templateName: "lightWithHeader",
    primaryColor: "#0f0",
  },
  REMOVE_TABLE_STYLE: {
    type: "REMOVE_TABLE_STYLE",
    tableStyleId: "MyStyle",
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
  MOVE_SHEET: {
    type: "MOVE_SHEET",
    sheetId: "sheetId",
    delta: -1,
  },
  DELETE_SHEET: {
    type: "DELETE_SHEET",
    sheetId: "sheetId",
  },
  RENAME_SHEET: {
    type: "RENAME_SHEET",
    sheetId: "sheetId",
    name: "newName",
  },
  COLOR_SHEET: {
    type: "COLOR_SHEET",
    sheetId: "sheetId",
  },
  SHOW_SHEET: {
    type: "SHOW_SHEET",
    sheetId: "sheetId",
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
  REMOVE_CONDITIONAL_FORMAT: {
    type: "REMOVE_CONDITIONAL_FORMAT",
    id: "cfId",
    sheetId: "sheetId",
  },
  CHANGE_CONDITIONAL_FORMAT_PRIORITY: {
    type: "CHANGE_CONDITIONAL_FORMAT_PRIORITY",
    sheetId: "sheetId",
    cfId: "cfId",
    delta: 1,
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
  DELETE_FIGURE: {
    type: "DELETE_FIGURE",
    id: "figureId",
    sheetId: "sheetId",
  },
  UPDATE_FIGURE: {
    type: "UPDATE_FIGURE",
    id: "figureId",
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
  UPDATE_CHART: {
    type: "UPDATE_CHART",
    definition: TEST_CHART_DATA.basicChart,
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
  REMOVE_COLUMNS_ROWS: {
    type: "REMOVE_COLUMNS_ROWS",
    dimension: "ROW",
    elements: [0],
    sheetId: "sheetId",
  },
  FREEZE_COLUMNS: {
    type: "FREEZE_COLUMNS",
    sheetId: "sheetId",
    quantity: 1,
  },
  FREEZE_ROWS: {
    type: "FREEZE_ROWS",
    sheetId: "sheetId",
    quantity: 1,
  },
  UNFREEZE_COLUMNS: {
    type: "UNFREEZE_COLUMNS",
    sheetId: "sheetId",
  },
  UNFREEZE_ROWS: {
    type: "UNFREEZE_ROWS",
    sheetId: "sheetId",
  },
  UNFREEZE_COLUMNS_ROWS: {
    type: "UNFREEZE_COLUMNS_ROWS",
    sheetId: "sheetId",
  },
  HIDE_COLUMNS_ROWS: {
    type: "HIDE_COLUMNS_ROWS",
    dimension: "ROW",
    elements: [0],
    sheetId: "sheetId",
  },
  UNHIDE_COLUMNS_ROWS: {
    type: "UNHIDE_COLUMNS_ROWS",
    dimension: "ROW",
    elements: [0],
    sheetId: "sheetId",
  },
  SET_GRID_LINES_VISIBILITY: {
    type: "SET_GRID_LINES_VISIBILITY",
    sheetId: "sheetId",
    areGridLinesVisible: true,
  },
  MOVE_RANGES: {
    type: "MOVE_RANGES",
    target: target("A1"),
    sheetId: "sheetId",
    targetSheetId: "sheetId",
    col: 0,
    row: 0,
  },
  SET_ZONE_BORDERS: {
    type: "SET_ZONE_BORDERS",
    sheetId: "sheetId",
    target: target("A1"),
    border: { position: "top", style: "thin", color: "#000000" },
  },
  UPDATE_LOCALE: {
    type: "UPDATE_LOCALE",
    locale: DEFAULT_LOCALE,
  },
  GROUP_HEADERS: {
    type: "GROUP_HEADERS",
    sheetId: "sheetId",
    dimension: "ROW",
    start: 0,
    end: 1,
  },
  UNGROUP_HEADERS: {
    type: "UNGROUP_HEADERS",
    sheetId: "sheetId",
    dimension: "ROW",
    start: 0,
    end: 1,
  },
  UNFOLD_HEADER_GROUP: {
    type: "UNFOLD_HEADER_GROUP",
    sheetId: "sheetId",
    dimension: "ROW",
    start: 0,
    end: 1,
  },
  FOLD_HEADER_GROUP: {
    type: "FOLD_HEADER_GROUP",
    sheetId: "sheetId",
    dimension: "ROW",
    start: 0,
    end: 1,
  },
  UNFOLD_ALL_HEADER_GROUPS: {
    type: "UNFOLD_ALL_HEADER_GROUPS",
    sheetId: "sheetId",
    dimension: "ROW",
  },
  FOLD_ALL_HEADER_GROUPS: {
    type: "FOLD_ALL_HEADER_GROUPS",
    sheetId: "sheetId",
    dimension: "ROW",
  },
  UNFOLD_HEADER_GROUPS_IN_ZONE: {
    type: "UNFOLD_HEADER_GROUPS_IN_ZONE",
    sheetId: "sheetId",
    dimension: "ROW",
    zone: { top: 0, left: 0, bottom: 1, right: 1 },
  },
  FOLD_HEADER_GROUPS_IN_ZONE: {
    type: "FOLD_HEADER_GROUPS_IN_ZONE",
    sheetId: "sheetId",
    dimension: "ROW",
    zone: { top: 0, left: 0, bottom: 1, right: 1 },
  },
  ADD_DATA_VALIDATION_RULE: {
    type: "ADD_DATA_VALIDATION_RULE",
    sheetId: "sheetId",
    ranges: toRangesData("sheetId", "A1"),
    rule: {
      id: "dvId",
      criterion: {
        type: "textContains",
        values: ["1"],
      },
    },
  },
  REMOVE_DATA_VALIDATION_RULE: {
    type: "REMOVE_DATA_VALIDATION_RULE",
    sheetId: "sheetId",
    id: "dvId",
  },
  ADD_PIVOT: {
    type: "ADD_PIVOT",
    pivotId: "1",
    pivot: PIVOT,
  },
  INSERT_PIVOT: {
    type: "INSERT_PIVOT",
    pivotId: "1",
    sheetId: "sheetId",
    col: 0,
    row: 0,
    table: new SpreadsheetPivotTable([[]], [], [], {}).export(),
  },
  REMOVE_PIVOT: {
    type: "REMOVE_PIVOT",
    pivotId: "1",
  },
  UPDATE_PIVOT: {
    type: "UPDATE_PIVOT",
    pivotId: "1",
    pivot: PIVOT,
  },
  DUPLICATE_PIVOT: {
    type: "DUPLICATE_PIVOT",
    pivotId: "1",
    newPivotId: "2",
    duplicatedPivotName: "newName",
  },
  RENAME_PIVOT: {
    type: "RENAME_PIVOT",
    pivotId: "1",
    name: "newName",
  },
};

export const OT_TESTS_SINGLE_CELL_COMMANDS = [
  TEST_COMMANDS.UPDATE_CELL,
  TEST_COMMANDS.UPDATE_CELL_POSITION,
  TEST_COMMANDS.CLEAR_CELL,
  TEST_COMMANDS.SET_BORDER,
];

export const OT_TESTS_TARGET_DEPENDANT_COMMANDS = [
  TEST_COMMANDS.DELETE_CONTENT,
  TEST_COMMANDS.SET_FORMATTING,
  TEST_COMMANDS.CLEAR_FORMATTING,
  TEST_COMMANDS.REMOVE_TABLE,
  TEST_COMMANDS.CLEAR_CELLS,
];

export const OT_TESTS_ZONE_DEPENDANT_COMMANDS = [
  TEST_COMMANDS.UNFOLD_HEADER_GROUPS_IN_ZONE,
  TEST_COMMANDS.FOLD_HEADER_GROUPS_IN_ZONE,
  TEST_COMMANDS.UPDATE_TABLE,
];

export const OT_TESTS_HEADER_GROUP_COMMANDS = [
  TEST_COMMANDS.GROUP_HEADERS,
  TEST_COMMANDS.UNGROUP_HEADERS,
  TEST_COMMANDS.FOLD_HEADER_GROUP,
  TEST_COMMANDS.UNFOLD_HEADER_GROUP,
];

export const OT_TESTS_RANGE_DEPENDANT_COMMANDS = [
  TEST_COMMANDS.ADD_CONDITIONAL_FORMAT,
  TEST_COMMANDS.ADD_DATA_VALIDATION_RULE,
  TEST_COMMANDS.CREATE_TABLE,
];

export const EN_LOCALE = DEFAULT_LOCALE;

export const FR_LOCALE: Locale = {
  name: "France",
  code: "fr_FR",
  thousandsSeparator: " ",
  decimalSeparator: ",",
  weekStart: 1,
  dateFormat: "dd/mm/yyyy",
  timeFormat: "hh:mm:ss",
  formulaArgSeparator: ";",
};

export const CUSTOM_LOCALE: Locale = {
  name: "Custom locale",
  code: "cus_TOM",
  thousandsSeparator: " ",
  decimalSeparator: ",",
  weekStart: 6,
  dateFormat: "dd/mm/yyyy",
  timeFormat: "hh:mm:ss a",
  formulaArgSeparator: ";",
};

export const TABLE_STYLE_ALL_RED: TableStyle = {
  category: "dark",
  displayName: "AllRed",
  wholeTable: { style: { fillColor: "#FF0000" }, border: { top: DEFAULT_BORDER_DESC } },
  templateName: "dark",
  primaryColor: "#FF0000",
};
