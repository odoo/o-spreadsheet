import { toString } from "@odoo/o-spreadsheet-engine/functions/helpers";
import { generatePivotArgs } from "@odoo/o-spreadsheet-engine/helpers/pivot/pivot_helpers";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useState } from "@odoo/owl";
import { FunctionResultObject, Maybe, SpreadsheetPivotTable, UID } from "../..";
import { formatValue } from "../../helpers";
import { Checkbox } from "../side_panel/components/checkbox/checkbox";

interface PivotDialogColumn {
  formula: string;
  value: string;
  isMissing: boolean;
  style?: string;
  span: number;
}

interface PivotDialogRow {
  formula: string;
  value: string;
  isMissing: boolean;
  style?: string;
}

interface PivotDialogValue {
  formula: string;
  value: string;
  isMissing: boolean;
}

interface Props {
  pivotId: UID;
  onCellClicked: (formula: string) => void;
}

interface State {
  showMissingValuesOnly: boolean;
}

interface TableData {
  columns: PivotDialogColumn[][];
  rows: PivotDialogRow[];
  values: PivotDialogValue[][];
}

export class PivotHTMLRenderer extends Component<Props, SpreadsheetChildEnv> {
  static template = "o_spreadsheet.PivotHTMLRenderer";
  static components = { Checkbox };
  static props = {
    pivotId: String,
    onCellClicked: Function,
  };

  private pivot = this.env.model.getters.getPivot(this.props.pivotId);
  data: TableData = {
    columns: [],
    rows: [],
    values: [],
  };
  private state: State = useState({
    showMissingValuesOnly: false,
  });

  setup() {
    const table = this.pivot.getExpandedTableStructure();
    const formulaId = this.env.model.getters.getPivotFormulaId(this.props.pivotId);
    this.data = {
      columns: this._buildColHeaders(formulaId, table),
      rows: this._buildRowHeaders(formulaId, table),
      values: this._buildValues(formulaId, table),
    };
  }

  get tracker() {
    return this.env.model.getters.getPivotPresenceTracker(this.props.pivotId);
  }

  // ---------------------------------------------------------------------
  // Missing values building
  // ---------------------------------------------------------------------

  /**
   * Retrieve the data to display in the Pivot Table
   * In the case when showMissingValuesOnly is false, the returned value
   * is the complete data
   * In the case when showMissingValuesOnly is true, the returned value is
   * the data which contains only missing values in the rows and cols. In
   * the rows, we also return the parent rows of rows which contains missing
   * values, to give context to the user.
   *
   */
  getTableData(): TableData {
    if (!this.state.showMissingValuesOnly) {
      return this.data;
    }
    const colIndexes = this.getColumnsIndexes();
    const rowIndexes = this.getRowsIndexes();
    const columns = this.buildColumnsMissing(colIndexes);
    const rows = this.buildRowsMissing(rowIndexes);
    const values = this.buildValuesMissing(colIndexes, rowIndexes);
    return { columns, rows, values };
  }

  /**
   * Retrieve the parents of the given row
   * ex:
   *  Australia
   *    January
   *    February
   * The parent of "January" is "Australia"
   */
  private addRecursiveRow(index: number): number[] {
    const rows = this.pivot.getExpandedTableStructure().rows;
    const row = [...rows[index].values];
    if (row.length <= 1) {
      return [index];
    }
    row.pop();
    const parentRowIndex = rows.findIndex((r) => JSON.stringify(r.values) === JSON.stringify(row));
    return [index].concat(this.addRecursiveRow(parentRowIndex));
  }
  /**
   * Create the columns to be used, based on the indexes of the columns in
   * which a missing value is present
   *
   */
  private buildColumnsMissing(indexes: number[]): PivotDialogColumn[][] {
    // columnsMap explode the columns in an array of array of the same
    // size with the index of each column, repeated 'span' times.
    // ex:
    //  | A     | B |
    //  | 1 | 2 | 3 |
    // => [
    //      [0, 0, 1]
    //      [0, 1, 2]
    //    ]
    const columnsMap: number[][] = [];
    for (const column of this.data.columns) {
      const columnMap: number[] = [];
      for (const index in column) {
        for (let i = 0; i < column[index].span; i++) {
          columnMap.push(parseInt(index, 10));
        }
      }
      columnsMap.push(columnMap);
    }
    // Remove the columns that are not present in indexes
    for (let i = columnsMap[columnsMap.length - 1].length; i >= 0; i--) {
      if (!indexes.includes(i)) {
        for (const columnMap of columnsMap) {
          columnMap.splice(i, 1);
        }
      }
    }
    // Build the columns
    const columns: PivotDialogColumn[][] = [];
    for (const mapIndex in columnsMap) {
      const column: PivotDialogColumn[] = [];
      let index: number | undefined = undefined;
      let span = 1;
      for (let i = 0; i < columnsMap[mapIndex].length; i++) {
        if (index !== columnsMap[mapIndex][i]) {
          if (index !== undefined) {
            column.push(Object.assign({}, this.data.columns[mapIndex][index], { span }));
          }
          index = columnsMap[mapIndex][i];
          span = 1;
        } else {
          span++;
        }
      }
      if (index !== undefined) {
        column.push(Object.assign({}, this.data.columns[mapIndex][index], { span }));
      }
      columns.push(column);
    }
    return columns;
  }
  /**
   * Create the rows to be used, based on the indexes of the rows in
   * which a missing value is present.
   */
  private buildRowsMissing(indexes: number[]): PivotDialogRow[] {
    return indexes.map((index) => this.data.rows[index]);
  }
  /**
   * Create the value to be used, based on the indexes of the columns and
   * rows in which a missing value is present.
   */
  private buildValuesMissing(colIndexes: number[], rowIndexes: number[]): PivotDialogValue[][] {
    const values: PivotDialogValue[][] = colIndexes.map(() => []);
    for (const row of rowIndexes) {
      for (const col in colIndexes) {
        values[col].push(this.data.values[colIndexes[col]][row]);
      }
    }
    return values;
  }
  private getColumnsIndexes(): number[] {
    const indexes: Set<number> = new Set();
    for (let i = 0; i < this.data.columns.length; i++) {
      const exploded: PivotDialogColumn[] = [];
      for (let y = 0; y < this.data.columns[i].length; y++) {
        for (let x = 0; x < this.data.columns[i][y].span; x++) {
          exploded.push(this.data.columns[i][y]);
        }
      }
      for (let y = 0; y < exploded.length; y++) {
        if (exploded[y].isMissing) {
          indexes.add(y);
        }
      }
    }
    for (let i = 0; i < this.data.columns[this.data.columns.length - 1].length; i++) {
      const values = this.data.values[i];
      if (values.find((x) => x.isMissing)) {
        indexes.add(i);
      }
    }
    return Array.from(indexes).sort((a, b) => a - b);
  }
  private getRowsIndexes(): number[] {
    const rowIndexes: Set<number> = new Set();
    for (let i = 0; i < this.data.rows.length; i++) {
      if (this.data.rows[i].isMissing) {
        rowIndexes.add(i);
      }
      for (const col of this.data.values) {
        if (col[i].isMissing) {
          this.addRecursiveRow(i).forEach((x) => rowIndexes.add(x));
        }
      }
    }
    return Array.from(rowIndexes).sort((a, b) => a - b);
  }

  // ---------------------------------------------------------------------
  // Data table creation
  // ---------------------------------------------------------------------

  _buildColHeaders(id: UID, table: SpreadsheetPivotTable): PivotDialogColumn[][] {
    const headers: PivotDialogColumn[][] = [];
    for (const row of table.columns) {
      const current: PivotDialogColumn[] = [];
      for (const cell of row) {
        const args: Maybe<FunctionResultObject>[] = [];
        for (let i = 0; i < cell.fields.length; i++) {
          args.push({ value: cell.fields[i] }, { value: cell.values[i] });
        }
        const domain = this.pivot.parseArgsToPivotDomain(args);
        const locale = this.env.model.getters.getLocale();
        if (domain.at(-1)?.field === "measure") {
          const valueAndFormat = this.pivot.getPivotMeasureValue(
            toString(domain.at(-1)!.value),
            domain
          );
          current.push({
            formula: `=PIVOT.HEADER(${generatePivotArgs(id, domain).join(",")})`,
            value: formatValue(valueAndFormat, locale),
            span: cell.width,
            isMissing: !this.tracker?.isHeaderPresent(domain),
          });
        } else {
          const valueAndFormat = this.pivot.getPivotHeaderValueAndFormat(domain);
          current.push({
            formula: `=PIVOT.HEADER(${generatePivotArgs(id, domain).join(",")})`,
            value: formatValue(valueAndFormat, locale),
            span: cell.width,
            isMissing: !this.tracker?.isHeaderPresent(domain),
          });
        }
      }
      headers.push(current);
    }
    const last = headers[headers.length - 1];
    headers[headers.length - 1] = last.map((cell) => {
      if (!cell.isMissing) {
        cell.style = "color: #756f6f;";
      }
      return cell;
    });
    return headers;
  }
  _buildRowHeaders(id: UID, table: SpreadsheetPivotTable): PivotDialogRow[] {
    const headers: PivotDialogRow[] = [];
    for (const row of table.rows) {
      const args: Maybe<FunctionResultObject>[] = [];
      for (let i = 0; i < row.fields.length; i++) {
        args.push({ value: row.fields[i] }, { value: row.values[i] });
      }
      const domain = this.pivot.parseArgsToPivotDomain(args);
      const valueAndFormat = this.pivot.getPivotHeaderValueAndFormat(domain);
      const locale = this.env.model.getters.getLocale();
      const cell: PivotDialogRow = {
        formula: `=PIVOT.HEADER(${generatePivotArgs(id, domain).join(",")})`,
        value: formatValue(valueAndFormat, locale),
        isMissing: !this.tracker?.isHeaderPresent(domain),
      };
      if (row.indent > 1) {
        cell.style = `padding-left: ${row.indent - 1 * 10}px`;
      }
      headers.push(cell);
    }
    return headers;
  }
  _buildValues(id: UID, table: SpreadsheetPivotTable): PivotDialogValue[][] {
    const values: PivotDialogValue[][] = [];
    for (const col of table.columns.at(-1) || []) {
      const current: PivotDialogValue[] = [];
      const measure = toString(col.values[col.values.length - 1]);
      for (const row of table.rows) {
        const args: Maybe<FunctionResultObject>[] = [];
        for (let i = 0; i < row.fields.length; i++) {
          args.push({ value: row.fields[i] }, { value: row.values[i] });
        }
        for (let i = 0; i < col.fields.length - 1; i++) {
          args.push({ value: col.fields[i] }, { value: col.values[i] });
        }
        const domain = this.pivot.parseArgsToPivotDomain(args);
        const valueAndFormat = this.pivot.getPivotCellValueAndFormat(measure, domain);
        const locale = this.env.model.getters.getLocale();
        current.push({
          formula: `=PIVOT.VALUE(${generatePivotArgs(id, domain, measure).join(",")})`,
          value: formatValue(valueAndFormat, locale),
          isMissing: !this.tracker?.isValuePresent(measure, domain),
        });
      }
      values.push(current);
    }
    return values;
  }
}
