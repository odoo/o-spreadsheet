import { SheetData, Workbook, WorkbookData } from "./types/index";

/**
 * This is the current state version number. It should be incremented each time
 * a breaking change is made in the way the state is handled, and an upgrade
 * function should be defined
 */
export const CURRENT_VERSION = 2;

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
  if (!data.sheets.map((s) => s.name).includes(data.activeSheet)) {
    data.activeSheet = data.sheets[0].name;
  }

  if (data.sheets.length === 0) {
    data.sheets.push(createEmptySheet());
  }
  return data;
}

// -----------------------------------------------------------------------------
// Migrations
// -----------------------------------------------------------------------------

interface Migration {
  from: number;
  to: number;
  applyMigration(data: any): any;
}

function migrate(data: any): WorkbookData {
  const index = MIGRATIONS.findIndex((m) => m.from === data.version);
  for (let i = index; i < MIGRATIONS.length; i++) {
    data = MIGRATIONS[i].applyMigration(data);
  }
  return data;
}

const MIGRATIONS: Migration[] = [
  {
    from: 1,
    to: 2,
    applyMigration(data: any): any {
      if (data.sheets && data.sheets[0]) {
        data.activeSheet = data.sheets[0].name;
      }
      return data;
    },
  },
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function createEmptySheet(name: string = "Sheet1"): SheetData {
  return {
    name,
    colNumber: 26,
    rowNumber: 100,
    cells: {},
    cols: {},
    rows: {},
    merges: [],
    conditionalFormats: [],
  };
}

export function createEmptyWorkbookData(): WorkbookData {
  return {
    version: CURRENT_VERSION,
    sheets: [createEmptySheet("Sheet1")],
    activeSheet: "Sheet1",
    entities: {},
    styles: {},
    borders: {},
  };
}

export function createEmptyWorkbook(): Workbook {
  return {
    rows: [],
    cols: [],
    cells: {},
    merges: {},
    mergeCellMap: {},
    sheets: [],
    activeSheet: null as any,
  };
}
