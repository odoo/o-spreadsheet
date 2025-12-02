import { DEFAULT_REVISION_ID } from "../constants";
import { UuidGenerator } from "../helpers";
import { isValidLocale } from "../helpers/locale";
import { getDuplicateSheetName, getNextSheetName } from "../helpers/sheet";
import { StateUpdateMessage } from "../types/collaborative/transport_service";
import { CoreCommand } from "../types/commands";
import { DEFAULT_LOCALE } from "../types/locale";
import { UID } from "../types/misc";
import { ExcelSheetData, ExcelWorkbookData, SheetData, WorkbookData } from "../types/workbook_data";
import { XlsxReader } from "../xlsx/xlsx_reader";
import { migrationStepRegistry } from "./migration_steps";

/**
 * Represents the current version of the exported JSON data.
 * A new version must be created whenever a breaking change is introduced in the export format.
 * To define a new version, add an upgrade function to `migrationStepRegistry`.
 */
export function getCurrentVersion() {
  return getSortedVersions().at(-1)!;
}

function getSortedVersions() {
  return migrationStepRegistry.getKeys().sort(compareVersions);
}

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
      for (const parsingError of reader.warningManager.warnings.sort()) {
        console.warn(parsingError);
      }
    }
  }

  // apply migrations, if needed
  if ("version" in data) {
    if (isLegacyVersioning(data)) {
      data.version = LEGACY_VERSION_MAPPING[data.version];
    }
    if (data.version !== getCurrentVersion()) {
      console.debug("Migrating data from version", data.version);
      data = migrate(data);
    }
  }
  data = repairData(data);
  console.debug("Data loaded in", performance.now() - start, "ms");
  console.debug("###");
  return data;
}

const LEGACY_VERSION_MAPPING = {
  25: "18.2",
  24: "18.1.1",
  23: "18.1",
  22: "18.0.4",
  21: "18.0.3",
  20: "18.0.2",
  19: "18.0.1",
  18: "18.0",
  17: "17.4",
  16: "17.3",
  15: "17.2",
  "14.5": "16.4.1",
  14: "16.4",
  13: "16.3",
  "12.5": "15.4.1",
  12: "15.4",

  // not accurate starting at this point
  11: "0.10",
  10: "0.9",
  9: "0.8",
  8: "0.7",
  7: "0.6",
  6: "0.5",
  5: "0.4",
  4: "0.3",
  3: "0.2",
  2: "0.1",
  1: "0",
};

/**
 * Versions used to be an incremented integer.
 * This was later changed to match release versions (matching Odoo release names).
 */
function isLegacyVersioning(data: { version: number | string }): boolean {
  return typeof data.version === "number";
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
  const versions = getSortedVersions();
  const index = versions.findIndex((v) => v === data.version);
  for (let i = index + 1; i < versions.length; i++) {
    const nextVersion = versions[i];
    data = migrationStepRegistry.get(nextVersion).migrate(data);
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
  const chartIds = new Set();
  const uuidGenerator = new UuidGenerator();
  for (const sheet of data.sheets || []) {
    for (const figure of sheet.figures || []) {
      if (figureIds.has(figure.id)) {
        figure.id += uuidGenerator.smallUuid();
      }
      figureIds.add(figure.id);

      if (figure.tag === "chart") {
        if (chartIds.has(figure.data?.chartId)) {
          figure.data.chartId += uuidGenerator.smallUuid();
        }
        chartIds.add(figure.data?.chartId);
      }
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
    version: getCurrentVersion(),
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
  initialMessages = fixFigureOffset(data, initialMessages);
  initialMessages = fixTranslatedDuplicateSheetName(data, initialMessages);
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
  /**
   * Revisions created after version 18.5.1 contain the full chart definition in the command
   * if the data was alreay updated to 18.5.1, then those older revision cannot (by definition) be reaplied
   * and should not be replayed.
   * FIXME: every command should be versionned when upgraded to allow finer tuning.
   */
  if (!data.version || compareVersions(String(data.version), "18.5.1") >= 0) {
    return initialMessages;
  }
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
            map[cmd.chartId] = cmd.definition;
            break;
          case "UPDATE_CHART":
            if (!map[cmd.chartId]) {
              /** the chart does not exist on the map, it might have been created after a duplicate sheet.
               * We don't have access to the definition, so we skip the command.
               */
              console.log(`Fix chart definition: chart with id ${cmd.chartId} not found.`);
              continue;
            }
            const definition = map[cmd.chartId];
            const newDefinition = { ...definition, ...cmd.definition };
            command = { ...cmd, definition: newDefinition };
            map[cmd.chartId] = newDefinition;
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

function fixFigureOffset(
  data: Partial<WorkbookData>,
  messages: StateUpdateMessage[]
): StateUpdateMessage[] {
  const offset = {};
  for (const sheet of data.sheets || []) {
    sheet.figures?.forEach((figure) => {
      offset[figure.id] = figure.offset;
    });
  }

  for (const message of messages) {
    if (message.type === "REMOTE_REVISION") {
      for (const cmd of message.commands) {
        switch (cmd.type) {
          case "UPDATE_FIGURE":
            if (cmd.offset) {
              if (cmd.offset.x === undefined) {
                cmd.offset.x = offset[cmd.figureId] || 0;
              }
              if (cmd.offset.y === undefined) {
                cmd.offset.y = offset[cmd.figureId] || 0;
              }
              offset[cmd.figureId] = offset;
            }
            break;
          case "CREATE_IMAGE":
          case "CREATE_CHART":
          case "CREATE_FIGURE":
            offset[cmd.figureId] = cmd.offset;
            break;
        }
      }
    }
  }
  return messages;
}

function fixTranslatedDuplicateSheetName(
  data: Partial<WorkbookData>,
  initialMessages: StateUpdateMessage[]
): StateUpdateMessage[] {
  const sheetNames = {};
  for (const sheet of data.sheets || []) {
    sheetNames[sheet.id] = sheet.name;
  }
  const messages: StateUpdateMessage[] = [];
  for (const message of initialMessages) {
    if (message.type === "REMOTE_REVISION") {
      const commands: CoreCommand[] = [];
      for (const cmd of message.commands) {
        switch (cmd.type) {
          case "DUPLICATE_SHEET":
            cmd.sheetNameTo =
              cmd.sheetNameTo ??
              getDuplicateSheetName(sheetNames[cmd.sheetId], Object.values(sheetNames));
            break;
          case "CREATE_SHEET":
            sheetNames[cmd.sheetId] = cmd.name || getNextSheetName(Object.values(sheetNames));
            break;
          case "RENAME_SHEET":
            sheetNames[cmd.sheetId] = cmd.newName || getNextSheetName(Object.values(sheetNames));

            break;
        }
        commands.push(cmd);
      }
      messages.push({
        ...message,
        commands,
      });
    } else {
      messages.push(message);
    }
  }
  return initialMessages;
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
    dataValidationRules: [],
    figures: [],
    tables: [],
    isVisible: true,
  };
}

export function createEmptyWorkbookData(sheetName = "Sheet1"): WorkbookData {
  return {
    version: getCurrentVersion(),
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
    namedRanges: {},
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
