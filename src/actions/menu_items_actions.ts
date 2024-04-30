import { CellPopoverStore } from "../components/popover";
import { DEFAULT_FIGURE_HEIGHT, DEFAULT_FIGURE_WIDTH } from "../constants";
import {
  getChartPositionAtCenterOfViewport,
  getSmartChartDefinition,
} from "../helpers/figures/charts";
import { centerFigurePosition, getMaxFigureSize } from "../helpers/figures/figure/figure";
import {
  areZonesContinuous,
  getZoneArea,
  isConsecutive,
  isEqual,
  largeMax,
  largeMin,
  numberToLetters,
} from "../helpers/index";
import { DEFAULT_TABLE_CONFIG } from "../helpers/table_presets";
import { interactivePaste, interactivePasteFromOS } from "../helpers/ui/paste_interactive";
import { interactiveCreateTable } from "../helpers/ui/table_interactive";
import { _t } from "../translation";
import { ClipboardMIMEType, ClipboardPasteOptions } from "../types/clipboard";
import { Image } from "../types/image";
import { Dimension, Format, SpreadsheetChildEnv, Style, UID } from "../types/index";
import { ActionSpec } from "./action";

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
export const PASTE_AS_VALUE_ACTION = async (env: SpreadsheetChildEnv) => paste(env, "asValue");

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
      if (env.model.getters.isCutOperation() && pasteOption !== "asValue") {
        await env.clipboard.write({ [ClipboardMIMEType.PlainText]: "" });
      }
      break;
    case "notImplemented":
      env.raiseError(
        _t(
          "Pasting from the context menu is not supported in this browser. Use keyboard shortcuts ctrl+c / ctrl+v instead."
        )
      );
      break;
    case "permissionDenied":
      env.raiseError(
        _t(
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
    return _t("Clear rows");
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
    return _t("Clear row %s", (first + 1).toString());
  }
  return _t("Clear rows %s - %s", (first + 1).toString(), (last + 1).toString());
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
    return _t("Clear columns");
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
    return _t("Clear column %s", numberToLetters(first));
  }
  return _t("Clear columns %s - %s", numberToLetters(first), numberToLetters(last));
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
    return _t("Delete rows");
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
    return _t("Delete row %s", (first + 1).toString());
  }
  return _t("Delete rows %s - %s", (first + 1).toString(), (last + 1).toString());
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
    return _t("Delete columns");
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
    return _t("Delete column %s", numberToLetters(first));
  }
  return _t("Delete columns %s - %s", numberToLetters(first), numberToLetters(last));
};

export const NOT_ALL_VISIBLE_ROWS_SELECTED = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  const selectedRows = env.model.getters.getElementsFromSelection("ROW");
  return !env.model.getters.checkElementsIncludeAllVisibleHeaders(sheetId, "ROW", selectedRows);
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
  return !env.model.getters.checkElementsIncludeAllVisibleHeaders(sheetId, "COL", selectedCols);
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
    return _t("Hide column %s", numberToLetters(first).toString());
  } else if (last - first + 1 === cols.length) {
    return _t(
      "Hide columns %s - %s",
      numberToLetters(first).toString(),
      numberToLetters(last).toString()
    );
  } else {
    return _t("Hide columns");
  }
};

export const HIDE_ROWS_NAME = (env: SpreadsheetChildEnv) => {
  const rows = env.model.getters.getElementsFromSelection("ROW");
  let first = rows[0];
  let last = rows[rows.length - 1];
  if (rows.length === 1) {
    return _t("Hide row %s", (first + 1).toString());
  } else if (last - first + 1 === rows.length) {
    return _t("Hide rows %s - %s", (first + 1).toString(), (last + 1).toString());
  } else {
    return _t("Hide rows");
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
    env.raiseError(_t("An unexpected error occurred during the image transfer"));
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
  env.getStore(CellPopoverStore).open({ col, row }, "LinkEditor");
};

export const INSERT_LINK_NAME = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  const { col, row } = env.model.getters.getActivePosition();
  const cell = env.model.getters.getEvaluatedCell({ sheetId, col, row });

  return cell && cell.link ? _t("Edit link") : _t("Insert link");
};

//------------------------------------------------------------------------------
// Filters action
//------------------------------------------------------------------------------

export const SELECTED_TABLE_HAS_FILTERS = (env: SpreadsheetChildEnv): boolean => {
  const table = env.model.getters.getFirstTableInSelection();
  return table?.config.hasFilters || false;
};

export const SELECTION_CONTAINS_SINGLE_TABLE = (env: SpreadsheetChildEnv): boolean => {
  const sheetId = env.model.getters.getActiveSheetId();
  const selectedZones = env.model.getters.getSelectedZones();
  return env.model.getters.getTablesOverlappingZones(sheetId, selectedZones).length === 1;
};

export const IS_SELECTION_CONTINUOUS = (env: SpreadsheetChildEnv): boolean => {
  return areZonesContinuous(env.model.getters.getSelectedZones());
};

export const ADD_DATA_FILTER = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  const table = env.model.getters.getFirstTableInSelection();
  if (table) {
    env.model.dispatch("UPDATE_TABLE", {
      sheetId,
      zone: table.range.zone,
      config: { hasFilters: true },
    });
  } else {
    const tableConfig = {
      ...DEFAULT_TABLE_CONFIG,
      hasFilters: true,
      bandedRows: false,
      styleId: "TableStyleLight11",
    };
    interactiveCreateTable(env, sheetId, tableConfig);
  }
};

export const REMOVE_DATA_FILTER = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();
  const table = env.model.getters.getFirstTableInSelection();
  if (!table) {
    return;
  }
  env.model.dispatch("UPDATE_TABLE", {
    sheetId,
    zone: table.range.zone,
    config: { hasFilters: false },
  });
};

export const INSERT_TABLE = (env: SpreadsheetChildEnv) => {
  const sheetId = env.model.getters.getActiveSheetId();

  const result = interactiveCreateTable(env, sheetId);
  if (result.isSuccessful) {
    env.openSidePanel("TableSidePanel", {});
  }
};

export const DELETE_SELECTED_TABLE = (env: SpreadsheetChildEnv) => {
  const position = env.model.getters.getActivePosition();
  const table = env.model.getters.getTable(position);
  if (!table) {
    return;
  }
  env.model.dispatch("REMOVE_TABLE", {
    sheetId: position.sheetId,
    target: [table.range.zone],
  });
};

//------------------------------------------------------------------------------
// Sorting action
//------------------------------------------------------------------------------

export const IS_ONLY_ONE_RANGE = (env: SpreadsheetChildEnv): boolean => {
  return env.model.getters.getSelectedZones().length === 1;
};

export const CAN_INSERT_HEADER = (env: SpreadsheetChildEnv, dimension: Dimension): boolean => {
  if (!IS_ONLY_ONE_RANGE(env)) {
    return false;
  }
  const activeHeaders =
    dimension === "COL" ? env.model.getters.getActiveCols() : env.model.getters.getActiveRows();
  const ortogonalActiveHeaders =
    dimension === "COL" ? env.model.getters.getActiveRows() : env.model.getters.getActiveCols();
  const sheetId = env.model.getters.getActiveSheetId();
  const zone = env.model.getters.getSelectedZone();
  const allSheetSelected = isEqual(zone, env.model.getters.getSheetZone(sheetId));
  return isConsecutive(activeHeaders) && (ortogonalActiveHeaders.size === 0 || allSheetSelected);
};

export const CREATE_OR_REMOVE_FILTER_ACTION: ActionSpec = {
  name: (env) =>
    SELECTED_TABLE_HAS_FILTERS(env) ? _t("Remove selected filters") : _t("Add filters"),
  isEnabled: (env) => IS_SELECTION_CONTINUOUS(env),
  execute: (env) =>
    SELECTED_TABLE_HAS_FILTERS(env) ? REMOVE_DATA_FILTER(env) : ADD_DATA_FILTER(env),
  icon: "o-spreadsheet-Icon.FILTER_ICON_ACTIVE",
};

export function getSendToSheetMenuChildren(
  env: SpreadsheetChildEnv,
  sendItemToSheetCallback: (env: SpreadsheetChildEnv, sheetId: UID) => void
): ActionSpec[] {
  const sheetIds = env.model.getters
    .getSheetIds()
    .filter((sheetId) => sheetId !== env.model.getters.getActiveSheetId());

  const children: ActionSpec[] = [];
  for (const sheetId of sheetIds) {
    children.push({
      name: env.model.getters.getSheetName(sheetId),
      id: sheetId,
      icon: "o-spreadsheet-Icon.CLEAR_AND_RELOAD",
      execute: (env) => sendItemToSheetCallback(env, sheetId),
    });
  }
  children.push({
    name: _t("New sheet"),
    id: "new_sheet",
    icon: "o-spreadsheet-Icon.PLUS",
    execute: (env) => {
      const position = env.model.getters.getSheetIds().length;
      const sheetId = env.model.uuidGenerator.uuidv4();
      const name = env.model.getters.getNextSheetName(_t("Sheet"));

      env.model.dispatch("CREATE_SHEET", { sheetId, position, name });
      sendItemToSheetCallback(env, sheetId);
    },
  });
  return children;
}
