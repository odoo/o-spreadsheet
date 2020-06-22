import { SpreadsheetEnv } from "../../types/env";
import { Style } from "../../types/misc";
import { numberToLetters } from "../../helpers/coordinates";
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

export function setFormatter(env: SpreadsheetEnv, formatter: string) {
  env.dispatch("SET_FORMATTER", {
    sheet: env.getters.getActiveSheet(),
    target: env.getters.getSelectedZones(),
    formatter,
  });
}

export function setStyle(env: SpreadsheetEnv, style: Style) {
  env.dispatch("SET_FORMATTING", {
    sheet: env.getters.getActiveSheet(),
    target: env.getters.getSelectedZones(),
    style,
  });
}

//------------------------------------------------------------------------------
// Simple actions
//------------------------------------------------------------------------------

export const UNDO_ACTION = (env: SpreadsheetEnv) => env.dispatch("UNDO");

export const REDO_ACTION = (env: SpreadsheetEnv) => env.dispatch("REDO");

export const COPY_ACTION = (env: SpreadsheetEnv) =>
  env.dispatch("COPY", { target: env.getters.getSelectedZones() });

export const CUT_ACTION = (env: SpreadsheetEnv) =>
  env.dispatch("CUT", { target: env.getters.getSelectedZones() });

export const PASTE_ACTION = (env: SpreadsheetEnv) =>
  env.dispatch("PASTE", { target: env.getters.getSelectedZones(), interactive: true });

export const PASTE_FORMAT_ACTION = (env: SpreadsheetEnv) =>
  env.dispatch("PASTE", { target: env.getters.getSelectedZones(), onlyFormat: true });

export const DELETE_CONTENT_ACTION = (env: SpreadsheetEnv) =>
  env.dispatch("DELETE_CONTENT", {
    sheet: env.getters.getActiveSheet(),
    target: env.getters.getSelectedZones(),
  });

//------------------------------------------------------------------------------
// Grid manipulations
//------------------------------------------------------------------------------

export const DELETE_CONTENT_ROWS_NAME = (env: SpreadsheetEnv) => {
  let first = 0;
  let last = 0;
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
  const target = [...env.getters.getActiveRows()].map((index) =>
    env.getters.getRowsZone(index, index)
  );
  env.dispatch("DELETE_CONTENT", {
    target,
    sheet: env.getters.getActiveSheet(),
  });
};

export const DELETE_CONTENT_COLUMNS_NAME = (env: SpreadsheetEnv) => {
  let first = 0;
  let last = 0;
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
  const target = [...env.getters.getActiveCols()].map((index) =>
    env.getters.getColsZone(index, index)
  );
  env.dispatch("DELETE_CONTENT", {
    target,
    sheet: env.getters.getActiveSheet(),
  });
};

export const REMOVE_ROWS_NAME = (env: SpreadsheetEnv) => {
  let first = 0;
  let last = 0;
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
    sheet: env.getters.getActiveSheet(),
    rows,
  });
};

export const REMOVE_COLUMNS_NAME = (env: SpreadsheetEnv) => {
  let first = 0;
  let last = 0;
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
    sheet: env.getters.getActiveSheet(),
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

export const CELL_INSERT_ROWS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getRowsNumber(env);
  if (number === 1) {
    return _lt("Insert row");
  }
  return _lt(`Insert ${number} rows`);
};

export const INSERT_ROWS_BEFORE_ACTION = (env: SpreadsheetEnv) => {
  const activeRows = env.getters.getActiveRows();
  let row = 0;
  let quantity = 0;
  if (activeRows.size) {
    row = Math.min(...activeRows);
    quantity = activeRows.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    row = zone.top;
    quantity = zone.bottom - zone.top + 1;
  }
  env.dispatch("ADD_ROWS", {
    sheet: env.getters.getActiveSheet(),
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

export const INSERT_ROWS_AFTER_ACTION = (env: SpreadsheetEnv) => {
  const activeRows = env.getters.getActiveRows();
  let row = 0;
  let quantity = 0;
  if (activeRows.size) {
    row = Math.max(...activeRows);
    quantity = activeRows.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    row = zone.bottom;
    quantity = zone.bottom - zone.top + 1;
  }
  env.dispatch("ADD_ROWS", {
    sheet: env.getters.getActiveSheet(),
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

export const CELL_INSERT_COLUMNS_BEFORE_NAME = (env: SpreadsheetEnv) => {
  const number = getColumnsNumber(env);
  if (number === 1) {
    return _lt("Insert column");
  }
  return _lt(`Insert ${number} columns`);
};

export const INSERT_COLUMNS_BEFORE_ACTION = (env: SpreadsheetEnv) => {
  const activeCols = env.getters.getActiveCols();
  let column = 0;
  let quantity = 0;
  if (activeCols.size) {
    column = Math.min(...activeCols);
    quantity = activeCols.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    column = zone.left;
    quantity = zone.right - zone.left + 1;
  }
  env.dispatch("ADD_COLUMNS", {
    sheet: env.getters.getActiveSheet(),
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

export const INSERT_COLUMNS_AFTER_ACTION = (env: SpreadsheetEnv) => {
  const activeCols = env.getters.getActiveCols();
  let column = 0;
  let quantity = 0;
  if (activeCols.size) {
    column = Math.max(...activeCols);
    quantity = activeCols.size;
  } else {
    const zone = env.getters.getSelectedZones()[0];
    column = zone.right;
    quantity = zone.right - zone.left + 1;
  }
  env.dispatch("ADD_COLUMNS", {
    sheet: env.getters.getActiveSheet(),
    position: "after",
    column,
    quantity,
  });
};

//------------------------------------------------------------------------------
// Sheets
//------------------------------------------------------------------------------

export const CREATE_SHEET_ACTION = (env: SpreadsheetEnv) => {
  env.dispatch("CREATE_SHEET", { activate: true });
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
