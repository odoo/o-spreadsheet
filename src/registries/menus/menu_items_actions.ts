import { DEFAULT_FIGURE_HEIGHT, DEFAULT_FIGURE_WIDTH } from "../../constants";
import {
  areZonesContinuous,
  largeMax,
  largeMin,
  numberToLetters,
  zoneToXc,
} from "../../helpers/index";
import { interactiveSortSelection } from "../../helpers/sort";
import { interactiveCut } from "../../helpers/ui/cut_interactive";
import { interactiveAddFilter } from "../../helpers/ui/filter_interactive";
import {
  handlePasteResult,
  interactivePaste,
  interactivePasteFromOS,
} from "../../helpers/ui/paste_interactive";
import { _lt } from "../../translation";
import { CellValueType, Dimension, Format, SpreadsheetChildEnv, Style } from "../../types/index";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

function getColumnsNumber(env: SpreadsheetChildEnv): number {
  const activeCols = env.model.getters.getActiveCols();
  if (activeCols.size) {
    return activeCols.size;
  } else {
    const zone = env.model.getters.getSelectedZones()[0];
    return zone.right - zone.left + 1;
  }
}

function getRowsNumber(env: SpreadsheetChildEnv): number {
  const activeRows = env.model.getters.getActiveRows();
  if (activeRows.size) {
    return activeRows.size;
  } else {
    const zone = env.model.getters.getSelectedZones()[0];
    return zone.bottom - zone.top + 1;
  }
}

export function setFormatter(env: SpreadsheetChildEnv, format: Format) {
  env.model.dispatch("SET_FORMATTING", {
    sheetId: env.model.getters.getActiveSheetId(),
    target: env.model.getters.getSelectedZones(),
    format,
  });
}

export function setStyle(env: SpreadsheetChildEnv, style: Style) {
  env.model.dispatch("SET_FORMATTING", {
    sheetId: env.model.getters.getActiveSheetId(),
    target: env.model.getters.getSelectedZones(),
    style,
  });
}

async function readOsClipboard(env: SpreadsheetChildEnv): Promise<string | undefined> {
  try {
    return await env.clipboard.readText();
  } catch (e) {
    // Permission is required to read the clipboard.
    console.warn("The OS clipboard could not be read.");
    console.error(e);
    return undefined;
  }
}

//------------------------------------------------------------------------------
// Simple actions
//------------------------------------------------------------------------------

export const UNDO_ACTION = (env: SpreadsheetChildEnv) => env.model.dispatch("REQUEST_UNDO");

export const REDO_ACTION = (env: SpreadsheetChildEnv) => env.model.dispatch("REQUEST_REDO");

export const COPY_ACTION = async (env: SpreadsheetChildEnv) => {
  env.model.dispatch("COPY");
  await env.clipboard.writeText(env.model.getters.getClipboardContent());
};

export const CUT_ACTION = async (env: SpreadsheetChildEnv) => {
  interactiveCut(env);
  await env.clipboard.writeText(env.model.getters.getClipboardContent());
};

export const PASTE_ACTION = async (env: SpreadsheetChildEnv) => {
  const spreadsheetClipboard = env.model.getters.getClipboardContent();
  const osClipboard = await readOsClipboard(env);
  const target = env.model.getters.getSelectedZones();
  if (osClipboard && osClipboard !== spreadsheetClipboard) {
    interactivePasteFromOS(env, target, osClipboard);
  } else {
    interactivePaste(env, target);
  }
};

export const PASTE_VALUE_ACTION = async (env: SpreadsheetChildEnv) => {
  const spreadsheetClipboard = env.model.getters.getClipboardContent();
  const osClipboard = await readOsClipboard(env);
  const target = env.model.getters.getSelectedZones();
  if (osClipboard && osClipboard !== spreadsheetClipboard) {
    env.model.dispatch("PASTE_FROM_OS_CLIPBOARD", {
      target,
      text: osClipboard,
    });
  } else {
    env.model.dispatch("PASTE", {
      target: env.model.getters.getSelectedZones(),
      pasteOption: "onlyValue",
    });
  }
};

export const PASTE_FORMAT_ACTION = (env: SpreadsheetChildEnv) =>
  interactivePaste(env, env.model.getters.getSelectedZones(), "onlyFormat");

export const DELETE_CONTENT_ACTION = (env: SpreadsheetChildEnv) =>
  env.model.dispatch("DELETE_CONTENT", {
    sheetId: env.model.getters.getActiveSheetId(),
    target: env.model.getters.getSelectedZones(),
  });

export const SET_FORMULA_VISIBILITY_ACTION = (env: SpreadsheetChildEnv) =>
  env.model.dispatch("SET_FORMULA_VISIBILITY", { show: !env.model.getters.shouldShowFormulas() });

export const SET_GRID_LINES_VISIBILITY_ACTION = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  env.model.dispatch("SET_GRID_LINES_VISIBILITY", {
    sheetId,
    areGridLinesVisible: !env.model.getters.getGridLinesVisibility(sheetId),
  });
};

export const IS_NOT_CUT_OPERATION = (env: SpreadsheetChildEnv): boolean => {
  return !env.model.getters.isCutOperation();
};

//------------------------------------------------------------------------------
// Grid manipulations
//------------------------------------------------------------------------------

export const DELETE_CONTENT_ROWS_NAME = (env: SpreadsheetChildEnv) => {
  if (env.model.getters.getSelectedZones().length > 1) {
    return _lt("Clear rows");
  }
  let first: number;
  let last: number;
  const activesRows = env.model.getters.getActiveRows();
  if (activesRows.size !== 0) {
    first = largeMin([...activesRows]);
    last = largeMax([...activesRows]);
  } else {
    const zone = env.model.getters.getSelectedZones()[0];
    first = zone.top;
    last = zone.bottom;
  }
  if (first === last) {
    return _lt("Clear row %s", (first + 1).toString());
  }
  return _lt("Clear rows %s - %s", (first + 1).toString(), (last + 1).toString());
};

export const DELETE_CONTENT_ROWS_ACTION = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  const target = [...env.model.getters.getActiveRows()].map((index) =>
    env.model.getters.getRowsZone(sheetId, index, index)
  );
  env.model.dispatch("DELETE_CONTENT", {
    target,
    sheetId: env.model.getters.getActiveSheetId(),
  });
};

export const DELETE_CONTENT_COLUMNS_NAME = (env: SpreadsheetChildEnv) => {
  if (env.model.getters.getSelectedZones().length > 1) {
    return _lt("Clear columns");
  }
  let first: number;
  let last: number;
  const activeCols = env.model.getters.getActiveCols();
  if (activeCols.size !== 0) {
    first = largeMin([...activeCols]);
    last = largeMax([...activeCols]);
  } else {
    const zone = env.model.getters.getSelectedZones()[0];
    first = zone.left;
    last = zone.right;
  }
  if (first === last) {
    return _lt("Clear column %s", numberToLetters(first));
  }
  return _lt("Clear columns %s - %s", numberToLetters(first), numberToLetters(last));
};

export const DELETE_CONTENT_COLUMNS_ACTION = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  const target = [...env.model.getters.getActiveCols()].map((index) =>
    env.model.getters.getColsZone(sheetId, index, index)
  );
  env.model.dispatch("DELETE_CONTENT", {
    target,
    sheetId: env.model.getters.getActiveSheetId(),
  });
};

export const REMOVE_ROWS_NAME = (env: SpreadsheetChildEnv) => {
  if (env.model.getters.getSelectedZones().length > 1) {
    return _lt("Delete rows");
  }
  let first: number;
  let last: number;
  const activesRows = env.model.getters.getActiveRows();
  if (activesRows.size !== 0) {
    first = largeMin([...activesRows]);
    last = largeMax([...activesRows]);
  } else {
    const zone = env.model.getters.getSelectedZones()[0];
    first = zone.top;
    last = zone.bottom;
  }
  if (first === last) {
    return _lt("Delete row %s", (first + 1).toString());
  }
  return _lt("Delete rows %s - %s", (first + 1).toString(), (last + 1).toString());
};

export const REMOVE_ROWS_ACTION = (env: SpreadsheetChildEnv) => {
  let rows = [...env.model.getters.getActiveRows()];
  if (!rows.length) {
    const zone = env.model.getters.getSelectedZones()[0];
    for (let i = zone.top; i <= zone.bottom; i++) {
      rows.push(i);
    }
  }
  env.model.dispatch("REMOVE_COLUMNS_ROWS", {
    sheetId: env.model.getters.getActiveSheetId(),
    dimension: "ROW",
    elements: rows,
  });
};

export const CAN_REMOVE_COLUMNS_ROWS = (
  dimension: Dimension,
  env: SpreadsheetChildEnv
): boolean => {
  const sheetId = env.model.getters.getActiveSheetId();
  const selectedElements = env.model.getters.getElementsFromSelection(dimension);

  const includesAllVisibleHeaders = env.model.getters.checkElementsIncludeAllVisibleHeaders(
    sheetId,
    dimension,
    selectedElements
  );
  const includesAllNonFrozenHeaders = env.model.getters.checkElementsIncludeAllNonFrozenHeaders(
    sheetId,
    dimension,
    selectedElements
  );

  return !includesAllVisibleHeaders && !includesAllNonFrozenHeaders;
};

export const REMOVE_COLUMNS_NAME = (env: SpreadsheetChildEnv) => {
  if (env.model.getters.getSelectedZones().length > 1) {
    return _lt("Delete columns");
  }
  let first: number;
  let last: number;
  const activeCols = env.model.getters.getActiveCols();
  if (activeCols.size !== 0) {
    first = largeMin([...activeCols]);
    last = largeMax([...activeCols]);
  } else {
    const zone = env.model.getters.getSelectedZones()[0];
    first = zone.left;
    last = zone.right;
  }
  if (first === last) {
    return _lt("Delete column %s", numberToLetters(first));
  }
  return _lt("Delete columns %s - %s", numberToLetters(first), numberToLetters(last));
};

export const REMOVE_COLUMNS_ACTION = (env: SpreadsheetChildEnv) => {
  let columns = [...env.model.getters.getActiveCols()];
  if (!columns.length) {
    const zone = env.model.getters.getSelectedZones()[0];
    for (let i = zone.left; i <= zone.right; i++) {
      columns.push(i);
    }
  }
  env.model.dispatch("REMOVE_COLUMNS_ROWS", {
    sheetId: env.model.getters.getActiveSheetId(),
    dimension: "COL",
    elements: columns,
  });
};

export const INSERT_CELL_SHIFT_DOWN = (env: SpreadsheetChildEnv) => {
  const zone = env.model.getters.getSelectedZone();
  const result = env.model.dispatch("INSERT_CELL", { zone, shiftDimension: "ROW" });
  handlePasteResult(env, result);
};

export const INSERT_CELL_SHIFT_RIGHT = (env: SpreadsheetChildEnv) => {
  const zone = env.model.getters.getSelectedZone();
  const result = env.model.dispatch("INSERT_CELL", { zone, shiftDimension: "COL" });
  handlePasteResult(env, result);
};

export const DELETE_CELL_SHIFT_UP = (env: SpreadsheetChildEnv) => {
  const zone = env.model.getters.getSelectedZone();
  const result = env.model.dispatch("DELETE_CELL", { zone, shiftDimension: "ROW" });
  handlePasteResult(env, result);
};

export const DELETE_CELL_SHIFT_LEFT = (env: SpreadsheetChildEnv) => {
  const zone = env.model.getters.getSelectedZone();
  const result = env.model.dispatch("DELETE_CELL", { zone, shiftDimension: "COL" });
  handlePasteResult(env, result);
};

export const MENU_INSERT_ROWS_BEFORE_NAME = (env: SpreadsheetChildEnv) => {
  const number = getRowsNumber(env);
  if (number === 1) {
    return _lt("Row above");
  }
  return _lt("%s Rows above", number.toString());
};

export const ROW_INSERT_ROWS_BEFORE_NAME = (env: SpreadsheetChildEnv) => {
  const number = getRowsNumber(env);
  return number === 1 ? _lt("Insert row above") : _lt("Insert %s rows above", number.toString());
};

export const CELL_INSERT_ROWS_BEFORE_NAME = (env: SpreadsheetChildEnv) => {
  const number = getRowsNumber(env);
  if (number === 1) {
    return _lt("Insert row");
  }
  return _lt("Insert %s rows", number.toString());
};

export const INSERT_ROWS_BEFORE_ACTION = (env: SpreadsheetChildEnv) => {
  const activeRows = env.model.getters.getActiveRows();
  let row: number;
  let quantity: number;
  if (activeRows.size) {
    row = largeMin([...activeRows]);
    quantity = activeRows.size;
  } else {
    const zone = env.model.getters.getSelectedZones()[0];
    row = zone.top;
    quantity = zone.bottom - zone.top + 1;
  }
  env.model.dispatch("ADD_COLUMNS_ROWS", {
    sheetId: env.model.getters.getActiveSheetId(),
    position: "before",
    base: row,
    quantity,
    dimension: "ROW",
  });
};

export const MENU_INSERT_ROWS_AFTER_NAME = (env: SpreadsheetChildEnv) => {
  const number = getRowsNumber(env);
  if (number === 1) {
    return _lt("Row below");
  }
  return _lt("%s Rows below", number.toString());
};

export const ROW_INSERT_ROWS_AFTER_NAME = (env: SpreadsheetChildEnv) => {
  const number = getRowsNumber(env);
  return number === 1 ? _lt("Insert row below") : _lt("Insert %s rows below", number.toString());
};

export const INSERT_ROWS_AFTER_ACTION = (env: SpreadsheetChildEnv) => {
  const activeRows = env.model.getters.getActiveRows();
  let row: number;
  let quantity: number;
  if (activeRows.size) {
    row = largeMax([...activeRows]);
    quantity = activeRows.size;
  } else {
    const zone = env.model.getters.getSelectedZones()[0];
    row = zone.bottom;
    quantity = zone.bottom - zone.top + 1;
  }
  env.model.dispatch("ADD_COLUMNS_ROWS", {
    sheetId: env.model.getters.getActiveSheetId(),
    position: "after",
    base: row,
    quantity,
    dimension: "ROW",
  });
};

export const MENU_INSERT_COLUMNS_BEFORE_NAME = (env: SpreadsheetChildEnv) => {
  const number = getColumnsNumber(env);
  if (number === 1) {
    return _lt("Column left");
  }
  return _lt("%s Columns left", number.toString());
};

export const COLUMN_INSERT_COLUMNS_BEFORE_NAME = (env: SpreadsheetChildEnv) => {
  const number = getColumnsNumber(env);
  return number === 1
    ? _lt("Insert column left")
    : _lt("Insert %s columns left", number.toString());
};

export const CELL_INSERT_COLUMNS_BEFORE_NAME = (env: SpreadsheetChildEnv) => {
  const number = getColumnsNumber(env);
  if (number === 1) {
    return _lt("Insert column");
  }
  return _lt("Insert %s columns", number.toString());
};

export const INSERT_COLUMNS_BEFORE_ACTION = (env: SpreadsheetChildEnv) => {
  const activeCols = env.model.getters.getActiveCols();
  let column: number;
  let quantity: number;
  if (activeCols.size) {
    column = largeMin([...activeCols]);
    quantity = activeCols.size;
  } else {
    const zone = env.model.getters.getSelectedZones()[0];
    column = zone.left;
    quantity = zone.right - zone.left + 1;
  }
  env.model.dispatch("ADD_COLUMNS_ROWS", {
    sheetId: env.model.getters.getActiveSheetId(),
    position: "before",
    dimension: "COL",
    base: column,
    quantity,
  });
};

export const MENU_INSERT_COLUMNS_AFTER_NAME = (env: SpreadsheetChildEnv) => {
  const number = getColumnsNumber(env);
  if (number === 1) {
    return _lt("Column right");
  }
  return _lt("%s Columns right", number.toString());
};

export const COLUMN_INSERT_COLUMNS_AFTER_NAME = (env: SpreadsheetChildEnv) => {
  const number = getColumnsNumber(env);
  return number === 1
    ? _lt("Insert column right")
    : _lt("Insert %s columns right", number.toString());
};

export const INSERT_COLUMNS_AFTER_ACTION = (env: SpreadsheetChildEnv) => {
  const activeCols = env.model.getters.getActiveCols();
  let column: number;
  let quantity: number;
  if (activeCols.size) {
    column = largeMax([...activeCols]);
    quantity = activeCols.size;
  } else {
    const zone = env.model.getters.getSelectedZones()[0];
    column = zone.right;
    quantity = zone.right - zone.left + 1;
  }
  env.model.dispatch("ADD_COLUMNS_ROWS", {
    sheetId: env.model.getters.getActiveSheetId(),
    position: "after",
    dimension: "COL",
    base: column,
    quantity,
  });
};

export const HIDE_COLUMNS_NAME = (env: SpreadsheetChildEnv) => {
  const cols = env.model.getters.getElementsFromSelection("COL");
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

export const HIDE_COLUMNS_ACTION = (env: SpreadsheetChildEnv) => {
  const columns = env.model.getters.getElementsFromSelection("COL");
  env.model.dispatch("HIDE_COLUMNS_ROWS", {
    sheetId: env.model.getters.getActiveSheetId(),
    dimension: "COL",
    elements: columns,
  });
};

export const UNHIDE_ALL_COLUMNS_ACTION = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
    sheetId,
    dimension: "COL",
    elements: Array.from(Array(env.model.getters.getNumberCols(sheetId)).keys()),
  });
};

export const UNHIDE_COLUMNS_ACTION = (env: SpreadsheetChildEnv) => {
  const columns = env.model.getters.getElementsFromSelection("COL");
  env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
    sheetId: env.model.getters.getActiveSheetId(),
    dimension: "COL",
    elements: columns,
  });
};

export const HIDE_ROWS_NAME = (env: SpreadsheetChildEnv) => {
  const rows = env.model.getters.getElementsFromSelection("ROW");
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

export const HIDE_ROWS_ACTION = (env: SpreadsheetChildEnv) => {
  const rows = env.model.getters.getElementsFromSelection("ROW");
  env.model.dispatch("HIDE_COLUMNS_ROWS", {
    sheetId: env.model.getters.getActiveSheetId(),
    dimension: "ROW",
    elements: rows,
  });
};

export const UNHIDE_ALL_ROWS_ACTION = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
    sheetId,
    dimension: "ROW",
    elements: Array.from(Array(env.model.getters.getNumberRows(sheetId)).keys()),
  });
};

export const UNHIDE_ROWS_ACTION = (env: SpreadsheetChildEnv) => {
  const columns = env.model.getters.getElementsFromSelection("ROW");
  env.model.dispatch("UNHIDE_COLUMNS_ROWS", {
    sheetId: env.model.getters.getActiveSheetId(),
    dimension: "ROW",
    elements: columns,
  });
};

//------------------------------------------------------------------------------
// Sheets
//------------------------------------------------------------------------------

export const CREATE_SHEET_ACTION = (env: SpreadsheetChildEnv) => {
  const activeSheetId = env.model.getters.getActiveSheetId();
  const position = env.model.getters.getSheetIds().indexOf(activeSheetId) + 1;
  const sheetId = env.model.uuidGenerator.uuidv4();
  env.model.dispatch("CREATE_SHEET", { sheetId, position });
  env.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: activeSheetId, sheetIdTo: sheetId });
};

//------------------------------------------------------------------------------
// Charts
//------------------------------------------------------------------------------

export const CREATE_CHART = (env: SpreadsheetChildEnv) => {
  const getters = env.model.getters;
  const zone = getters.getSelectedZone();
  let dataSetZone = zone;
  const id = env.model.uuidGenerator.uuidv4();
  let labelRange: string | undefined;
  if (zone.left !== zone.right) {
    dataSetZone = { ...zone, left: zone.left + 1 };
  }
  const dataSets = [zoneToXc(dataSetZone)];
  const sheetId = getters.getActiveSheetId();

  const size = { width: DEFAULT_FIGURE_WIDTH, height: DEFAULT_FIGURE_HEIGHT };
  const { x, y } = getters.getMainViewportCoordinates();
  const { scrollX, scrollY } = getters.getActiveSheetScrollInfo();
  const { width, height } = getters.getVisibleRect(getters.getActiveMainViewport());

  const position = {
    x: x + scrollX + Math.max(0, (width - size.width) / 2),
    y: y + scrollY + Math.max(0, (height - size.height) / 2),
  }; // Position at the center of the scrollable viewport

  let title = "";
  const cells = env.model.getters.getCellsInZone(sheetId, {
    ...dataSetZone,
    bottom: dataSetZone.top,
  });
  const dataSetsHaveTitle = !!cells.find(
    (cell) => cell && cell.evaluated.type !== CellValueType.number
  );

  if (dataSetsHaveTitle) {
    const texts = cells.reduce((acc, cell) => {
      const text =
        cell && cell.evaluated.type !== CellValueType.error && env.model.getters.getCellText(cell);
      if (text) {
        acc.push(text);
      }
      return acc;
    }, [] as string[]);

    const lastElement = texts.splice(-1)[0];
    title = texts.join(", ");
    if (lastElement) {
      title += (title ? " " + env._t("and") + " " : "") + lastElement;
    }
  }

  if (zone.left !== zone.right) {
    labelRange = zoneToXc({
      ...zone,
      right: zone.left,
      top: dataSetsHaveTitle ? zone.top + 1 : zone.top,
    });
  }
  const newLegendPos = dataSetZone.right === dataSetZone.left ? "none" : "top"; //Using the same variable as above to identify number of columns involved.

  env.model.dispatch("CREATE_CHART", {
    sheetId,
    id,
    position,
    size,
    definition: {
      title,
      dataSets,
      labelRange,
      type: "bar",
      stacked: false,
      dataSetsHaveTitle,
      verticalAxisPosition: "left",
      legendPosition: newLegendPos,
    },
  });
  env.model.dispatch("SELECT_FIGURE", { id });
  env.openSidePanel("ChartPanel");
};

//------------------------------------------------------------------------------
// Style/Format
//------------------------------------------------------------------------------

export const FORMAT_AUTOMATIC_ACTION = (env: SpreadsheetChildEnv) => setFormatter(env, "");

export const FORMAT_NUMBER_ACTION = (env: SpreadsheetChildEnv) => setFormatter(env, "#,##0.00");

export const FORMAT_PERCENT_ACTION = (env: SpreadsheetChildEnv) => setFormatter(env, "0.00%");

export const FORMAT_CURRENCY_ACTION = (env: SpreadsheetChildEnv) =>
  setFormatter(env, "[$$]#,##0.00");

export const FORMAT_CURRENCY_ROUNDED_ACTION = (env: SpreadsheetChildEnv) =>
  setFormatter(env, "[$$]#,##0");

export const FORMAT_DATE_ACTION = (env: SpreadsheetChildEnv) => setFormatter(env, "m/d/yyyy");

export const FORMAT_TIME_ACTION = (env: SpreadsheetChildEnv) => setFormatter(env, "hh:mm:ss a");

export const FORMAT_DATE_TIME_ACTION = (env: SpreadsheetChildEnv) =>
  setFormatter(env, "m/d/yyyy hh:mm:ss");

export const FORMAT_DURATION_ACTION = (env: SpreadsheetChildEnv) => setFormatter(env, "hhhh:mm:ss");

export const FORMAT_BOLD_ACTION = (env: SpreadsheetChildEnv) =>
  setStyle(env, { bold: !env.model.getters.getCurrentStyle().bold });

export const FORMAT_ITALIC_ACTION = (env: SpreadsheetChildEnv) =>
  setStyle(env, { italic: !env.model.getters.getCurrentStyle().italic });

export const FORMAT_STRIKETHROUGH_ACTION = (env: SpreadsheetChildEnv) =>
  setStyle(env, { strikethrough: !env.model.getters.getCurrentStyle().strikethrough });

export const FORMAT_UNDERLINE_ACTION = (env: SpreadsheetChildEnv) =>
  setStyle(env, { underline: !env.model.getters.getCurrentStyle().underline });

export const FORMAT_CLEARFORMAT_ACTION = (env: SpreadsheetChildEnv) => {
  env.model.dispatch("CLEAR_FORMATTING", {
    sheetId: env.model.getters.getActiveSheetId(),
    target: env.model.getters.getSelectedZones(),
  });
};

//------------------------------------------------------------------------------
// Side panel
//------------------------------------------------------------------------------

export const OPEN_CF_SIDEPANEL_ACTION = (env: SpreadsheetChildEnv) => {
  env.openSidePanel("ConditionalFormatting", { selection: env.model.getters.getSelectedZones() });
};

export const OPEN_FAR_SIDEPANEL_ACTION = (env: SpreadsheetChildEnv) => {
  env.openSidePanel("FindAndReplace", {});
};

export const OPEN_CUSTOM_CURRENCY_SIDEPANEL_ACTION = (env: SpreadsheetChildEnv) => {
  env.openSidePanel("CustomCurrency", {});
};

export const INSERT_LINK = (env: SpreadsheetChildEnv) => {
  let { col, row } = env.model.getters.getPosition();
  env.model.dispatch("OPEN_CELL_POPOVER", { col, row, popoverType: "LinkEditor" });
};

export const INSERT_LINK_NAME = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  const { col, row } = env.model.getters.getPosition();
  const cell = env.model.getters.getCell(sheetId, col, row);

  return cell && cell.isLink() ? _lt("Edit link") : _lt("Insert link");
};

//------------------------------------------------------------------------------
// Filters action
//------------------------------------------------------------------------------

export const FILTERS_CREATE_FILTER_TABLE = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  const selection = env.model.getters.getSelection().zones;
  interactiveAddFilter(env, sheetId, selection);
};

export const FILTERS_REMOVE_FILTER_TABLE = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  env.model.dispatch("REMOVE_FILTER_TABLE", {
    sheetId,
    target: env.model.getters.getSelectedZones(),
  });
};

export const SELECTION_CONTAINS_FILTER = (env: SpreadsheetChildEnv): boolean => {
  const sheetId = env.model.getters.getActiveSheetId();
  const selectedZones = env.model.getters.getSelectedZones();
  return env.model.getters.doesZonesContainFilter(sheetId, selectedZones);
};

export const SELECTION_IS_CONTINUOUS = (env: SpreadsheetChildEnv): boolean => {
  const selectedZones = env.model.getters.getSelectedZones();
  return areZonesContinuous(...selectedZones);
};

//------------------------------------------------------------------------------
// Sorting action
//------------------------------------------------------------------------------

export const SORT_CELLS_ASCENDING = (env: SpreadsheetChildEnv) => {
  const { anchor, zones } = env.model.getters.getSelection();
  const sheetId = env.model.getters.getActiveSheetId();
  interactiveSortSelection(env, sheetId, anchor.cell, zones[0], "ascending");
};

export const SORT_CELLS_DESCENDING = (env: SpreadsheetChildEnv) => {
  const { anchor, zones } = env.model.getters.getSelection();
  const sheetId = env.model.getters.getActiveSheetId();
  interactiveSortSelection(env, sheetId, anchor.cell, zones[0], "descending");
};

export const IS_ONLY_ONE_RANGE = (env: SpreadsheetChildEnv): boolean => {
  return env.model.getters.getSelectedZones().length === 1;
};
