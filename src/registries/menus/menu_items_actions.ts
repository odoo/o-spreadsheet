import { Style, SpreadsheetEnv } from "../../types/index";
import { numberToLetters, uuidv4 } from "../../helpers/index";
import { _lt } from "../../translation";

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

export const UNDO_ACTION = (env: SpreadsheetEnv) => env.dispatch("UNDO");

export const REDO_ACTION = (env: SpreadsheetEnv) => env.dispatch("REDO");

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
  env.dispatch("PASTE", { target: env.getters.getSelectedZones(), onlyValue: true });

export const PASTE_FORMAT_ACTION = (env: SpreadsheetEnv) =>
  env.dispatch("PASTE", { target: env.getters.getSelectedZones(), onlyFormat: true });

export const DELETE_CONTENT_ACTION = (env: SpreadsheetEnv) =>
  env.dispatch("DELETE_CONTENT", {
    sheetId: env.getters.getActiveSheetId(),
    target: env.getters.getSelectedZones(),
  });

export const SET_FORMULA_VISIBILITY_ACTION = (env: SpreadsheetEnv) =>
  env.dispatch("SET_FORMULA_VISIBILITY", { show: !env.getters.shouldShowFormulas() });

//------------------------------------------------------------------------------
// Grid manipulations
//------------------------------------------------------------------------------

export const DELETE_CONTENT_ROWS_NAME = (env: SpreadsheetEnv) => {
  let first: number;
  let last: number;
  const activesRows = env.getters.getActiveRows();
  if (activesRows.size !== 0) {
    first = Math.min(...activesRows);
    last = Math.max(...activesRows);
  } else {
    const zone = env.getters.getSelectedZones()[0];
    first = zone.top;
    last = zone.bottom;
  }
  if (first === last) {
    return _lt(`Clear row ${first + 1}`);
  }
  return _lt(`Clear rows ${first + 1} - ${last + 1}`);
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
    first = Math.min(...activeCols);
    last = Math.max(...activeCols);
  } else {
    const zone = env.getters.getSelectedZones()[0];
    first = zone.left;
    last = zone.right;
  }
  if (first === last) {
    return _lt(`Clear column ${numberToLetters(first)}`);
  }
  return _lt(`Clear columns ${numberToLetters(first)} - ${numberToLetters(last)}`);
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
    first = Math.min(...activesRows);
    last = Math.max(...activesRows);
  } else {
    const zone = env.getters.getSelectedZones()[0];
    first = zone.top;
    last = zone.bottom;
  }
  if (first === last) {
    return _lt(`Delete row ${first + 1}`);
  }
  return _lt(`Delete rows ${first + 1} - ${last + 1}`);
};

export const REMOVE_ROWS_ACTION = (env: SpreadsheetEnv) => {
  let rows = [...env.getters.getActiveRows()];
  if (!rows.length) {
    const zone = env.getters.getSelectedZones()[0];
    for (let i = zone.top; i <= zone.bottom; i++) {
      rows.push(i);
    }
  }
  env.dispatch("REMOVE_ROWS", {
    sheetId: env.getters.getActiveSheetId(),
    rows,
  });
};

export const REMOVE_COLUMNS_NAME = (env: SpreadsheetEnv) => {
  let first: number;
  let last: number;
  const activeCols = env.getters.getActiveCols();
  if (activeCols.size !== 0) {
    first = Math.min(...activeCols);
    last = Math.max(...activeCols);
  } else {
    const zone = env.getters.getSelectedZones()[0];
    first = zone.left;
    last = zone.right;
  }
  if (first === last) {
    return _lt(`Delete column ${numberToLetters(first)}`);
  }
  return _lt(`Delete columns ${numberToLetters(first)} - ${numberToLetters(last)}`);
};

export const REMOVE_COLUMNS_ACTION = (env: SpreadsheetEnv) => {
  let columns = [...env.getters.getActiveCols()];
  if (!columns.length) {
    const zone = env.getters.getSelectedZones()[0];
    for (let i = zone.left; i <= zone.right; i++) {
      columns.push(i);
    }
  }
  env.dispatch("REMOVE_COLUMNS", {
    sheetId: env.getters.getActiveSheetId(),
    columns,
  });
};

export const MENU_INSERT_ROWS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getRowsNumber(env);
  if (number === 1) {
    return _lt("Row above");
  }
  return _lt(`${number} Rows above`);
};

export const ROW_INSERT_ROWS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getRowsNumber(env);
  return number === 1 ? _lt("Insert row above") : _lt(`Insert ${number} rows above`);
};

export const CELL_INSERT_ROWS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getRowsNumber(env);
  if (number === 1) {
    return _lt("Insert row");
  }
  return _lt(`Insert ${number} rows`);
};

export const INSERT_ROWS_BEFORE_ACTION = (env: SpreadsheetEnv) => {
  const activeRows = env.getters.getActiveRows();
  let row: number;
  let quantity: number;
  if (activeRows.size) {
    row = Math.min(...activeRows);
    quantity = activeRows.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    row = zone.top;
    quantity = zone.bottom - zone.top + 1;
  }
  env.dispatch("ADD_ROWS", {
    sheetId: env.getters.getActiveSheetId(),
    position: "before",
    row,
    quantity,
  });
};

export const MENU_INSERT_ROWS_AFTER_NAME = (env: SpreadsheetEnv) => {
  const number = getRowsNumber(env);
  if (number === 1) {
    return _lt("Row below");
  }
  return _lt(`${number} Rows below`);
};

export const ROW_INSERT_ROWS_AFTER_NAME = (env: SpreadsheetEnv) => {
  const number = getRowsNumber(env);
  return number === 1 ? _lt("Insert row below") : _lt(`Insert ${number} rows below`);
};

export const INSERT_ROWS_AFTER_ACTION = (env: SpreadsheetEnv) => {
  const activeRows = env.getters.getActiveRows();
  let row: number;
  let quantity: number;
  if (activeRows.size) {
    row = Math.max(...activeRows);
    quantity = activeRows.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    row = zone.bottom;
    quantity = zone.bottom - zone.top + 1;
  }
  env.dispatch("ADD_ROWS", {
    sheetId: env.getters.getActiveSheetId(),
    position: "after",
    row,
    quantity,
  });
};

export const MENU_INSERT_COLUMNS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getColumnsNumber(env);
  if (number === 1) {
    return _lt("Column left");
  }
  return _lt(`${number} Columns left`);
};

export const COLUMN_INSERT_COLUMNS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getColumnsNumber(env);
  return number === 1 ? _lt("Insert column left") : _lt(`Insert ${number} columns left`);
};

export const CELL_INSERT_COLUMNS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getColumnsNumber(env);
  if (number === 1) {
    return _lt("Insert column");
  }
  return _lt(`Insert ${number} columns`);
};

export const INSERT_COLUMNS_BEFORE_ACTION = (env: SpreadsheetEnv) => {
  const activeCols = env.getters.getActiveCols();
  let column: number;
  let quantity: number;
  if (activeCols.size) {
    column = Math.min(...activeCols);
    quantity = activeCols.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    column = zone.left;
    quantity = zone.right - zone.left + 1;
  }
  env.dispatch("ADD_COLUMNS", {
    sheetId: env.getters.getActiveSheetId(),
    position: "before",
    column,
    quantity,
  });
};

export const MENU_INSERT_COLUMNS_AFTER_NAME = (env: SpreadsheetEnv) => {
  const number = getColumnsNumber(env);
  if (number === 1) {
    return _lt("Column right");
  }
  return _lt(`${number} Columns right`);
};

export const COLUMN_INSERT_COLUMNS_AFTER_NAME = (env: SpreadsheetEnv) => {
  const number = getColumnsNumber(env);
  return number === 1 ? _lt("Insert column right") : _lt(`Insert ${number} columns right`);
};

export const INSERT_COLUMNS_AFTER_ACTION = (env: SpreadsheetEnv) => {
  const activeCols = env.getters.getActiveCols();
  let column: number;
  let quantity: number;
  if (activeCols.size) {
    column = Math.max(...activeCols);
    quantity = activeCols.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    column = zone.right;
    quantity = zone.right - zone.left + 1;
  }
  env.dispatch("ADD_COLUMNS", {
    sheetId: env.getters.getActiveSheetId(),
    position: "after",
    column,
    quantity,
  });
};

//------------------------------------------------------------------------------
// Sheets
//------------------------------------------------------------------------------

export const CREATE_SHEET_ACTION = (env: SpreadsheetEnv) => {
  const activeSheetId = env.getters.getActiveSheetId();
  const position =
    env.getters.getVisibleSheets().findIndex((sheetId) => sheetId === activeSheetId) + 1;
  const sheetId = uuidv4();
  env.dispatch("CREATE_SHEET", { sheetId, position });
  env.dispatch("ACTIVATE_SHEET", { sheetIdFrom: activeSheetId, sheetIdTo: sheetId });
};

//------------------------------------------------------------------------------
// Charts
//------------------------------------------------------------------------------

export const CREATE_CHART = (env: SpreadsheetEnv) => {
  env.openSidePanel("ChartPanel");
};

//------------------------------------------------------------------------------
// Style/Format
//------------------------------------------------------------------------------

export const FORMAT_AUTO_ACTION = (env: SpreadsheetEnv) => setFormatter(env, "");

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

//------------------------------------------------------------------------------
// Side panel
//------------------------------------------------------------------------------

export const OPEN_CF_SIDEPANEL_ACTION = (env: SpreadsheetEnv) => {
  env.openSidePanel("ConditionalFormatting", { selection: env.getters.getSelectedZones() });
};

export const OPEN_FAR_SIDEPANEL_ACTION = (env: SpreadsheetEnv) => {
  env.openSidePanel("FindAndReplace", {});
};

export const OPEN_COLLABORATIVE_DEBUG_ACTION = (env: SpreadsheetEnv) => {
  env.openSidePanel("CollaborativeDebug", {});
};
