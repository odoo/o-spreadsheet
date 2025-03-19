import { BACKGROUND_CHART_COLOR, FORMULA_REF_IDENTIFIER } from "../constants";
import { getItemId, getUniqueText, sanitizeSheetName } from "../helpers";
import { toXC } from "../helpers/coordinates";
import { getMaxObjectId } from "../helpers/pivot/pivot_helpers";
import { DEFAULT_TABLE_CONFIG } from "../helpers/table_presets";
import { overlap, toZone, zoneToXc } from "../helpers/zones";
import { Registry } from "../registries/registry";
import { CustomizedDataSet, DEFAULT_LOCALE, Format, WorkbookData, Zone } from "../types";
import { normalizeV9 } from "./legacy_tools";
import { WEEK_START } from "./locale";

export interface MigrationStep {
  migrate: (data: any) => any;
}

export const migrationStepRegistry = new Registry<MigrationStep>();

migrationStepRegistry
  .add("legacy-2", {
    // add the `activeSheet` field on data
    migrate(data: any): any {
      if (data.sheets && data.sheets[0]) {
        data.activeSheet = data.sheets[0].name;
      }
      return data;
    },
  })
  .add("legacy-3", {
    // add an id field in each sheet
    migrate(data: any): any {
      if (data.sheets && data.sheets.length) {
        for (let sheet of data.sheets) {
          sheet.id = sheet.id || sheet.name;
        }
      }
      return data;
    },
  })
  .add("legacy-4", {
    // activeSheet is now an id, not the name of a sheet
    migrate(data: any): any {
      if (data.sheets && data.activeSheet) {
        const activeSheet = data.sheets.find((s) => s.name === data.activeSheet);
        data.activeSheet = activeSheet.id;
      }
      return data;
    },
  })
  .add("legacy-5", {
    // add figures object in each sheets
    migrate(data: any): any {
      for (let sheet of data.sheets || []) {
        sheet.figures = sheet.figures || [];
      }
      return data;
    },
  })
  .add("legacy-6", {
    // normalize the content of the cell if it is a formula to avoid parsing all the formula that vary only by the cells they use
    migrate(data: any): any {
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
  })
  .add("legacy-7", {
    // transform chart data structure
    migrate(data: any): any {
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
  })
  .add("legacy-8", {
    // remove single quotes in sheet names
    migrate(data: any): any {
      const namesTaken: string[] = [];
      for (let sheet of data.sheets || []) {
        if (!sheet.name) {
          continue;
        }
        const oldName = sheet.name;
        sanitizeSheetName;
        const escapedName: string = sanitizeSheetName(oldName, "_");
        const newName = getUniqueText(escapedName, namesTaken, {
          compute: (name, i) => `${name}${i}`,
        });
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
  })
  .add("legacy-9", {
    // transform chart data structure with design attributes
    migrate(data: any): any {
      for (const sheet of data.sheets || []) {
        for (const chart of sheet.figures || []) {
          chart.data.background = BACKGROUND_CHART_COLOR;
          chart.data.verticalAxisPosition = "left";
          chart.data.legendPosition = "top";
          chart.data.stacked = false;
        }
      }
      return data;
    },
  })
  .add("legacy-10", {
    // de-normalize formula to reduce exported json size (~30%)
    migrate(data: any): any {
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
  })
  .add("legacy-11", {
    // normalize the formats of the cells
    migrate(data: any): any {
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
  })
  .add("legacy-12", {
    // Add isVisible to sheets
    migrate(data: any): any {
      for (let sheet of data.sheets || []) {
        sheet.isVisible = true;
      }
      return data;
    },
  })
  .add("legacy-12.5", {
    // Fix data filter duplication
    migrate(data: any): any {
      return fixOverlappingFilters(data);
    },
  })
  .add("legacy-13", {
    // Change Border description structure
    migrate(data: any): any {
      for (const borderId in data.borders) {
        const border = data.borders[borderId];
        for (const position in border) {
          if (Array.isArray(border[position])) {
            border[position] = {
              style: border[position][0],
              color: border[position][1],
            };
          }
        }
      }
      return data;
    },
  })
  .add("legacy-14", {
    // Add locale to spreadsheet settings
    migrate(data: any): any {
      if (!data.settings) {
        data.settings = {};
      }
      if (!data.settings.locale) {
        data.settings.locale = DEFAULT_LOCALE;
      }
      return data;
    },
  })
  .add("legacy-14.5", {
    // Fix datafilter duplication (post saas-17.1)
    migrate(data: any): any {
      return fixOverlappingFilters(data);
    },
  })
  .add("legacy-15", {
    // Rename filterTable to tables
    migrate(data: any): any {
      for (const sheetData of data.sheets || []) {
        sheetData.tables = sheetData.tables || sheetData.filterTables || [];
        delete sheetData.filterTables;
      }
      return data;
    },
  })
  .add("legacy-16", {
    // Add pivots
    migrate(data: any): any {
      if (!data.pivots) {
        data.pivots = {};
      }
      if (!data.pivotNextId) {
        data.pivotNextId = getMaxObjectId(data.pivots) + 1;
      }
      return data;
    },
  })
  .add("legacy-17", {
    // transform chart data structure (2)
    migrate(data: any): any {
      for (const sheet of data.sheets || []) {
        for (const f in sheet.figures || []) {
          const figure = sheet.figures[f];
          if ("title" in figure.data && typeof figure.data.title === "string") {
            figure.data.title = { text: figure.data.title };
          }
          const figureType = figure.data.type;
          if (!["line", "bar", "pie", "scatter", "waterfall", "combo"].includes(figureType)) {
            continue;
          }
          const { dataSets, ...newData } = sheet.figures[f].data;
          const newDataSets: CustomizedDataSet = dataSets.map((dataRange) => ({ dataRange }));
          newData.dataSets = newDataSets;
          sheet.figures[f].data = newData;
        }
      }
      return data;
    },
  })
  .add("legacy-18", {
    // Empty migration to allow external modules to add their own migration steps
    // before this version
    migrate(data: any): any {
      return data;
    },
  })
  .add("legacy-19", {
    // Change measures and dimensions `name` to `fieldName`
    // Add id to measures
    migrate(data: any): any {
      interface PivotCoreMeasureV17 {
        name: string;
        aggregator?: string;
      }
      interface PivotCoreDimensionV17 {
        name: string;
        order?: string;
        granularity?: string;
      }
      for (const pivot of Object.values(data.pivots || {}) as any) {
        pivot.measures = pivot.measures.map((measure: PivotCoreMeasureV17) => ({
          id: measure.name, //Do not set name + aggregator, to support old formulas
          fieldName: measure.name,
          aggregator: measure.aggregator,
        }));
        pivot.columns = pivot.columns.map((column: PivotCoreDimensionV17) => ({
          fieldName: column.name,
          order: column.order,
          granularity: column.granularity,
        }));
        pivot.rows = pivot.rows.map((row: PivotCoreDimensionV17) => ({
          fieldName: row.name,
          order: row.order,
          granularity: row.granularity,
        }));
      }
      return data;
    },
  })
  .add("legacy-20", {
    // "Add weekStart to locale",
    migrate(data: any): any {
      const locale = data.settings?.locale;
      if (locale) {
        const code = locale.code;
        locale.weekStart = WEEK_START[code] || 1; // Default to Monday;
      }
      return data;
    },
  })
  .add("legacy-21", {
    // group style and format into zones,
    migrate(data: any): any {
      for (const sheet of data.sheets || []) {
        sheet.styles = {};
        sheet.formats = {};
        sheet.borders = {};
        for (const xc in sheet.cells) {
          sheet.styles[xc] = sheet.cells[xc].style;
          sheet.formats[xc] = sheet.cells[xc].format;
          sheet.borders[xc] = sheet.cells[xc].border;
          delete sheet.cells[xc].style;
          delete sheet.cells[xc].format;
          delete sheet.cells[xc].border;
        }
      }
      return data;
    },
  })
  .add("legacy-22", {
    // "Add operator in gauge inflection points",
    migrate(data: WorkbookData): any {
      for (const sheet of data.sheets || []) {
        for (const figure of sheet.figures || []) {
          if (figure.tag !== "chart" || figure.data.type !== "gauge") {
            continue;
          }
          const gaugeData = figure.data;
          if (gaugeData?.sectionRule?.lowerInflectionPoint) {
            gaugeData.sectionRule.lowerInflectionPoint.operator = "<=";
          }
          if (gaugeData?.sectionRule?.upperInflectionPoint) {
            gaugeData.sectionRule.upperInflectionPoint.operator = "<=";
          }
        }
      }
      return data;
    },
  })
  .add("legacy-23", {
    // "tables are no longer inserted with filters by default",
    migrate(data: WorkbookData): any {
      for (const sheet of data.sheets || []) {
        for (const table of sheet.tables || []) {
          if (!table.config) {
            table.config = { ...DEFAULT_TABLE_CONFIG, hasFilters: true };
          }
        }
      }
      return data;
    },
  })
  .add("legacy-24", {
    // Flatten cell content: { content: "value" } -> "value"
    migrate(data: WorkbookData): any {
      for (const sheet of data.sheets || []) {
        for (const xc in sheet.cells) {
          const cell = sheet.cells[xc] as unknown as { content: string | undefined } | undefined;
          if (cell) {
            sheet.cells[xc] = cell.content;
          }
        }
      }
      return data;
    },
  })
  .add("legacy-25", {
    // Empty migration to allow odoo migrate pivot custom sorting.
    migrate(data: WorkbookData): any {
      return data;
    },
  })
  .add("18.3", {
    migrate(data) {
      return data;
    },
  });

function fixOverlappingFilters(data: any): any {
  for (let sheet of data.sheets || []) {
    let knownDataFilterZones: Zone[] = [];
    for (let filterTable of sheet.filterTables || []) {
      const zone = toZone(filterTable.range);
      // See commit message of https://github.com/odoo/o-spreadsheet/pull/3632 of more details
      const intersectZoneIndex = knownDataFilterZones.findIndex((knownZone) =>
        overlap(knownZone, zone)
      );
      if (intersectZoneIndex !== -1) {
        knownDataFilterZones[intersectZoneIndex] = zone;
      } else {
        knownDataFilterZones.push(zone);
      }
    }

    sheet.filterTables = knownDataFilterZones.map((zone) => ({
      range: zoneToXc(zone),
    }));
  }
  return data;
}
