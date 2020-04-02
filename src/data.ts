import { SheetData, WorkbookData, Workbook } from "./types/index";
import { DEFAULT_CELL_WIDTH, HEADER_WIDTH, HEADER_HEIGHT, DEFAULT_CELL_HEIGHT } from "./constants";

/**
 * This is the current state version number. It should be incremented each time
 * a breaking change is made in the way the state is handled, and an upgrade
 * function should be defined
 */
export const CURRENT_VERSION = 1;

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

  if ("version" in data) {
    // this is a properly formatted data object. We can apply migrations
    if (data.version < CURRENT_VERSION) {
      data = migrate(data);
    }
  } else {
    // this is a data object which may or may not be valid. We will try to fill
    // all the known missing data with sensible default values
    data.version = CURRENT_VERSION;
    data = Object.assign(createEmptyWorkbookData(), data);
    data.sheets = data.sheets.map((s, i) => Object.assign(createEmptySheet(`Sheet${i + 1}`), s));
  }

  // Sanity check: we make sure that there is at least one sheet
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
  const index = MIGRATIONS.findIndex(m => m.from === data.version);
  for (let i = index; i < MIGRATIONS.length; i++) {
    data = MIGRATIONS[i].applyMigration(data);
  }
  return data;
}

const MIGRATIONS: Migration[] = [
  {
    from: 0,
    to: 1,
    applyMigration(data: any): any {
      data.x = 1;
    }
  }
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
    conditionalFormats: []
  };
}

function createEmptyWorkbookData(): WorkbookData {
  return {
    version: CURRENT_VERSION,
    sheets: [createEmptySheet()],
    entities: {},
    styles: {},
    borders: {}
  };
}

export function createEmptyWorkbook(): Workbook {
  return {
    rows: [],
    cols: [],
    cells: {},
    merges: {},
    mergeCellMap: {},
    width: 0,
    height: 0,
    clientWidth: DEFAULT_CELL_WIDTH + HEADER_WIDTH,
    clientHeight: DEFAULT_CELL_HEIGHT + HEADER_HEIGHT,
    offsetX: 0,
    offsetY: 0,
    scrollTop: 0,
    scrollLeft: 0,
    viewport: { top: 0, left: 0, bottom: 0, right: 0 },
    selection: {
      zones: [{ top: 0, left: 0, bottom: 0, right: 0 }],
      anchor: { col: 0, row: 0 }
    },
    activeCol: 0,
    activeRow: 0,
    activeXc: "A1",
    isEditing: false,
    currentContent: "",
    highlights: [],
    isSelectingRange: false,
    sheets: [],
    activeSheet: null as any
  };
}
