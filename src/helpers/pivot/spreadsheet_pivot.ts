import { ModelConfig } from "../../model";
import { _t } from "../../translation";
import { FPayload, Getters, Zone } from "../../types";
import { EvaluationError } from "../../types/errors";
import {
  PivotDimension,
  PivotFields,
  PivotMeasure,
  SPTableRow,
  SpreadsheetPivotCoreDefinition,
} from "../../types/pivot";
import { RangeImpl } from "../range";
import { isDateField } from "./pivot_helpers";
import { PivotParams } from "./pivot_registry";
import { Pivot } from "./pivot_runtime";
import { PivotRuntimeDefinition } from "./pivot_runtime_definition";
import { SpreadsheetPivotTable } from "./spreadsheet_pivot_table";

interface SpreadsheetPivotParams extends PivotParams {
  definition: SpreadsheetPivotCoreDefinition;
}

export class SpreadsheetPivotRuntimeDefinition extends PivotRuntimeDefinition {
  readonly range: RangeImpl;

  constructor(definition: SpreadsheetPivotCoreDefinition, fields: PivotFields, getters: Getters) {
    super(definition, fields);
    this.range = getters.getRangeFromSheetXC(definition.sheetId, definition.range);
  }
}

export class SpreadsheetPivot implements Pivot<SpreadsheetPivotRuntimeDefinition> {
  definition: SpreadsheetPivotRuntimeDefinition;
  private fields: PivotFields;
  private getters: Getters;
  private table: SpreadsheetPivotTable | undefined;

  constructor(custom: ModelConfig["custom"], params: SpreadsheetPivotParams) {
    this.getters = params.getters;
    const range = this.getters.getRangeFromSheetXC(
      params.definition.sheetId,
      params.definition.range
    );
    this.fields = this.extractFieldsFromRange(range);
    this.definition = new SpreadsheetPivotRuntimeDefinition(
      params.definition,
      this.fields,
      this.getters
    );
  }

  getMeasure(name: string): PivotMeasure {
    //TODOPRO Same implementation as OdooPivot
    const measures = this.definition.measures;
    const measure = measures.find((m) => m.name === name);
    if (!measure) {
      throw new EvaluationError(_t("Field %s does not exist", name));
    }
    return measure;
  }

  computePivotHeaderValue(domain: (string | number)[]): string | number | boolean {
    throw new Error("Method not implemented.");
  }

  getLastPivotGroupValue(domain: (string | number)[]): string | number | boolean {
    throw new Error("Method not implemented.");
  }

  getTableStructure(): SpreadsheetPivotTable {
    if (!this.table) {
      this.table = this.buildTable();
    }
    return this.table;
  }

  getPivotCellValue(measure: string, domain: (string | number)[]): string | number | boolean {
    throw new Error("Method not implemented.");
  }

  getPivotFieldFormat(name: string): string {
    //TODOPRO Change signature to return undefined
    const { field } = this.parseGroupField(name, this.fields);
    switch (field.type) {
      case "integer":
        return "0";
      case "float":
        return "#,##0.00";
      case "monetary":
        return "#,##0.00";
      case "date":
      case "datetime": {
        throw new Error("Not yet supported"); //TODOPRO
      }
      default:
        //@ts-ignore TODOPRO see above
        return undefined;
    }
  }

  getPivotMeasureFormat(name: string): string | undefined {
    throw new Error("Method not implemented.");
  }

  assertIsValid({ throwOnError }: { throwOnError: boolean }): FPayload | undefined {
    return undefined; //TODOPRO Check error in ranges
  }

  async load() {
    return;
  }

  getFields(): PivotFields | undefined {
    return this.fields;
  }

  isLoadedAndValid(): boolean {
    return true; //TODOPRO Check error in ranges
  }

  getPossibleFieldValues(groupBy: string): { value: string | number | boolean; label: string }[] {
    throw new Error("Method not implemented.");
  }

  private extractFieldsFromRange(range: RangeImpl): PivotFields {
    const zone: Zone = {
      top: range.zone.top,
      left: range.zone.left,
      bottom: range.zone.top,
      right: range.zone.right,
    };
    const cells = this.getters.getEvaluatedCellsInZone(range.sheetId, zone);
    const fields: PivotFields = {};
    for (const cell of cells) {
      const field = cell.value?.toString();
      if (field) {
        const name = this.findName(field, fields);
        fields[name] = {
          name,
          type: cell.type,
          string: name,
          store: true,
          groupable: true,
        };
      }
    }
    return fields;
  }

  /**
   * Take cares of double names
   */
  private findName(name: string, fields: PivotFields) {
    let increment = 1;
    const initialName = name;
    while (name in fields) {
      name = `${initialName}${++increment}`;
    }
    return name;
  }

  private extractRows(initial: unknown) {
    const totalRows: SPTableRow[] = [];
    let values = initial;
    let rows = [];
    for (const row of this.definition.rows) {
      ({ values, rows } = this.extractRow(values, row));
      totalRows.concat(rows);
    }
    return totalRows;
  }

  private extractRow(values: unknown, row: PivotDimension) {
    const rows = [];
    return {
      values,
      rows,
    };
  }

  private extractFromRange(range: RangeImpl) {
    const { rows } = this.definition;
    const rowTitle = rows.length > 0 ? rows[0].displayName : "";
    const values: unknown[] = [];
    for (let row = range.zone.top + 1; row <= range.zone.bottom; row++) {
      const zone = { top: row, bottom: row, left: range.zone.left, right: range.zone.right };
      const cells = this.getters.getEvaluatedCellsInZone(range.sheetId, zone);
      const obj = {};
      for (const index in cells) {
        const cell = cells[index];
        obj[Object.keys(this.fields)[index]] = cell.value;
      }
      values.push(obj);
    }
    console.log(values);

    return {
      cols: [[]],
      rows: [],
      measures: [],
      rowTitle,
    };
  }

  private buildTable(): SpreadsheetPivotTable {
    const { cols, rows, measures, rowTitle } = this.extractFromRange(this.definition.range);
    return new SpreadsheetPivotTable(cols, rows, measures, rowTitle);
  }

  private parseGroupField(groupFieldString: string, allFields: PivotFields) {
    //TODOPRO Take it from odoo
    let fieldName = groupFieldString;
    let granularity: string | undefined = undefined;
    const index = groupFieldString.indexOf(":");
    if (index !== -1) {
      fieldName = groupFieldString.slice(0, index);
      granularity = groupFieldString.slice(index + 1);
    }
    const isPositional = fieldName.startsWith("#");
    fieldName = isPositional ? fieldName.substring(1) : fieldName;
    const field = allFields[fieldName];
    if (field === undefined) {
      throw new EvaluationError(_t("Field %s does not exist", fieldName));
    }
    const dimensionWithGranularity = granularity ? `${fieldName}:${granularity}` : fieldName;
    if (isDateField(field)) {
      granularity = granularity || "month";
    }
    return {
      isPositional,
      field,
      granularity,
      dimensionWithGranularity,
    };
  }
}
