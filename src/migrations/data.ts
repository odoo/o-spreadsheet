import { DEFAULT_REVISION_ID } from "../constants";
import { UuidGenerator } from "../helpers/index";
import { isValidLocale } from "../helpers/locale";
import { StateUpdateMessage } from "../types/collaborative/transport_service";
import {
  CoreCommand,
  DEFAULT_LOCALE,
  ExcelSheetData,
  ExcelWorkbookData,
  SheetData,
  UID,
  WorkbookData,
} from "../types/index";
import { XlsxReader } from "../xlsx/xlsx_reader";
import { migrationStepRegistry } from "./migration_steps";

/**
 * This is the current state version number. It should be incremented each time
 * a breaking change is made in the way the state is handled, and an upgrade
 * function should be defined
 */
export const CURRENT_VERSION = 23;
const INITIAL_SHEET_ID = "Sheet1";

/**
 * This function tries to load anything that could look like a valid
 * workbookData object. It applies any migrations, if needed, and return a
 * current, complete workbookData object.
 *
 * It also ensures that there is at least one sheet.
 */
export function load(data?: any, verboseImport?: boolean): WorkbookData {
  if (!data) {
    return createEmptyWorkbookData();
  }
  console.debug("### Loading data ###");
  const start = performance.now();
  if (data["[Content_Types].xml"]) {
    const reader = new XlsxReader(data);
    data = reader.convertXlsx();
    if (verboseImport) {
      for (let parsingError of reader.warningManager.warnings.sort()) {
        console.warn(parsingError);
      }
    }
  }

  // apply migrations, if needed
  if ("version" in data) {
    if (data.version < CURRENT_VERSION) {
      console.debug("Migrating data from version", data.version);
      data = migrate(data);
    }
  }
  data = repairData(data);
  console.debug("Data loaded in", performance.now() - start, "ms");
  console.debug("###");
  return data;
}

// -----------------------------------------------------------------------------
// Migrations
// -----------------------------------------------------------------------------

function compareVersions(v1: string, v2: string): number {
  const version1 = v1.split(".").map(Number);
  const version2 = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(version1.length, version2.length); i++) {
    const part1 = version1[i] || 0;
    const part2 = version2[i] || 0;

    if (part1 > part2) {
      return 1;
    }
    if (part1 < part2) {
      return -1;
    }
  }

  return 0;
}

function migrate(data: any): WorkbookData {
  const start = performance.now();
  const steps = migrationStepRegistry
    .getAll()
    .sort((a, b) => compareVersions(a.versionFrom, b.versionFrom));
  const index = steps.findIndex((step) => step.versionFrom === data.version.toString());
  for (let i = index; i < steps.length; i++) {
    data = steps[i].migrate(data);
  }
  console.debug("Data migrated in", performance.now() - start, "ms");
  return data;
}

/**
 * This function is used to repair faulty data independently of the migration.
 */
export function repairData(data: Partial<WorkbookData>): Partial<WorkbookData> {
  data = forceUnicityOfFigure(data);
  data = setDefaults(data);
  return data;
}

/**
 * Force the unicity of figure ids accross sheets
 */
function forceUnicityOfFigure(data: Partial<WorkbookData>): Partial<WorkbookData> {
  if (data.uniqueFigureIds) {
    return data;
  }
  const figureIds = new Set();
  const uuidGenerator = new UuidGenerator();
  for (const sheet of data.sheets || []) {
    for (const figure of sheet.figures || []) {
      if (figureIds.has(figure.id)) {
        figure.id += uuidGenerator.uuidv4();
      }
      figureIds.add(figure.id);
    }
  }

  data.uniqueFigureIds = true;
  return data;
}

/**
 * sanity check: try to fix missing fields/corrupted state by providing
 * sensible default values
 */
function setDefaults(partialData: Partial<WorkbookData>): Partial<WorkbookData> {
  const data: WorkbookData = Object.assign(createEmptyWorkbookData(), partialData, {
    version: CURRENT_VERSION,
  });
  data.sheets = data.sheets
    ? data.sheets.map((s, i) =>
        Object.assign(createEmptySheet(`Sheet${i + 1}`, `Sheet${i + 1}`), s)
      )
    : [];

  if (data.sheets.length === 0) {
    data.sheets.push(createEmptySheet(INITIAL_SHEET_ID, "Sheet1"));
  }

  if (!isValidLocale(data.settings.locale)) {
    data.settings!.locale = DEFAULT_LOCALE;
  }

  return data;
}

/**
 * The goal of this function is to repair corrupted/wrong initial messages caused by
 * a bug.
 * The bug should obviously be fixed, but it's too late for existing spreadsheet.
 */
export function repairInitialMessages(
  data: Partial<WorkbookData>,
  initialMessages: StateUpdateMessage[]
): StateUpdateMessage[] {
  initialMessages = fixTranslatedSheetIds(data, initialMessages);
  initialMessages = dropCommands(initialMessages, "SORT_CELLS");
  initialMessages = dropCommands(initialMessages, "SET_DECIMAL");
  initialMessages = fixChartDefinitions(data, initialMessages);
  return initialMessages;
}

/**
 * When the workbook data is originally empty, a new one is generated on-the-fly.
 * A bug caused the sheet id to be non-deterministic. The sheet id was propagated in
 * commands.
 * This function repairs initial commands with a wrong sheetId.
 */
function fixTranslatedSheetIds(
  data: Partial<WorkbookData>,
  initialMessages: StateUpdateMessage[]
): StateUpdateMessage[] {
  // the fix is only needed when the workbook is generated on-the-fly
  if (Object.keys(data).length !== 0) {
    return initialMessages;
  }
  const sheetIds: UID[] = [];
  const messages: StateUpdateMessage[] = [];
  const fixSheetId = (cmd: CoreCommand) => {
    if (cmd.type === "CREATE_SHEET") {
      sheetIds.push(cmd.sheetId);
    } else if ("sheetId" in cmd && !sheetIds.includes(cmd.sheetId)) {
      return { ...cmd, sheetId: INITIAL_SHEET_ID };
    }
    return cmd;
  };
  for (const message of initialMessages) {
    if (message.type === "REMOTE_REVISION") {
      messages.push({
        ...message,
        commands: message.commands.map(fixSheetId),
      });
    } else {
      messages.push(message);
    }
  }
  return messages;
}

function dropCommands(initialMessages: StateUpdateMessage[], commandType: string) {
  const messages: StateUpdateMessage[] = [];
  for (const message of initialMessages) {
    if (message.type === "REMOTE_REVISION") {
      messages.push({
        ...message,
        commands: message.commands.filter((command) => command.type !== commandType),
      });
    } else {
      messages.push(message);
    }
  }
  return messages;
}

function fixChartDefinitions(data: Partial<WorkbookData>, initialMessages: StateUpdateMessage[]) {
  const messages: StateUpdateMessage[] = [];
  const map = {};
  for (const sheet of data.sheets || []) {
    sheet.figures?.forEach((figure) => {
      if (figure.tag === "chart") {
        // chart definition
        map[figure.id] = figure.data;
      }
    });
  }
  for (const message of initialMessages) {
    if (message.type === "REMOTE_REVISION") {
      const commands: CoreCommand[] = [];
      for (const cmd of message.commands) {
        let command = cmd;
        switch (cmd.type) {
          case "CREATE_CHART":
            map[cmd.id] = cmd.definition;
            break;
          case "UPDATE_CHART":
            if (!map[cmd.id]) {
              /** the chart does not exist on the map, it might have been created after a duplicate sheet.
               * We don't have access to the definition, so we skip the command.
               */
              console.log(`Fix chart definition: chart with id ${cmd.id} not found.`);
              continue;
            }
            const definition = map[cmd.id];
            const newDefinition = { ...definition, ...cmd.definition };
            command = { ...cmd, definition: newDefinition };
            map[cmd.id] = newDefinition;
            break;
        }
        commands.push(command);
      }
      messages.push({
        ...message,
        commands,
      });
    } else {
      messages.push(message);
    }
  }
  return messages;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
export function createEmptySheet(sheetId: UID, name: string): SheetData {
  return {
    id: sheetId,
    name,
    colNumber: 26,
    rowNumber: 100,
    cells: {},
    styles: {},
    formats: {},
    borders: {},
    cols: {},
    rows: {},
    merges: [],
    conditionalFormats: [],
    figures: [],
    tables: [],
    isVisible: true,
  };
}

export function createEmptyWorkbookData(sheetName = "Sheet1"): WorkbookData {
  return {
    version: CURRENT_VERSION,
    sheets: [createEmptySheet(INITIAL_SHEET_ID, sheetName)],
    styles: {},
    formats: {},
    borders: {},
    revisionId: DEFAULT_REVISION_ID,
    uniqueFigureIds: true,
    settings: { locale: DEFAULT_LOCALE },
    pivots: {},
    pivotNextId: 1,
    customTableStyles: {},
  };
}

export function createEmptyExcelSheet(sheetId: UID, name: string): ExcelSheetData {
  return {
    ...(createEmptySheet(sheetId, name) as Omit<ExcelSheetData, "charts">),
    charts: [],
    images: [],
    cellValues: {},
  };
}

export function createEmptyExcelWorkbookData(): ExcelWorkbookData {
  return {
    ...createEmptyWorkbookData(),
    sheets: [createEmptyExcelSheet(INITIAL_SHEET_ID, "Sheet1")],
  };
}
