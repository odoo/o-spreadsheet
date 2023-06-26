import { DEFAULT_FIGURE_HEIGHT, DEFAULT_FIGURE_WIDTH } from "../constants";
import {
  getChartPositionAtCenterOfViewport,
  getSmartChartDefinition,
} from "../helpers/figures/charts";
import { centerFigurePosition, getMaxFigureSize } from "../helpers/figures/figure/figure";
import { getZoneArea, numberToLetters } from "../helpers/index";
import { interactivePaste, interactivePasteFromOS } from "../helpers/ui/paste_interactive";
import { _lt } from "../translation";
import { ClipboardMIMEType, ClipboardPasteOptions } from "../types/clipboard";
import { Image } from "../types/image";
import { Format, SpreadsheetChildEnv, Style } from "../types/index";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

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

//------------------------------------------------------------------------------
// Simple actions
//------------------------------------------------------------------------------

export const PASTE_ACTION = async (env: SpreadsheetChildEnv) => paste(env);
export const PASTE_VALUE_ACTION = async (env: SpreadsheetChildEnv) => paste(env, "onlyValue");

async function paste(env: SpreadsheetChildEnv, pasteOption?: ClipboardPasteOptions) {
  const spreadsheetClipboard = env.model.getters.getClipboardTextContent();
  const osClipboard = await env.clipboard.readText();

  switch (osClipboard.status) {
    case "ok":
      const target = env.model.getters.getSelectedZones();
      if (osClipboard && osClipboard.content !== spreadsheetClipboard) {
        interactivePasteFromOS(env, target, osClipboard.content, pasteOption);
      } else {
        interactivePaste(env, target, pasteOption);
      }
      if (env.model.getters.isCutOperation() && pasteOption !== "onlyValue") {
        await env.clipboard.write({ [ClipboardMIMEType.PlainText]: "" });
      }
      break;
    case "notImplemented":
      env.raiseError(
        _lt(
          "Pasting from the context menu is not supported in this browser. Use keyboard shortcuts ctrl+c / ctrl+v instead."
        )
      );
      break;
    case "permissionDenied":
      env.raiseError(
        _lt(
          "Access to the clipboard denied by the browser. Please enable clipboard permission for this page in your browser settings."
        )
      );
      break;
  }
}

export const PASTE_FORMAT_ACTION = (env: SpreadsheetChildEnv) => paste(env, "onlyFormat");

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
    first = Math.min(...activesRows);
    last = Math.max(...activesRows);
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
    first = Math.min(...activeCols);
    last = Math.max(...activeCols);
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
    first = Math.min(...activesRows);
    last = Math.max(...activesRows);
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

export const REMOVE_COLUMNS_NAME = (env: SpreadsheetChildEnv) => {
  if (env.model.getters.getSelectedZones().length > 1) {
    return _lt("Delete columns");
  }
  let first: number;
  let last: number;
  const activeCols = env.model.getters.getActiveCols();
  if (activeCols.size !== 0) {
    first = Math.min(...activeCols);
    last = Math.max(...activeCols);
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

export const NOT_ALL_VISIBLE_ROWS_SELECTED = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  const selectedRows = env.model.getters.getElementsFromSelection("ROW");
  return env.model.getters.canRemoveHeaders(sheetId, "ROW", selectedRows);
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

export const NOT_ALL_VISIBLE_COLS_SELECTED = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  const selectedCols = env.model.getters.getElementsFromSelection("COL");
  return env.model.getters.canRemoveHeaders(sheetId, "COL", selectedCols);
};

export const INSERT_ROWS_BEFORE_ACTION = (env: SpreadsheetChildEnv) => {
  const activeRows = env.model.getters.getActiveRows();
  let row: number;
  let quantity: number;
  if (activeRows.size) {
    row = Math.min(...activeRows);
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

export const INSERT_ROWS_AFTER_ACTION = (env: SpreadsheetChildEnv) => {
  const activeRows = env.model.getters.getActiveRows();
  let row: number;
  let quantity: number;
  if (activeRows.size) {
    row = Math.max(...activeRows);
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

export const INSERT_COLUMNS_BEFORE_ACTION = (env: SpreadsheetChildEnv) => {
  const activeCols = env.model.getters.getActiveCols();
  let column: number;
  let quantity: number;
  if (activeCols.size) {
    column = Math.min(...activeCols);
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

export const INSERT_COLUMNS_AFTER_ACTION = (env: SpreadsheetChildEnv) => {
  const activeCols = env.model.getters.getActiveCols();
  let column: number;
  let quantity: number;
  if (activeCols.size) {
    column = Math.max(...activeCols);
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

//------------------------------------------------------------------------------
// Charts
//------------------------------------------------------------------------------

export const CREATE_CHART = (env: SpreadsheetChildEnv) => {
  const getters = env.model.getters;
  const id = env.model.uuidGenerator.uuidv4();
  const sheetId = getters.getActiveSheetId();

  if (getZoneArea(env.model.getters.getSelectedZone()) === 1) {
    env.model.selection.selectTableAroundSelection();
  }

  const size = { width: DEFAULT_FIGURE_WIDTH, height: DEFAULT_FIGURE_HEIGHT };
  const position = getChartPositionAtCenterOfViewport(getters, size);

  const result = env.model.dispatch("CREATE_CHART", {
    sheetId,
    id,
    position,
    size,
    definition: getSmartChartDefinition(env.model.getters.getSelectedZone(), env.model.getters),
  });
  if (result.isSuccessful) {
    env.model.dispatch("SELECT_FIGURE", { id });
    env.openSidePanel("ChartPanel");
  }
};

//------------------------------------------------------------------------------
// Image
//------------------------------------------------------------------------------
async function requestImage(env: SpreadsheetChildEnv): Promise<Image | undefined> {
  try {
    return await env.imageProvider!.requestImage();
  } catch {
    env.raiseError(_lt("An unexpected error occurred during the image transfer"));
    return undefined;
  }
}

export const CREATE_IMAGE = async (env: SpreadsheetChildEnv) => {
  if (env.imageProvider) {
    const sheetId = env.model.getters.getActiveSheetId();
    const figureId = env.model.uuidGenerator.uuidv4();
    const image = await requestImage(env);
    if (!image) {
      throw new Error("No image provider was given to the environment");
    }
    const size = getMaxFigureSize(env.model.getters, image.size);
    const position = centerFigurePosition(env.model.getters, size);
    env.model.dispatch("CREATE_IMAGE", {
      sheetId,
      figureId,
      position,
      size,
      definition: image,
    });
  }
};

//------------------------------------------------------------------------------
// Style/Format
//------------------------------------------------------------------------------

export const FORMAT_PERCENT_ACTION = (env: SpreadsheetChildEnv) => setFormatter(env, "0.00%");

//------------------------------------------------------------------------------
// Side panel
//------------------------------------------------------------------------------
export const OPEN_CF_SIDEPANEL_ACTION = (env: SpreadsheetChildEnv) => {
  env.openSidePanel("ConditionalFormatting", { selection: env.model.getters.getSelectedZones() });
};

export const INSERT_LINK = (env: SpreadsheetChildEnv) => {
  let { col, row } = env.model.getters.getActivePosition();
  env.model.dispatch("OPEN_CELL_POPOVER", { col, row, popoverType: "LinkEditor" });
};

//------------------------------------------------------------------------------
// Filters action
//------------------------------------------------------------------------------

export const SELECTION_CONTAINS_FILTER = (env: SpreadsheetChildEnv): boolean => {
  const sheetId = env.model.getters.getActiveSheetId();
  const selectedZones = env.model.getters.getSelectedZones();
  return env.model.getters.doesZonesContainFilter(sheetId, selectedZones);
};

//------------------------------------------------------------------------------
// Sorting action
//------------------------------------------------------------------------------

export const IS_ONLY_ONE_RANGE = (env: SpreadsheetChildEnv): boolean => {
  return env.model.getters.getSelectedZones().length === 1;
};
