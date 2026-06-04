import { CellPopoverStore } from "../components/popover/cell_popover_store";
import { getPivotTooBigErrorMessage } from "../components/translations_terms";
import {
  DEFAULT_FIGURE_HEIGHT,
  DEFAULT_FIGURE_WIDTH,
  PIVOT_MAX_NUMBER_OF_CELLS,
} from "../constants";
import {
  getOSheetClipboardIdFromHTML,
  parseOSClipboardContent,
} from "../helpers/clipboard/clipboard_helpers";
import { numberToLetters } from "../helpers/coordinates";
import { getSmartChartDefinition } from "../helpers/figures/charts/smart_chart_engine";
import { centerFigurePosition, getMaxFigureSize } from "../helpers/figures/figure/figure";
import { isConsecutive, largeMax, largeMin } from "../helpers/misc";
import { DEFAULT_TABLE_CONFIG } from "../helpers/table_presets";
import { interactivePaste, interactivePasteFromOS } from "../helpers/ui/paste_interactive";
import { interactiveCreateTable } from "../helpers/ui/table_interactive";
import { UuidGenerator } from "../helpers/uuid";
import { areZonesContinuous, getZoneArea, isEqual } from "../helpers/zones";
import { Model } from "../model";
import { _t } from "../translation";
import { ClipboardMIMEType, ClipboardPasteOptions } from "../types/clipboard";
import { Format } from "../types/format";
import { Dimension, Style } from "../types/misc";
import { SpreadsheetChildEnv } from "../types/spreadsheet_env";
import { ActionSpec } from "./action";

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

export function setFormatter(model: Model, format: Format) {
  model.dispatch("SET_FORMATTING_WITH_PIVOT", {
    sheetId: model.getters.getActiveSheetId(),
    target: model.getters.getSelectedZones(),
    format,
  });
}

export function setStyle(model: Model, style: Style) {
  model.dispatch("SET_FORMATTING", {
    sheetId: model.getters.getActiveSheetId(),
    target: model.getters.getSelectedZones(),
    style,
  });
}

//------------------------------------------------------------------------------
// Simple actions
//------------------------------------------------------------------------------

export const PASTE_ACTION = async (model: Model, env: SpreadsheetChildEnv) => paste(model, env);
export const PASTE_AS_VALUE_ACTION = async (model: Model, env: SpreadsheetChildEnv) =>
  paste(model, env, "asValue");

async function paste(model: Model, env: SpreadsheetChildEnv, pasteOption?: ClipboardPasteOptions) {
  const osClipboard = await env.clipboard.read();
  switch (osClipboard.status) {
    case "ok":
      const clipboardId = model.getters.getClipboardId();
      const target = model.getters.getSelectedZones();
      const htmlClipboardId = getOSheetClipboardIdFromHTML(
        osClipboard.content[ClipboardMIMEType.Html]
      );
      if (clipboardId === htmlClipboardId) {
        interactivePaste(model, env, target, pasteOption);
      } else {
        const osClipboardContent = parseOSClipboardContent(osClipboard.content);
        await interactivePasteFromOS(model, env, target, osClipboardContent, pasteOption);
      }
      if (model.getters.isCutOperation() && pasteOption !== "asValue") {
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

export const PASTE_FORMAT_ACTION = (model: Model, env: SpreadsheetChildEnv) =>
  paste(model, env, "onlyFormat");

//------------------------------------------------------------------------------
// Grid manipulations
//------------------------------------------------------------------------------

export const DELETE_CONTENT_ROWS_NAME = (model: Model) => {
  if (model.getters.getSelectedZones().length > 1) {
    return _t("Clear rows");
  }
  let first: number;
  let last: number;
  const activesRows = model.getters.getActiveRows();
  if (activesRows.size !== 0) {
    first = largeMin([...activesRows]);
    last = largeMax([...activesRows]);
  } else {
    const zone = model.getters.getSelectedZones()[0];
    first = zone.top;
    last = zone.bottom;
  }
  if (first === last) {
    return _t("Clear row %s", (first + 1).toString());
  }
  return _t("Clear rows %s - %s", (first + 1).toString(), (last + 1).toString());
};

export const DELETE_CONTENT_ROWS_ACTION = (model: Model) => {
  const sheetId = model.getters.getActiveSheetId();
  const target = [...model.getters.getActiveRows()].map((index) =>
    model.getters.getRowsZone(sheetId, index, index)
  );
  model.dispatch("DELETE_CONTENT", {
    target,
    sheetId: model.getters.getActiveSheetId(),
  });
};

export const DELETE_CONTENT_COLUMNS_NAME = (model: Model) => {
  if (model.getters.getSelectedZones().length > 1) {
    return _t("Clear columns");
  }
  let first: number;
  let last: number;
  const activeCols = model.getters.getActiveCols();
  if (activeCols.size !== 0) {
    first = largeMin([...activeCols]);
    last = largeMax([...activeCols]);
  } else {
    const zone = model.getters.getSelectedZones()[0];
    first = zone.left;
    last = zone.right;
  }
  if (first === last) {
    return _t("Clear column %s", numberToLetters(first));
  }
  return _t("Clear columns %s - %s", numberToLetters(first), numberToLetters(last));
};

export const DELETE_CONTENT_COLUMNS_ACTION = (model: Model) => {
  const sheetId = model.getters.getActiveSheetId();
  const target = [...model.getters.getActiveCols()].map((index) =>
    model.getters.getColsZone(sheetId, index, index)
  );
  model.dispatch("DELETE_CONTENT", {
    target,
    sheetId: model.getters.getActiveSheetId(),
  });
};

export const REMOVE_ROWS_NAME = (model: Model) => {
  if (model.getters.getSelectedZones().length > 1) {
    return _t("Delete rows");
  }
  let first: number;
  let last: number;
  const activesRows = model.getters.getActiveRows();
  if (activesRows.size !== 0) {
    first = largeMin([...activesRows]);
    last = largeMax([...activesRows]);
  } else {
    const zone = model.getters.getSelectedZones()[0];
    first = zone.top;
    last = zone.bottom;
  }
  if (first === last) {
    return _t("Delete row %s", (first + 1).toString());
  }
  return _t("Delete rows %s - %s", (first + 1).toString(), (last + 1).toString());
};

export const REMOVE_ROWS_ACTION = (model: Model) => {
  const rows = [...model.getters.getActiveRows()];
  if (!rows.length) {
    const zone = model.getters.getSelectedZones()[0];
    for (let i = zone.top; i <= zone.bottom; i++) {
      rows.push(i);
    }
  }
  model.dispatch("REMOVE_COLUMNS_ROWS", {
    sheetId: model.getters.getActiveSheetId(),
    sheetName: model.getters.getActiveSheetName(),
    dimension: "ROW",
    elements: rows,
  });
};

export const CAN_REMOVE_COLUMNS_ROWS = (model: Model, dimension: Dimension): boolean => {
  if (
    (dimension === "COL" && model.getters.getActiveRows().size > 0) ||
    (dimension === "ROW" && model.getters.getActiveCols().size > 0)
  ) {
    return false;
  }
  const sheetId = model.getters.getActiveSheetId();
  const selectedElements = model.getters.getElementsFromSelection(dimension);

  const includesAllVisibleHeaders = model.getters.checkElementsIncludeAllVisibleHeaders(
    sheetId,
    dimension,
    selectedElements
  );
  const includesAllNonFrozenHeaders = model.getters.checkElementsIncludeAllNonFrozenHeaders(
    sheetId,
    dimension,
    selectedElements
  );

  return !includesAllVisibleHeaders && !includesAllNonFrozenHeaders;
};

export const REMOVE_COLUMNS_NAME = (model: Model) => {
  if (model.getters.getSelectedZones().length > 1) {
    return _t("Delete columns");
  }
  let first: number;
  let last: number;
  const activeCols = model.getters.getActiveCols();
  if (activeCols.size !== 0) {
    first = largeMin([...activeCols]);
    last = largeMax([...activeCols]);
  } else {
    const zone = model.getters.getSelectedZones()[0];
    first = zone.left;
    last = zone.right;
  }
  if (first === last) {
    return _t("Delete column %s", numberToLetters(first));
  }
  return _t("Delete columns %s - %s", numberToLetters(first), numberToLetters(last));
};

export const NOT_ALL_VISIBLE_ROWS_SELECTED = (model: Model) => {
  const sheetId = model.getters.getActiveSheetId();
  const selectedRows = model.getters.getElementsFromSelection("ROW");
  return !model.getters.checkElementsIncludeAllVisibleHeaders(sheetId, "ROW", selectedRows);
};

export const REMOVE_COLUMNS_ACTION = (model: Model) => {
  const columns = [...model.getters.getActiveCols()];
  if (!columns.length) {
    const zone = model.getters.getSelectedZones()[0];
    for (let i = zone.left; i <= zone.right; i++) {
      columns.push(i);
    }
  }
  model.dispatch("REMOVE_COLUMNS_ROWS", {
    sheetId: model.getters.getActiveSheetId(),
    sheetName: model.getters.getActiveSheetName(),
    dimension: "COL",
    elements: columns,
  });
};

export const NOT_ALL_VISIBLE_COLS_SELECTED = (model: Model) => {
  const sheetId = model.getters.getActiveSheetId();
  const selectedCols = model.getters.getElementsFromSelection("COL");
  return !model.getters.checkElementsIncludeAllVisibleHeaders(sheetId, "COL", selectedCols);
};

export const INSERT_ROWS_BEFORE_ACTION = (model: Model) => {
  const activeRows = model.getters.getActiveRows();
  let row: number;
  let quantity: number;
  if (activeRows.size) {
    row = largeMin([...activeRows]);
    quantity = activeRows.size;
  } else {
    const zone = model.getters.getSelectedZones()[0];
    row = zone.top;
    quantity = zone.bottom - zone.top + 1;
  }
  model.dispatch("ADD_COLUMNS_ROWS", {
    sheetId: model.getters.getActiveSheetId(),
    sheetName: model.getters.getActiveSheetName(),
    position: "before",
    base: row,
    quantity,
    dimension: "ROW",
  });
};

export const INSERT_ROWS_AFTER_ACTION = (model: Model) => {
  const activeRows = model.getters.getActiveRows();
  let row: number;
  let quantity: number;
  if (activeRows.size) {
    row = largeMax([...activeRows]);
    quantity = activeRows.size;
  } else {
    const zone = model.getters.getSelectedZones()[0];
    row = zone.bottom;
    quantity = zone.bottom - zone.top + 1;
  }
  model.dispatch("ADD_COLUMNS_ROWS", {
    sheetId: model.getters.getActiveSheetId(),
    sheetName: model.getters.getActiveSheetName(),
    position: "after",
    base: row,
    quantity,
    dimension: "ROW",
  });
};

export const INSERT_COLUMNS_BEFORE_ACTION = (model: Model) => {
  const activeCols = model.getters.getActiveCols();
  let column: number;
  let quantity: number;
  if (activeCols.size) {
    column = largeMin([...activeCols]);
    quantity = activeCols.size;
  } else {
    const zone = model.getters.getSelectedZones()[0];
    column = zone.left;
    quantity = zone.right - zone.left + 1;
  }
  model.dispatch("ADD_COLUMNS_ROWS", {
    sheetId: model.getters.getActiveSheetId(),
    sheetName: model.getters.getActiveSheetName(),
    position: "before",
    dimension: "COL",
    base: column,
    quantity,
  });
};

export const INSERT_COLUMNS_AFTER_ACTION = (model: Model) => {
  const activeCols = model.getters.getActiveCols();
  let column: number;
  let quantity: number;
  if (activeCols.size) {
    column = largeMax([...activeCols]);
    quantity = activeCols.size;
  } else {
    const zone = model.getters.getSelectedZones()[0];
    column = zone.right;
    quantity = zone.right - zone.left + 1;
  }
  model.dispatch("ADD_COLUMNS_ROWS", {
    sheetId: model.getters.getActiveSheetId(),
    sheetName: model.getters.getActiveSheetName(),
    position: "after",
    dimension: "COL",
    base: column,
    quantity,
  });
};

export const HIDE_COLUMNS_NAME = (model: Model) => {
  const cols = model.getters.getElementsFromSelection("COL");
  const first = cols[0];
  const last = cols[cols.length - 1];
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

export const HIDE_ROWS_NAME = (model: Model) => {
  const rows = model.getters.getElementsFromSelection("ROW");
  const first = rows[0];
  const last = rows[rows.length - 1];
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

export const CREATE_CHART = (model: Model, env: SpreadsheetChildEnv) => {
  const getters = model.getters;
  const figureId = UuidGenerator.smallUuid();
  const sheetId = getters.getActiveSheetId();
  let zones = getters.getSelectedZones();

  if (zones.length === 1 && getZoneArea(zones[0]) === 1) {
    model.selection.selectTableAroundSelection();
    zones = getters.getSelectedZones();
  }

  const size = { width: DEFAULT_FIGURE_WIDTH, height: DEFAULT_FIGURE_HEIGHT };
  const { col, row, offset } = centerFigurePosition(getters, size);

  const result = model.dispatch("CREATE_CHART", {
    sheetId,
    figureId,
    chartId: UuidGenerator.smallUuid(),
    col,
    row,
    offset,
    size,
    definition: getSmartChartDefinition(zones, model.getters),
  });
  if (result.isSuccessful) {
    model.dispatch("SELECT_FIGURE", { figureId });
    env.openSidePanel("ChartPanel");
  }
};

export const CREATE_CAROUSEL = (model: Model, env: SpreadsheetChildEnv) => {
  const getters = model.getters;
  const figureId = UuidGenerator.smallUuid();
  const sheetId = getters.getActiveSheetId();

  const size = { width: DEFAULT_FIGURE_WIDTH, height: DEFAULT_FIGURE_HEIGHT };
  const { col, row, offset } = centerFigurePosition(getters, size);

  const result = model.dispatch("CREATE_CAROUSEL", {
    sheetId,
    figureId,
    col,
    row,
    offset,
    size,
    definition: { items: [] },
  });
  if (result.isSuccessful) {
    model.dispatch("SELECT_FIGURE", { figureId });
    env.openSidePanel("CarouselPanel", { figureId });
  }
};

//------------------------------------------------------------------------------
// Pivots
//------------------------------------------------------------------------------

export const CREATE_PIVOT = (model: Model, env: SpreadsheetChildEnv) => {
  const pivotId = UuidGenerator.smallUuid();
  const newSheetId = UuidGenerator.smallUuid();
  const result = model.dispatch("INSERT_NEW_PIVOT", { pivotId, newSheetId });
  if (result.isSuccessful) {
    env.openSidePanel("PivotSidePanel", { pivotId });
  }
};

export const REINSERT_DYNAMIC_PIVOT_CHILDREN = (model: Model) =>
  model.getters.getPivotIds().map((pivotId, index) => ({
    id: `reinsert_dynamic_pivot_${model.getters.getPivotFormulaId(pivotId)}`,
    name: model.getters.getPivotDisplayName(pivotId),
    sequence: index,
    execute: (model: Model) => {
      const zone = model.getters.getSelectedZone();
      const table = model.getters.getPivot(pivotId).getCollapsedTableStructure().export();
      model.dispatch("INSERT_PIVOT_WITH_TABLE", {
        pivotId,
        table,
        col: zone.left,
        row: zone.top,
        sheetId: model.getters.getActiveSheetId(),
        pivotMode: "dynamic",
      });
      model.dispatch("REFRESH_PIVOT", { id: pivotId });
    },
    isVisible: (model: Model) => model.getters.getPivot(pivotId).isValid(),
  }));

export const REINSERT_STATIC_PIVOT_CHILDREN = (model: Model) =>
  model.getters.getPivotIds().map((pivotId, index) => ({
    id: `reinsert_static_pivot_${model.getters.getPivotFormulaId(pivotId)}`,
    name: model.getters.getPivotDisplayName(pivotId),
    sequence: index,
    execute: (model: Model, env: SpreadsheetChildEnv) => {
      const zone = model.getters.getSelectedZone();
      const table = model.getters.getPivot(pivotId).getExpandedTableStructure();
      if (table.numberOfCells > PIVOT_MAX_NUMBER_OF_CELLS) {
        env.notifyUser({
          type: "warning",
          text: getPivotTooBigErrorMessage(table.numberOfCells, model.getters.getLocale()),
          sticky: true,
        });
        return;
      }
      model.dispatch("INSERT_PIVOT_WITH_TABLE", {
        pivotId,
        table: table.export(),
        col: zone.left,
        row: zone.top,
        sheetId: model.getters.getActiveSheetId(),
        pivotMode: "static",
      });
      model.dispatch("REFRESH_PIVOT", { id: pivotId });
    },
    isVisible: (model: Model) => model.getters.getPivot(pivotId).isValid(),
  }));

//------------------------------------------------------------------------------
// Image
//------------------------------------------------------------------------------

export const CREATE_IMAGE = async (model: Model, env: SpreadsheetChildEnv) => {
  if (env.imageProvider) {
    const sheetId = model.getters.getActiveSheetId();
    const figureId = UuidGenerator.smallUuid();
    const image = await env.imageProvider.requestImage();
    const size = getMaxFigureSize(model.getters, image.size);
    const { col, row, offset } = centerFigurePosition(model.getters, size);
    model.dispatch("CREATE_IMAGE", {
      sheetId,
      figureId,
      col,
      row,
      offset,
      size,
      definition: image,
    });
  }
};

//------------------------------------------------------------------------------
// Style/Format
//------------------------------------------------------------------------------

export const FORMAT_PERCENT_ACTION = (model: Model) => setFormatter(model, "0.00%");

//------------------------------------------------------------------------------
// Side panel
//------------------------------------------------------------------------------
export const OPEN_CF_SIDEPANEL_ACTION = (model: Model, env: SpreadsheetChildEnv) => {
  const sheetId = model.getters.getActiveSheetId();
  const zones = model.getters.getSelectedZones();
  const rules = model.getters.getConditionalFormats(sheetId);
  const ruleIds = model.getters.getRulesSelection(sheetId, zones);
  if (ruleIds.length === 1) {
    return env.openSidePanel("ConditionalFormattingEditor", {
      cf: rules.find((r) => r.id === ruleIds[0]),
      isNewCf: false,
    });
  }
  return env.openSidePanel("ConditionalFormatting");
};

export const INSERT_LINK = (model: Model, env: SpreadsheetChildEnv) => {
  const { col, row } = model.getters.getActivePosition();
  env.getStore(CellPopoverStore).open({ col, row }, "LinkEditor");
};

export const INSERT_LINK_NAME = (model: Model, env: SpreadsheetChildEnv) => {
  const sheetId = model.getters.getActiveSheetId();
  const { col, row } = model.getters.getActivePosition();
  const cell = model.getters.getEvaluatedCell({ sheetId, col, row });

  return cell && cell.link ? _t("Edit link") : _t("Insert link");
};

//------------------------------------------------------------------------------
// Filters action
//------------------------------------------------------------------------------

export const SELECTED_TABLE_HAS_FILTERS = (model: Model): boolean => {
  const table = model.getters.getFirstTableInSelection();
  return table?.config.hasFilters || false;
};

export const SELECTION_CONTAINS_SINGLE_TABLE = (model: Model): boolean => {
  const sheetId = model.getters.getActiveSheetId();
  const selectedZones = model.getters.getSelectedZones();
  const tables = model.getters.getTablesOverlappingZones(sheetId, selectedZones);
  return tables.length === 1 && !tables[0].isPivotTable;
};

export const IS_SELECTION_CONTINUOUS = (model: Model): boolean => {
  return areZonesContinuous(model.getters.getSelectedZones());
};

export const ADD_DATA_FILTER = (model: Model, env: SpreadsheetChildEnv) => {
  const sheetId = model.getters.getActiveSheetId();
  const table = model.getters.getFirstTableInSelection();
  if (table) {
    model.dispatch("UPDATE_TABLE", {
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
    interactiveCreateTable(model, env, sheetId, tableConfig);
  }
};

export const REMOVE_DATA_FILTER = (model: Model) => {
  const sheetId = model.getters.getActiveSheetId();
  const table = model.getters.getFirstTableInSelection();
  if (!table) {
    return;
  }
  model.dispatch("UPDATE_TABLE", {
    sheetId,
    zone: table.range.zone,
    config: { hasFilters: false },
  });
};

export const INSERT_TABLE = (model: Model, env: SpreadsheetChildEnv) => {
  const sheetId = model.getters.getActiveSheetId();

  const result = interactiveCreateTable(model, env, sheetId);
  if (result.isSuccessful) {
    env.openSidePanel("TableSidePanel", {});
  }
};

export const DELETE_SELECTED_TABLE = (model: Model) => {
  const table = model.getters.getFirstTableInSelection();
  if (!table) {
    return;
  }
  model.dispatch("REMOVE_TABLE", {
    sheetId: model.getters.getActiveSheetId(),
    target: [table.range.zone],
  });
};

//------------------------------------------------------------------------------
// Sorting action
//------------------------------------------------------------------------------

export const IS_ONLY_ONE_RANGE = (model: Model): boolean => {
  return model.getters.getSelectedZones().length === 1;
};

export const CAN_INSERT_HEADER = (model: Model, dimension: Dimension): boolean => {
  if (!IS_ONLY_ONE_RANGE(model)) {
    return false;
  }
  const activeHeaders =
    dimension === "COL" ? model.getters.getActiveCols() : model.getters.getActiveRows();
  const ortogonalActiveHeaders =
    dimension === "COL" ? model.getters.getActiveRows() : model.getters.getActiveCols();
  const sheetId = model.getters.getActiveSheetId();
  const zone = model.getters.getSelectedZone();
  const allSheetSelected = isEqual(zone, model.getters.getSheetZone(sheetId));
  return isConsecutive(activeHeaders) && (ortogonalActiveHeaders.size === 0 || allSheetSelected);
};

export const CREATE_OR_REMOVE_FILTER_ACTION: ActionSpec = {
  name: (model) =>
    SELECTED_TABLE_HAS_FILTERS(model) ? _t("Remove selected filters") : _t("Add filters"),
  isEnabled: (model) => IS_SELECTION_CONTINUOUS(model),
  execute: (model, env) =>
    SELECTED_TABLE_HAS_FILTERS(model) ? REMOVE_DATA_FILTER(model) : ADD_DATA_FILTER(model, env),
  icon: "o-spreadsheet-Icon.FILTER_ICON_ACTIVE",
};
