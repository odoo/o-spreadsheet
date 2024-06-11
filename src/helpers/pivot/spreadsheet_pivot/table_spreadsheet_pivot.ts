import { PivotDomain, PivotTableCell, PivotTableColumn, PivotTableRow } from "../../../types/pivot";

/**
 * Class used to ease the construction of a pivot table.
 * Let's consider the following example, with:
 * - columns groupBy: [sales_team, create_date]
 * - rows groupBy: [continent, city]
 * - measures: [revenues]
 * _____________________________________________________________________________________|   ----|
 * |                |   Sale Team 1             |  Sale Team 2            |             |       |
 * |                |___________________________|_________________________|_____________|       |
 * |                |   May 2020   | June 2020  |  May 2020  | June 2020  |   Total     |       |<---- `cols`
 * |                |______________|____________|____________|____________|_____________|       |   ----|
 * |                |   Revenues   |  Revenues  |  Revenues  |  Revenues  |   Revenues  |       |       |<--- `measureRow`
 * |________________|______________|____________|____________|____________|_____________|   ----|   ----|
 * |Europe          |     25       |     35     |     40     |     30     |     65      |   ----|
 * |    Brussels    |      0       |     15     |     30     |     30     |     30      |       |
 * |    Paris       |     25       |     20     |     10     |     0      |     35      |       |
 * |North America   |     60       |     75     |            |            |     60      |       |<---- `body`
 * |    Washington  |     60       |     75     |            |            |     60      |       |
 * |Total           |     85       |     110    |     40     |     30     |     125     |       |
 * |________________|______________|____________|____________|____________|_____________|   ----|
 *
 * |                |
 * |----------------|
 *         |
 *         |
 *       `rows`
 *
 * `rows` is an array of cells, each cells contains the indent level, the fields used for the group by and the values for theses fields.
 * For example:
 *   `Europe`: { indent: 1, fields: ["continent"], values: ["id_of_Europe"]}
 *   `Brussels`: { indent: 2, fields: ["continent", "city"], values: ["id_of_Europe", "id_of_Brussels"]}
 *   `Total`: { indent: 0, fields: [], values: []}
 *
 * `columns` is an double array, first by row and then by cell. So, in this example, it looks like:
 *   [[row1], [row2], [measureRow]]
 *   Each cell of a column's row contains the width (span) of the cells, the fields used for the group by and the values for theses fields.
 * For example:
 *   `Sale Team 1`: { width: 2, fields: ["sales_team"], values: ["id_of_SaleTeam1"]}
 *   `May 2020` (the one under Sale Team 2): { width: 1, fields: ["sales_team", "create_date"], values: ["id_of_SaleTeam2", "May 2020"]}
 *   `Revenues` (the one under Total): { width: 1, fields: ["measure"], values: ["revenues"]}
 *
 */
export class SpreadsheetPivotTable {
  readonly columns: PivotTableColumn[][];
  readonly rows: PivotTableRow[];
  readonly measures: string[];
  readonly maxIndent: number;
  readonly pivotCells: { [key: string]: PivotTableCell[][] } = {};

  constructor(columns: PivotTableColumn[][], rows: PivotTableRow[], measures: string[]) {
    this.columns = columns.map((row) => {
      // offset in the pivot table
      // starts at 1 because the first column is the row title
      let offset = 1;
      return row.map((col) => {
        col = { ...col, offset };
        offset += col.width;
        return col;
      });
    });
    this.rows = rows;
    this.measures = measures;
    this.maxIndent = Math.max(...this.rows.map((row) => row.indent));
  }

  /**
   * Get the number of columns leafs (i.e. the number of the last row of columns)
   */
  getNumberOfDataColumns() {
    return this.columns.at(-1)?.length || 0;
  }

  getPivotCells(includeTotal = true, includeColumnHeaders = true): PivotTableCell[][] {
    const key = JSON.stringify({ includeTotal, includeColumnHeaders });
    if (!this.pivotCells[key]) {
      const numberOfDataRows = this.rows.length;
      const numberOfDataColumns = this.getNumberOfDataColumns();
      let pivotHeight = this.columns.length + numberOfDataRows;
      let pivotWidth = 1 /*(row headers)*/ + numberOfDataColumns;
      if (!includeTotal && numberOfDataRows !== 1) {
        pivotHeight -= 1;
      }
      if (!includeTotal && numberOfDataColumns !== this.measures.length) {
        pivotWidth -= this.measures.length;
      }
      const domainArray: PivotTableCell[][] = [];
      const startRow = includeColumnHeaders ? 0 : this.columns.length;
      for (let col = 0; col < pivotWidth; col++) {
        domainArray.push([]);
        for (let row = startRow; row < pivotHeight; row++) {
          if (!includeTotal && row === pivotHeight) {
            continue;
          }
          domainArray[col].push(this.getPivotCell(col, row, includeTotal));
        }
      }
      this.pivotCells[key] = domainArray;
    }
    return this.pivotCells[key];
  }

  private isTotalRow(index: number) {
    return this.rows[index].indent !== this.maxIndent;
  }

  private getPivotCell(col: number, row: number, includeTotal = true): PivotTableCell {
    const colHeadersHeight = this.columns.length;
    if (col > 0 && row === colHeadersHeight - 1) {
      const domain = this.getColHeaderDomain(col, row);
      if (!domain) {
        return { type: "EMPTY" };
      }
      const measure = domain.at(-1)?.value.toString() || "";
      return { type: "MEASURE_HEADER", domain: domain.slice(0, -1), measure };
    } else if (row <= colHeadersHeight - 1) {
      const domain = this.getColHeaderDomain(col, row);
      return domain ? { type: "HEADER", domain } : { type: "EMPTY" };
    } else if (col === 0) {
      const rowIndex = row - colHeadersHeight;
      const domain = this.getRowDomain(rowIndex);
      return { type: "HEADER", domain };
    } else {
      const rowIndex = row - colHeadersHeight;
      if (!includeTotal && this.isTotalRow(rowIndex)) {
        return { type: "EMPTY" };
      }
      const domain = [...this.getRowDomain(rowIndex), ...this.getColDomain(col)];
      const measure = this.getColMeasure(col);
      return { type: "VALUE", domain, measure };
    }
  }

  private getColHeaderDomain(col: number, row: number) {
    if (col === 0) {
      return undefined;
    }
    const domain: PivotDomain = [];
    const pivotCol = this.columns[row].find((pivotCol) => pivotCol.offset === col);
    if (!pivotCol) {
      return undefined;
    }
    for (let i = 0; i < pivotCol.fields.length; i++) {
      domain.push({
        field: pivotCol.fields[i],
        value: pivotCol.values[i],
      });
    }
    return domain;
  }

  private getColDomain(col: number) {
    const domain = this.getColHeaderDomain(col, this.columns.length - 1);
    return domain ? domain.slice(0, -1) : []; // slice: remove measure and value
  }

  private getColMeasure(col: number) {
    const domain = this.getColHeaderDomain(col, this.columns.length - 1);
    const measure = domain?.at(-1)?.value;
    if (measure === undefined) {
      throw new Error("Measure isd missing");
    }
    return measure.toString();
  }

  private getRowDomain(row: number) {
    const domain: PivotDomain = [];
    for (let i = 0; i < this.rows[row].fields.length; i++) {
      domain.push({
        field: this.rows[row].fields[i],
        value: this.rows[row].values[i],
      });
    }
    return domain;
  }

  export() {
    return {
      cols: this.columns,
      rows: this.rows,
      measures: this.measures,
    };
  }
}
