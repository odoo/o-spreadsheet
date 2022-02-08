import {
  BACKGROUND_CHART_COLOR,
  DEFAULT_REVISION_ID,
  FORBIDDEN_IN_EXCEL_REGEX,
  FORMULA_REF_IDENTIFIER,
} from "../constants";
import { getItemId, toXC, toZone } from "../helpers/index";
import { _t } from "../translation";
import { ExcelSheetData, ExcelWorkbookData, Format, SheetData, WorkbookData } from "../types/index";
import { normalizeV9 } from "./legacy_tools";

/**
 * This is the current state version number. It should be incremented each time
 * a breaking change is made in the way the state is handled, and an upgrade
 * function should be defined
 */
export const CURRENT_VERSION = 11;

/**
 * This function tries to load anything that could look like a valid
 * workbookData object. It applies any migrations, if needed, and return a
 * current, complete workbookData object.
 *
 * It also ensures that there is at least one sheet.
 */
export function load(data?: any): WorkbookData {
  if (!data) {
    return createEmptyWorkbookData();
  }
  data = JSON.parse(JSON.stringify(data));

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
  description: string;
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
    description: "add the `activeSheet` field on data",
    from: 1,
    to: 2,
    applyMigration(data: any): any {
      if (data.sheets && data.sheets[0]) {
        data.activeSheet = data.sheets[0].name;
      }
      return data;
    },
  },
  {
    description: "add an id field in each sheet",
    from: 2,
    to: 3,
    applyMigration(data: any): any {
      if (data.sheets && data.sheets.length) {
        for (let sheet of data.sheets) {
          sheet.id = sheet.id || sheet.name;
        }
      }
      return data;
    },
  },
  {
    description: "activeSheet is now an id, not the name of a sheet",
    from: 3,
    to: 4,
    applyMigration(data: any): any {
      if (data.sheets && data.activeSheet) {
        const activeSheet = data.sheets.find((s) => s.name === data.activeSheet);
        data.activeSheet = activeSheet.id;
      }
      return data;
    },
  },
  {
    description: "add figures object in each sheets",
    from: 4,
    to: 5,
    applyMigration(data: any): any {
      for (let sheet of data.sheets || []) {
        sheet.figures = sheet.figures || [];
      }
      return data;
    },
  },
  {
    description:
      "normalize the content of the cell if it is a formula to avoid parsing all the formula that vary only by the cells they use",
    from: 5,
    to: 6,
    applyMigration(data: any): any {
      for (let sheet of data.sheets || []) {
        for (let xc in sheet.cells || []) {
          const cell = sheet.cells[xc];
          if (cell.content && cell.content.startsWith("=")) {
            cell.formula = normalizeV9(cell.content);
          }
        }
      }
      return data;
    },
  },
  {
    description: "transform chart data structure",
    from: 6,
    to: 7,
    applyMigration(data: any): any {
      for (let sheet of data.sheets || []) {
        for (let f in sheet.figures || []) {
          const { dataSets, ...newData } = sheet.figures[f].data;
          const newDataSets: string[] = [];
          for (let ds of dataSets) {
            if (ds.labelCell) {
              const dataRange = toZone(ds.dataRange);
              const newRange = ds.labelCell + ":" + toXC(dataRange.right, dataRange.bottom);
              newDataSets.push(newRange);
            } else {
              newDataSets.push(ds.dataRange);
            }
          }
          newData.dataSetsHaveTitle = Boolean(dataSets[0].labelCell);
          newData.dataSets = newDataSets;
          sheet.figures[f].data = newData;
        }
      }
      return data;
    },
  },
  {
    description: "remove single quotes in sheet names",
    from: 7,
    to: 8,
    applyMigration(data: any): any {
      const namesTaken: string[] = [];
      const globalForbiddenInExcel = new RegExp(FORBIDDEN_IN_EXCEL_REGEX, "g");
      for (let sheet of data.sheets || []) {
        if (!sheet.name) {
          continue;
        }
        const oldName = sheet.name;
        const escapedName: string = oldName.replace(globalForbiddenInExcel, "_");
        let i = 1;
        let newName = escapedName;
        while (namesTaken.includes(newName)) {
          newName = `${escapedName}${i}`;
          i++;
        }
        sheet.name = newName;
        namesTaken.push(newName);

        const replaceName = (str: string | undefined) => {
          if (str === undefined) {
            return str;
          }
          // replaceAll is only available in next Typescript version
          let newString: string = str.replace(oldName, newName);
          let currentString: string = str;
          while (currentString !== newString) {
            currentString = newString;
            newString = currentString.replace(oldName, newName);
          }
          return currentString;
        };
        //cells
        for (let xc in sheet.cells) {
          const cell = sheet.cells[xc];
          if (cell.formula) {
            cell.formula.dependencies = cell.formula.dependencies.map(replaceName);
          }
        }
        //charts
        for (let figure of sheet.figures || []) {
          if (figure.type === "chart") {
            const dataSets = figure.data.dataSets.map(replaceName);
            const labelRange = replaceName(figure.data.labelRange);
            figure.data = { ...figure.data, dataSets, labelRange };
          }
        }
        //ConditionalFormats
        for (let cf of sheet.conditionalFormats || []) {
          cf.ranges = cf.ranges.map(replaceName);
          for (const thresholdName of [
            "minimum",
            "maximum",
            "midpoint",
            "upperInflectionPoint",
            "lowerInflectionPoint",
          ] as const) {
            if (cf.rule[thresholdName]?.type === "formula") {
              cf.rule[thresholdName].value = replaceName(cf.rule[thresholdName].value);
            }
          }
        }
      }
      return data;
    },
  },
  {
    description: "transform chart data structure with design attributes",
    from: 8,
    to: 9,
    applyMigration(data: any): any {
      for (const sheet of data.sheets || []) {
        for (const chart of sheet.figures || []) {
          chart.data.background = BACKGROUND_CHART_COLOR;
          chart.data.verticalAxisPosition = "left";
          chart.data.legendPosition = "top";
          chart.data.stackedBar = false;
        }
      }
      return data;
    },
  },
  {
    description: "de-normalize formula to reduce exported json size (~30%)",
    from: 9,
    to: 10,
    applyMigration(data: any): any {
      for (let sheet of data.sheets || []) {
        for (let xc in sheet.cells || []) {
          const cell = sheet.cells[xc];
          if (cell.formula) {
            let { text, dependencies } = cell.formula;
            for (let [index, d] of Object.entries(dependencies)) {
              const stringPosition = `\\${FORMULA_REF_IDENTIFIER}${index}\\${FORMULA_REF_IDENTIFIER}`;
              text = text.replace(new RegExp(stringPosition, "g"), d);
            }
            cell.content = text;
            delete cell.formula;
          }
        }
      }
      return data;
    },
  },
  {
    description: "normalize the formats of the cells",
    from: 10,
    to: 11,
    applyMigration(data: any): any {
      const formats: { [formatId: number]: Format } = {};
      for (let sheet of data.sheets || []) {
        for (let xc in sheet.cells || []) {
          const cell = sheet.cells[xc];
          if (cell.format) {
            cell.format = getItemId(cell.format, formats);
          }
        }
      }
      data.formats = formats;
      return data;
    },
  },
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function createEmptySheet(name: string = _t("Sheet") + 1): SheetData {
  return {
    id: name,
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
    sheets: [createEmptySheet(_t("Sheet") + 1)],
    entities: {},
    styles: {},
    formats: {},
    borders: {},
    revisionId: DEFAULT_REVISION_ID,
  };
  return data;
}

function createEmptyExcelSheet(name: string = _t("Sheet") + 1): ExcelSheetData {
  return {
    ...(createEmptySheet(name) as Omit<ExcelSheetData, "charts">),
    charts: [],
  };
}

export function createEmptyExcelWorkbookData(): ExcelWorkbookData {
  return {
    ...createEmptyWorkbookData(),
    sheets: [createEmptyExcelSheet(_t("Sheet") + 1)],
  };
}
