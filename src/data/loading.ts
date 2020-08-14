import { SheetData, Workbook, WorkbookData } from "../types/index";
import { uuidv4 } from "../helpers/index";
import { migrate, CURRENT_VERSION } from "./migrations";

/**
 * This function tries to load anything that could look like a valid workbook
 * data object. It applies any migrations, if needed, and return a current,
 * complete workbook data object.
 *
 * It also ensures that there is at least one sheet.
 */
export function load(data?: any): WorkbookData {
  if (!data) {
    return createEmptyWorkbookData();
  }
  data = Object.assign({}, data);

  // apply migrations, if needed
  if ("version" in data) {
    if (data.version < CURRENT_VERSION) {
      data = migrate(data);
    }
  }

  // sanity check: try to fix missing fields/corrupted state by providing
  // sensible default values
  data = Object.assign(createEmptyWorkbookData(), data, { version: CURRENT_VERSION });
  data.sheets = data.sheets.map((s, i) => Object.assign(createEmptySheet(`Sheet${i + 1}`), s));
  if (!data.sheets.map((s) => s.id).includes(data.activeSheet)) {
    data.activeSheet = data.sheets[0].id;
  }

  if (data.sheets.length === 0) {
    data.sheets.push(createEmptySheet());
  }
  return data;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function createEmptySheet(name: string = "Sheet1"): SheetData {
  return {
    id: uuidv4(),
    name,
    colNumber: 26,
    rowNumber: 100,
    cells: {},
    cols: {},
    rows: {},
    merges: [],
    conditionalFormats: [],
    figures: [],
  };
}

export function createEmptyWorkbookData(): WorkbookData {
  const data = {
    version: CURRENT_VERSION,
    sheets: [createEmptySheet("Sheet1")],
    activeSheet: "",
    entities: {},
    styles: {},
    borders: {},
  };
  data.activeSheet = data.sheets[0].id;
  return data;
}

export function createEmptyWorkbook(): Workbook {
  return {
    visibleSheets: [],
    sheets: {},
    activeSheet: null as any,
  };
}
