import { BACKGROUND_CHART_COLOR } from "../../constants";
import { largeMax, largeMin, numberToLetters, zoneToXc } from "../../helpers/index";
import { _lt } from "../../translation";
import { CellValueType, SpreadsheetEnv, Style } from "../../types/index";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

function getColumnsNumber(env: SpreadsheetEnv): number {
  const activeCols = env.getters.getActiveCols();
  if (activeCols.size) {
    return activeCols.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    return zone.right - zone.left + 1;
  }
}

function getRowsNumber(env: SpreadsheetEnv): number {
  const activeRows = env.getters.getActiveRows();
  if (activeRows.size) {
    return activeRows.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    return zone.bottom - zone.top + 1;
  }
}

export function setFormatter(env: SpreadsheetEnv, format: string) {
  env.dispatch("SET_FORMATTING", {
    sheetId: env.getters.getActiveSheetId(),
    target: env.getters.getSelectedZones(),
    format,
  });
}

export function setStyle(env: SpreadsheetEnv, style: Style) {
  env.dispatch("SET_FORMATTING", {
    sheetId: env.getters.getActiveSheetId(),
    target: env.getters.getSelectedZones(),
    style,
  });
}

//------------------------------------------------------------------------------
// Simple actions
//------------------------------------------------------------------------------

export const UNDO_ACTION = (env: SpreadsheetEnv) => env.dispatch("REQUEST_UNDO");

export const REDO_ACTION = (env: SpreadsheetEnv) => env.dispatch("REQUEST_REDO");

export const COPY_ACTION = async (env: SpreadsheetEnv) => {
  env.dispatch("COPY", { target: env.getters.getSelectedZones() });
  await env.clipboard.writeText(env.getters.getClipboardContent());
};

export const CUT_ACTION = async (env: SpreadsheetEnv) => {
  env.dispatch("CUT", { target: env.getters.getSelectedZones() });
  await env.clipboard.writeText(env.getters.getClipboardContent());
};

export const PASTE_ACTION = async (env: SpreadsheetEnv) => {
  const spreadsheetClipboard = env.getters.getClipboardContent();
  let osClipboard;
  try {
    osClipboard = await env.clipboard.readText();
  } catch (e) {
    // Permission is required to read the clipboard.
    console.warn("The OS clipboard could not be read.");
    console.error(e);
  }
  const target = env.getters.getSelectedZones();
  if (osClipboard && osClipboard !== spreadsheetClipboard) {
    env.dispatch("PASTE_FROM_OS_CLIPBOARD", {
      target,
      text: osClipboard,
    });
  } else {
    env.dispatch("PASTE", { target, interactive: true });
  }
};

export const PASTE_VALUE_ACTION = (env: SpreadsheetEnv) =>
  env.dispatch("PASTE", { target: env.getters.getSelectedZones(), pasteOption: "onlyValue" });

export const PASTE_FORMAT_ACTION = (env: SpreadsheetEnv) =>
  env.dispatch("PASTE", { target: env.getters.getSelectedZones(), pasteOption: "onlyFormat" });

export const DELETE_CONTENT_ACTION = (env: SpreadsheetEnv) =>
  env.dispatch("DELETE_CONTENT", {
    sheetId: env.getters.getActiveSheetId(),
    target: env.getters.getSelectedZones(),
  });

export const SET_FORMULA_VISIBILITY_ACTION = (env: SpreadsheetEnv) =>
  env.dispatch("SET_FORMULA_VISIBILITY", { show: !env.getters.shouldShowFormulas() });

export const SET_GRID_LINES_VISIBILITY_ACTION = (env: SpreadsheetEnv) => {
  const sheetId = env.getters.getActiveSheetId();
  env.dispatch("SET_GRID_LINES_VISIBILITY", {
    sheetId,
    areGridLinesVisible: !env.getters.getGridLinesVisibility(sheetId),
  });
};

//------------------------------------------------------------------------------
// Grid manipulations
//------------------------------------------------------------------------------

export const DELETE_CONTENT_ROWS_NAME = (env: SpreadsheetEnv) => {
  let first: number;
  let last: number;
  const activesRows = env.getters.getActiveRows();
  if (activesRows.size !== 0) {
    first = largeMin([...activesRows]);
    last = largeMax([...activesRows]);
  } else {
    const zone = env.getters.getSelectedZones()[0];
    first = zone.top;
    last = zone.bottom;
  }
  if (first === last) {
    return _lt("Clear row %s", (first + 1).toString());
  }
  return _lt("Clear rows %s - %s", (first + 1).toString(), (last + 1).toString());
};

export const DELETE_CONTENT_ROWS_ACTION = (env: SpreadsheetEnv) => {
  const sheetId = env.getters.getActiveSheetId();
  const target = [...env.getters.getActiveRows()].map((index) =>
    env.getters.getRowsZone(sheetId, index, index)
  );
  env.dispatch("DELETE_CONTENT", {
    target,
    sheetId: env.getters.getActiveSheetId(),
  });
};

export const DELETE_CONTENT_COLUMNS_NAME = (env: SpreadsheetEnv) => {
  let first: number;
  let last: number;
  const activeCols = env.getters.getActiveCols();
  if (activeCols.size !== 0) {
    first = largeMin([...activeCols]);
    last = largeMax([...activeCols]);
  } else {
    const zone = env.getters.getSelectedZones()[0];
    first = zone.left;
    last = zone.right;
  }
  if (first === last) {
    return _lt("Clear column %s", numberToLetters(first));
  }
  return _lt("Clear columns %s - %s", numberToLetters(first), numberToLetters(last));
};

export const DELETE_CONTENT_COLUMNS_ACTION = (env: SpreadsheetEnv) => {
  const sheetId = env.getters.getActiveSheetId();
  const target = [...env.getters.getActiveCols()].map((index) =>
    env.getters.getColsZone(sheetId, index, index)
  );
  env.dispatch("DELETE_CONTENT", {
    target,
    sheetId: env.getters.getActiveSheetId(),
  });
};

export const REMOVE_ROWS_NAME = (env: SpreadsheetEnv) => {
  let first: number;
  let last: number;
  const activesRows = env.getters.getActiveRows();
  if (activesRows.size !== 0) {
    first = largeMin([...activesRows]);
    last = largeMax([...activesRows]);
  } else {
    const zone = env.getters.getSelectedZones()[0];
    first = zone.top;
    last = zone.bottom;
  }
  if (first === last) {
    return _lt("Delete row %s", (first + 1).toString());
  }
  return _lt("Delete rows %s - %s", (first + 1).toString(), (last + 1).toString());
};

export const REMOVE_ROWS_ACTION = (env: SpreadsheetEnv) => {
  let rows = [...env.getters.getActiveRows()];
  if (!rows.length) {
    const zone = env.getters.getSelectedZones()[0];
    for (let i = zone.top; i <= zone.bottom; i++) {
      rows.push(i);
    }
  }
  env.dispatch("REMOVE_COLUMNS_ROWS", {
    sheetId: env.getters.getActiveSheetId(),
    dimension: "ROW",
    elements: rows,
  });
};

export const REMOVE_COLUMNS_NAME = (env: SpreadsheetEnv) => {
  let first: number;
  let last: number;
  const activeCols = env.getters.getActiveCols();
  if (activeCols.size !== 0) {
    first = largeMin([...activeCols]);
    last = largeMax([...activeCols]);
  } else {
    const zone = env.getters.getSelectedZones()[0];
    first = zone.left;
    last = zone.right;
  }
  if (first === last) {
    return _lt("Delete column %s", numberToLetters(first));
  }
  return _lt("Delete columns %s - %s", numberToLetters(first), numberToLetters(last));
};

export const REMOVE_COLUMNS_ACTION = (env: SpreadsheetEnv) => {
  let columns = [...env.getters.getActiveCols()];
  if (!columns.length) {
    const zone = env.getters.getSelectedZones()[0];
    for (let i = zone.left; i <= zone.right; i++) {
      columns.push(i);
    }
  }
  env.dispatch("REMOVE_COLUMNS_ROWS", {
    sheetId: env.getters.getActiveSheetId(),
    dimension: "COL",
    elements: columns,
  });
};

export const INSERT_CELL_SHIFT_DOWN = (env: SpreadsheetEnv) => {
  const zone = env.getters.getSelectedZone();
  env.dispatch("INSERT_CELL", { shiftDimension: "ROW", zone, interactive: true });
};

export const INSERT_CELL_SHIFT_RIGHT = (env: SpreadsheetEnv) => {
  const zone = env.getters.getSelectedZone();
  env.dispatch("INSERT_CELL", { shiftDimension: "COL", zone, interactive: true });
};

export const DELETE_CELL_SHIFT_UP = (env: SpreadsheetEnv) => {
  const zone = env.getters.getSelectedZone();
  env.dispatch("DELETE_CELL", { shiftDimension: "ROW", zone, interactive: true });
};

export const DELETE_CELL_SHIFT_LEFT = (env: SpreadsheetEnv) => {
  const zone = env.getters.getSelectedZone();
  env.dispatch("DELETE_CELL", { shiftDimension: "COL", zone, interactive: true });
};

export const MENU_INSERT_ROWS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getRowsNumber(env);
  if (number === 1) {
    return _lt("Row above");
  }
  return _lt("%s Rows above", number.toString());
};

export const ROW_INSERT_ROWS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getRowsNumber(env);
  return number === 1 ? _lt("Insert row above") : _lt("Insert %s rows above", number.toString());
};

export const CELL_INSERT_ROWS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getRowsNumber(env);
  if (number === 1) {
    return _lt("Insert row");
  }
  return _lt("Insert %s rows", number.toString());
};

export const INSERT_ROWS_BEFORE_ACTION = (env: SpreadsheetEnv) => {
  const activeRows = env.getters.getActiveRows();
  let row: number;
  let quantity: number;
  if (activeRows.size) {
    row = largeMin([...activeRows]);
    quantity = activeRows.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    row = zone.top;
    quantity = zone.bottom - zone.top + 1;
  }
  env.dispatch("ADD_COLUMNS_ROWS", {
    sheetId: env.getters.getActiveSheetId(),
    position: "before",
    base: row,
    quantity,
    dimension: "ROW",
  });
};

export const MENU_INSERT_ROWS_AFTER_NAME = (env: SpreadsheetEnv) => {
  const number = getRowsNumber(env);
  if (number === 1) {
    return _lt("Row below");
  }
  return _lt("%s Rows below", number.toString());
};

export const ROW_INSERT_ROWS_AFTER_NAME = (env: SpreadsheetEnv) => {
  const number = getRowsNumber(env);
  return number === 1 ? _lt("Insert row below") : _lt("Insert %s rows below", number.toString());
};

export const INSERT_ROWS_AFTER_ACTION = (env: SpreadsheetEnv) => {
  const activeRows = env.getters.getActiveRows();
  let row: number;
  let quantity: number;
  if (activeRows.size) {
    row = largeMax([...activeRows]);
    quantity = activeRows.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    row = zone.bottom;
    quantity = zone.bottom - zone.top + 1;
  }
  env.dispatch("ADD_COLUMNS_ROWS", {
    sheetId: env.getters.getActiveSheetId(),
    position: "after",
    base: row,
    quantity,
    dimension: "ROW",
  });
};

export const MENU_INSERT_COLUMNS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getColumnsNumber(env);
  if (number === 1) {
    return _lt("Column left");
  }
  return _lt("%s Columns left", number.toString());
};

export const COLUMN_INSERT_COLUMNS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getColumnsNumber(env);
  return number === 1
    ? _lt("Insert column left")
    : _lt("Insert %s columns left", number.toString());
};

export const CELL_INSERT_COLUMNS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getColumnsNumber(env);
  if (number === 1) {
    return _lt("Insert column");
  }
  return _lt("Insert %s columns", number.toString());
};

export const INSERT_COLUMNS_BEFORE_ACTION = (env: SpreadsheetEnv) => {
  const activeCols = env.getters.getActiveCols();
  let column: number;
  let quantity: number;
  if (activeCols.size) {
    column = largeMin([...activeCols]);
    quantity = activeCols.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    column = zone.left;
    quantity = zone.right - zone.left + 1;
  }
  env.dispatch("ADD_COLUMNS_ROWS", {
    sheetId: env.getters.getActiveSheetId(),
    position: "before",
    dimension: "COL",
    base: column,
    quantity,
  });
};

export const MENU_INSERT_COLUMNS_AFTER_NAME = (env: SpreadsheetEnv) => {
  const number = getColumnsNumber(env);
  if (number === 1) {
    return _lt("Column right");
  }
  return _lt("%s Columns right", number.toString());
};

export const COLUMN_INSERT_COLUMNS_AFTER_NAME = (env: SpreadsheetEnv) => {
  const number = getColumnsNumber(env);
  return number === 1
    ? _lt("Insert column right")
    : _lt("Insert %s columns right", number.toString());
};

export const INSERT_COLUMNS_AFTER_ACTION = (env: SpreadsheetEnv) => {
  const activeCols = env.getters.getActiveCols();
  let column: number;
  let quantity: number;
  if (activeCols.size) {
    column = largeMax([...activeCols]);
    quantity = activeCols.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    column = zone.right;
    quantity = zone.right - zone.left + 1;
  }
  env.dispatch("ADD_COLUMNS_ROWS", {
    sheetId: env.getters.getActiveSheetId(),
    position: "after",
    dimension: "COL",
    base: column,
    quantity,
  });
};

export const HIDE_COLUMNS_NAME = (env: SpreadsheetEnv) => {
  const cols = env.getters.getElementsFromSelection("COL");
  let first = cols[0];
  let last = cols[cols.length - 1];
  if (cols.length === 1) {
    return _lt("Hide column %s", numberToLetters(first).toString());
  } else if (last - first + 1 === cols.length) {
    return _lt(
      "Hide columns %s - %s",
      numberToLetters(first).toString(),
      numberToLetters(last).toString()
    );
  } else {
    return _lt("Hide columns");
  }
};

export const HIDE_COLUMNS_ACTION = (env: SpreadsheetEnv) => {
  const columns = env.getters.getElementsFromSelection("COL");
  env.dispatch("HIDE_COLUMNS_ROWS", {
    sheetId: env.getters.getActiveSheetId(),
    dimension: "COL",
    elements: columns,
  });
};

export const UNHIDE_ALL_COLUMNS_ACTION = (env: SpreadsheetEnv) => {
  const sheet = env.getters.getActiveSheet();
  env.dispatch("UNHIDE_COLUMNS_ROWS", {
    sheetId: sheet.id,
    dimension: "COL",
    elements: Array.from(Array(sheet.cols.length).keys()),
  });
};

export const UNHIDE_COLUMNS_ACTION = (env: SpreadsheetEnv) => {
  const columns = env.getters.getElementsFromSelection("COL");
  env.dispatch("UNHIDE_COLUMNS_ROWS", {
    sheetId: env.getters.getActiveSheetId(),
    dimension: "COL",
    elements: columns,
  });
};

export const HIDE_ROWS_NAME = (env: SpreadsheetEnv) => {
  const rows = env.getters.getElementsFromSelection("ROW");
  let first = rows[0];
  let last = rows[rows.length - 1];
  if (rows.length === 1) {
    return _lt("Hide row %s", (first + 1).toString());
  } else if (last - first + 1 === rows.length) {
    return _lt("Hide rows %s - %s", (first + 1).toString(), (last + 1).toString());
  } else {
    return _lt("Hide rows");
  }
};

export const HIDE_ROWS_ACTION = (env: SpreadsheetEnv) => {
  const rows = env.getters.getElementsFromSelection("ROW");
  env.dispatch("HIDE_COLUMNS_ROWS", {
    sheetId: env.getters.getActiveSheetId(),
    dimension: "ROW",
    elements: rows,
  });
};

export const UNHIDE_ALL_ROWS_ACTION = (env: SpreadsheetEnv) => {
  const sheet = env.getters.getActiveSheet();
  env.dispatch("UNHIDE_COLUMNS_ROWS", {
    sheetId: sheet.id,
    dimension: "ROW",
    elements: Array.from(Array(sheet.rows.length).keys()),
  });
};

export const UNHIDE_ROWS_ACTION = (env: SpreadsheetEnv) => {
  const columns = env.getters.getElementsFromSelection("ROW");
  env.dispatch("UNHIDE_COLUMNS_ROWS", {
    sheetId: env.getters.getActiveSheetId(),
    dimension: "ROW",
    elements: columns,
  });
};

//------------------------------------------------------------------------------
// Sheets
//------------------------------------------------------------------------------

export const CREATE_SHEET_ACTION = (env: SpreadsheetEnv) => {
  const activeSheetId = env.getters.getActiveSheetId();
  const position =
    env.getters.getVisibleSheets().findIndex((sheetId) => sheetId === activeSheetId) + 1;
  const sheetId = env.uuidGenerator.uuidv4();
  env.dispatch("CREATE_SHEET", { sheetId, position });
  env.dispatch("ACTIVATE_SHEET", { sheetIdFrom: activeSheetId, sheetIdTo: sheetId });
};

//------------------------------------------------------------------------------
// Charts
//------------------------------------------------------------------------------

export const CREATE_CHART = (env: SpreadsheetEnv) => {
  const zone = env.getters.getSelectedZone();
  let dataSetZone = zone;
  const id = env.uuidGenerator.uuidv4();
  let labelRange: string | undefined;
  if (zone.left !== zone.right) {
    dataSetZone = { ...zone, left: zone.left + 1 };
  }
  const dataSets = [zoneToXc(dataSetZone)];
  const sheetId = env.getters.getActiveSheetId();
  const position = {
    x: env.getters.getCol(sheetId, zone.right + 1)?.start || 0,
    y: env.getters.getRow(sheetId, zone.top)?.start || 0,
  };
  let dataSetsHaveTitle = false;
  for (let x = dataSetZone.left; x <= dataSetZone.right; x++) {
    const cell = env.getters.getCell(sheetId, x, zone.top);
    if (cell && cell.evaluated.type !== CellValueType.number) {
      dataSetsHaveTitle = true;
      break;
    }
  }
  if (zone.left !== zone.right) {
    labelRange = zoneToXc({
      ...zone,
      right: zone.left,
      top: dataSetsHaveTitle ? zone.top + 1 : zone.top,
    });
  }
  env.dispatch("CREATE_CHART", {
    sheetId,
    id,
    position,
    definition: {
      title: "",
      dataSets,
      labelRange,
      type: "bar",
      stackedBar: false,
      dataSetsHaveTitle,
      background: BACKGROUND_CHART_COLOR,
      verticalAxisPosition: "left",
      legendPosition: "top",
    },
  });
  const figure = env.getters.getFigure(sheetId, id);
  env.openSidePanel("ChartPanel", { figure });
};

//------------------------------------------------------------------------------
// Style/Format
//------------------------------------------------------------------------------

export const FORMAT_GENERAL_ACTION = (env: SpreadsheetEnv) => setFormatter(env, "");

export const FORMAT_NUMBER_ACTION = (env: SpreadsheetEnv) => setFormatter(env, "#,##0.00");

export const FORMAT_PERCENT_ACTION = (env: SpreadsheetEnv) => setFormatter(env, "0.00%");

export const FORMAT_DATE_ACTION = (env: SpreadsheetEnv) => setFormatter(env, "m/d/yyyy");

export const FORMAT_TIME_ACTION = (env: SpreadsheetEnv) => setFormatter(env, "hh:mm:ss a");

export const FORMAT_DATE_TIME_ACTION = (env: SpreadsheetEnv) =>
  setFormatter(env, "m/d/yyyy hh:mm:ss");

export const FORMAT_DURATION_ACTION = (env: SpreadsheetEnv) => setFormatter(env, "hhhh:mm:ss");

export const FORMAT_BOLD_ACTION = (env: SpreadsheetEnv) =>
  setStyle(env, { bold: !env.getters.getCurrentStyle().bold });

export const FORMAT_ITALIC_ACTION = (env: SpreadsheetEnv) =>
  setStyle(env, { italic: !env.getters.getCurrentStyle().italic });

export const FORMAT_STRIKETHROUGH_ACTION = (env: SpreadsheetEnv) =>
  setStyle(env, { strikethrough: !env.getters.getCurrentStyle().strikethrough });

export const FORMAT_UNDERLINE_ACTION = (env: SpreadsheetEnv) =>
  setStyle(env, { underline: !env.getters.getCurrentStyle().underline });

//------------------------------------------------------------------------------
// Side panel
//------------------------------------------------------------------------------

export const OPEN_CF_SIDEPANEL_ACTION = (env: SpreadsheetEnv) => {
  env.openSidePanel("ConditionalFormatting", { selection: env.getters.getSelectedZones() });
};

export const OPEN_FAR_SIDEPANEL_ACTION = (env: SpreadsheetEnv) => {
  env.openSidePanel("FindAndReplace", {});
};

export const INSERT_LINK = (env: SpreadsheetEnv) => {
  env.openLinkEditor();
};

//------------------------------------------------------------------------------
// Sorting action
//------------------------------------------------------------------------------

export const SORT_CELLS_ASCENDING = (env: SpreadsheetEnv) => {
  const { anchor, zones } = env.getters.getSelection();
  env.dispatch("SORT_CELLS", {
    interactive: true,
    sheetId: env.getters.getActiveSheetId(),
    anchor: anchor,
    zone: zones[0],
    sortDirection: "ascending",
  });
};

export const SORT_CELLS_DESCENDING = (env: SpreadsheetEnv) => {
  const { anchor, zones } = env.getters.getSelection();
  env.dispatch("SORT_CELLS", {
    interactive: true,
    sheetId: env.getters.getActiveSheetId(),
    anchor: anchor,
    zone: zones[0],
    sortDirection: "descending",
  });
};

export const IS_ONLY_ONE_RANGE = (env: SpreadsheetEnv): boolean => {
  return env.getters.getSelectedZones().length === 1;
};
