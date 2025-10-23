import { FunctionResultObject, Lazy } from "../../types/misc";
import {
  DimensionTree,
  DimensionTreeNode,
  PivotCollapsedDomains,
  PivotDomain,
  PivotSortedColumn,
  PivotStyle,
  PivotTableCell,
  PivotTableColumn,
  PivotTableRow,
} from "../../types/pivot";
import { deepEquals, lazy } from "../misc";
import { isParentDomain, sortPivotTree } from "./pivot_domain_helpers";
import { DEFAULT_PIVOT_STYLE, parseDimension, toNormalizedPivotValue } from "./pivot_helpers";

interface CollapsiblePivotTableColumn extends PivotTableColumn {
  collapsedHeader?: boolean;
}

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
  readonly columns: CollapsiblePivotTableColumn[][];
  rows: PivotTableRow[];
  readonly rowFields: string[];
  readonly measures: string[];
  readonly fieldsType: Record<string, string | undefined>;
  readonly maxIndent: number;
  readonly pivotCells: { [key: string]: PivotTableCell[][] } = {};
  private rowTree: Lazy<DimensionTree>;
  private colTree: Lazy<DimensionTree>;

  isSorted = false;

  constructor(
    columns: CollapsiblePivotTableColumn[][],
    rows: PivotTableRow[],
    measures: string[],
    fieldsType: Record<string, string | undefined>,
    collapsedDomains: PivotCollapsedDomains = { COL: [], ROW: [] }
  ) {
    this.measures = measures;
    this.fieldsType = fieldsType;

    if (collapsedDomains.COL.length) {
      columns = this.removeCollapsedColumns(columns, measures, collapsedDomains.COL);
    }
    this.columns = columns.map((cols) => {
      let offset = 0;
      return cols.map((col) => {
        col = { ...col, offset };
        offset += col.width;
        return col;
      });
    });

    this.rows = rows.filter((row) => !this.isParentCollapsed(collapsedDomains.ROW, row));
    const numberOfRowGroupings = Math.max(...rows.map((row) => row.fields.length));
    const rowAtMaxDepth = rows.find((row) => row.fields.length === numberOfRowGroupings);
    this.rowFields = rowAtMaxDepth ? [...rowAtMaxDepth.fields] : [];
    this.maxIndent = Math.max(...this.rows.map((row) => row.indent));
    this.rowTree = lazy(() => this.buildRowsTree());
    this.colTree = lazy(() => this.buildColumnsTree());
  }

  private removeCollapsedColumns(
    columns: CollapsiblePivotTableColumn[][],
    measures: string[],
    collapsedDomains: PivotDomain[]
  ) {
    const replaceCollapsedChildrenWithSubTotalColumns = (
      parentCol: CollapsiblePivotTableColumn,
      depth: number
    ) => {
      const parentDomain = this.getDomain(parentCol);
      const cols = columns[depth];
      const startIndex = cols.findIndex((col) => isParentDomain(this.getDomain(col), parentDomain));
      const endIndex = cols.findLastIndex((col) =>
        isParentDomain(this.getDomain(col), parentDomain)
      );
      const isLeaf = depth === columns.length - 1;
      const newColumns = measures.map((measure) => {
        const fields = isLeaf ? [...parentCol.fields, "measure"] : [];
        const values = isLeaf ? [...parentCol.values, measure] : [];
        return { fields, values, width: 1, offset: 0, collapsedHeader: !isLeaf };
      });
      cols.splice(startIndex, endIndex - startIndex + 1, ...newColumns);
    };

    return columns.map((cols, i) => {
      for (const col of cols) {
        if (i >= columns.length - 2) {
          return cols;
        }
        const domain = this.getDomain(col);
        if (!collapsedDomains.some((collapsedDomain) => deepEquals(domain, collapsedDomain))) {
          continue;
        }
        col.width = measures.length;
        for (let depth = i + 1; depth < columns.length; depth++) {
          replaceCollapsedChildrenWithSubTotalColumns(col, depth);
        }
      }
      return cols;
    });
  }

  private isParentCollapsed(collapsedDomains: PivotDomain[], dim: PivotTableRow) {
    const domain = this.getDomain(dim);
    return collapsedDomains.some((collapsedDomain) => isParentDomain(domain, collapsedDomain));
  }

  /**
   * Get the number of columns leafs (i.e. the number of the last row of columns)
   */
  getNumberOfDataColumns() {
    return this.columns.at(-1)?.length || 0;
  }

  private getSkippedRows(pivotStyle: Required<PivotStyle>) {
    const skippedRows: Set<number> = new Set();
    const colHeadersHeight = this.getColHeadersHeight();
    if (!pivotStyle.displayColumnHeaders) {
      for (let i = 0; i < colHeadersHeight - 1; i++) {
        skippedRows.add(i);
      }
    }
    if (!pivotStyle.displayMeasuresRow) {
      skippedRows.add(colHeadersHeight - 1);
    }
    // Skip sub-total rows in tabular form
    if (pivotStyle.tabularForm) {
      for (let i = 0; i < this.rows.length; i++) {
        const indent = this.rows[i].indent;
        if (indent !== 0 && indent !== this.maxIndent) {
          skippedRows.add(i + colHeadersHeight);
        }
      }
    }
    return skippedRows;
  }

  getPivotCells(pivotStyle: Required<PivotStyle> = DEFAULT_PIVOT_STYLE): PivotTableCell[][] {
    const key = JSON.stringify(pivotStyle);
    if (!this.pivotCells[key]) {
      const { displayTotals } = pivotStyle;
      const numberOfDataRows = this.rows.length;
      const numberOfDataColumns = this.getNumberOfDataColumns();
      let pivotHeight = numberOfDataRows + this.getColHeadersHeight();
      let pivotWidth = numberOfDataColumns + this.getRowHeadersWidth(pivotStyle);
      if (!displayTotals && numberOfDataRows !== 1) {
        pivotHeight -= 1;
      }
      if (!displayTotals && numberOfDataColumns !== this.measures.length) {
        pivotWidth -= this.measures.length;
      }
      const domainArray: PivotTableCell[][] = [];
      const skippedRows = this.getSkippedRows(pivotStyle);
      for (let col = 0; col < pivotWidth; col++) {
        domainArray.push([]);
        for (let row = 0; row < pivotHeight; row++) {
          if (skippedRows.has(row)) {
            continue;
          }
          const cell = pivotStyle.tabularForm
            ? this.getTabularFormPivotCell(col, row, pivotStyle)
            : this.getPivotCell(col, row, pivotStyle);
          domainArray[col].push(cell);
        }
      }
      this.pivotCells[key] = domainArray;
    }
    return this.pivotCells[key];
  }

  getRowTree() {
    return this.rowTree();
  }

  getColTree() {
    return this.colTree();
  }

  private isTotalRow(index: number) {
    return this.rows[index].indent !== this.maxIndent;
  }

  private getPivotCell(col: number, row: number, pivotStyle: Required<PivotStyle>): PivotTableCell {
    const colHeadersHeight = this.getColHeadersHeight();
    const rowHeadersWidth = this.getRowHeadersWidth(pivotStyle);

    const isColHeader = row < colHeadersHeight - 1 && col >= rowHeadersWidth;
    const isMeasureHeader = row === colHeadersHeight - 1 && col >= rowHeadersWidth;
    const isRowHeader = row > colHeadersHeight - 1 && col < rowHeadersWidth;
    const isPivotValue = row > colHeadersHeight - 1 && col >= rowHeadersWidth;

    if (isMeasureHeader) {
      const colIndex = col - rowHeadersWidth;
      const domain = this.getColHeaderDomain(colIndex, row);
      if (!domain) {
        return EMPTY_PIVOT_CELL;
      }
      const measure = domain.at(-1)?.value?.toString() || "";
      return { type: "MEASURE_HEADER", domain: domain.slice(0, -1), measure };
    } else if (isColHeader) {
      const colIndex = col - rowHeadersWidth;
      const domain = this.getColHeaderDomain(colIndex, row);
      return domain ? { type: "HEADER", domain, dimension: "COL" } : EMPTY_PIVOT_CELL;
    } else if (isRowHeader) {
      const rowIndex = row - colHeadersHeight;
      const domain = this.getDomain(this.rows[rowIndex]);
      return { type: "HEADER", domain, dimension: "ROW" };
    } else if (isPivotValue) {
      const rowIndex = row - colHeadersHeight;
      const colIndex = col - rowHeadersWidth;
      if (!pivotStyle.displayTotals && this.isTotalRow(rowIndex)) {
        return EMPTY_PIVOT_CELL;
      }
      const domain = [...this.getDomain(this.rows[rowIndex]), ...this.getColDomain(colIndex)];
      const measure = this.getColMeasure(colIndex);
      return { type: "VALUE", domain, measure };
    }

    return EMPTY_PIVOT_CELL;
  }

  private getTabularFormPivotCell(
    col: number,
    row: number,
    pivotStyle: Required<PivotStyle>
  ): PivotTableCell {
    const colHeadersHeight = this.getColHeadersHeight();
    const rowHeadersWidth = this.getRowHeadersWidth(pivotStyle);

    const isRowHeader = row > colHeadersHeight - 1 && col < rowHeadersWidth;
    const isRowGroupName = row === colHeadersHeight - 1 && col < rowHeadersWidth;

    if (isRowHeader) {
      const rowIndex = row - colHeadersHeight;
      const domain = this.getDomain(this.rows[rowIndex]).slice(0, col + 1);
      if (domain.length === 0 && col !== 0) {
        return EMPTY_PIVOT_CELL;
      }
      return { type: "HEADER", domain, dimension: "ROW" };
    } else if (isRowGroupName) {
      return { type: "ROW_GROUP_NAME", rowField: this.rowFields[col] };
    }

    return this.getPivotCell(col, row, pivotStyle);
  }

  private getColHeaderDomain(colIndex: number, row: number) {
    const pivotCol = this.columns[row].find((pivotCol) => pivotCol.offset === colIndex);
    if (!pivotCol || pivotCol.collapsedHeader) {
      return undefined;
    }
    return this.getDomain(pivotCol);
  }

  private getDomain(dim: PivotTableRow | PivotTableColumn) {
    return dim.fields.map((fieldWithGranularity, i) => {
      if (fieldWithGranularity === "measure") {
        return {
          type: "char",
          field: fieldWithGranularity,
          value: toNormalizedPivotValue({ displayName: "measure", type: "char" }, dim.values[i]),
        };
      } else {
        const { fieldName, granularity } = parseDimension(fieldWithGranularity);
        const type = this.fieldsType[fieldName] || "char";
        return {
          type,
          field: fieldWithGranularity,
          value: toNormalizedPivotValue(
            { displayName: fieldName, type, granularity },
            dim.values[i]
          ),
        };
      }
    });
  }

  private getColDomain(colIndex: number) {
    const domain = this.getColHeaderDomain(colIndex, this.getColHeadersHeight() - 1);
    return domain ? domain.slice(0, -1) : []; // slice: remove measure and value
  }

  private getColMeasure(colIndex: number) {
    const domain = this.getColHeaderDomain(colIndex, this.getColHeadersHeight() - 1);
    const measure = domain?.at(-1)?.value;
    if (measure === undefined || measure === null) {
      throw new Error("Measure is missing");
    }
    return measure.toString();
  }

  getRowHeadersWidth(pivotStyle: Required<PivotStyle>) {
    return pivotStyle.tabularForm ? this.rowFields.length : 1;
  }

  private getColHeadersHeight() {
    return this.columns.length;
  }

  buildRowsTree(): DimensionTree {
    const tree: DimensionTree = [];
    let depth = 0;
    const treesAtDepth: Record<number, DimensionTree> = {};
    treesAtDepth[0] = tree;
    for (const row of this.rows) {
      if (row.fields.length === 0 || row.values.length === 0) {
        return tree;
      }
      const rowDepth = row.fields.length - 1;
      const fieldWithGranularity = row.fields[rowDepth];
      const { fieldName, granularity } = parseDimension(fieldWithGranularity);
      const type = this.fieldsType[fieldName] ?? "char";
      const value = toNormalizedPivotValue(
        { displayName: fieldName, type, granularity },
        row.values[rowDepth]
      );
      if (rowDepth > depth) {
        depth = rowDepth;
        treesAtDepth[depth] = [];
        const parentNode = treesAtDepth[depth - 1].at(-1);
        if (parentNode) {
          parentNode.children = treesAtDepth[depth];
        }
      }
      depth = rowDepth;
      const node: DimensionTreeNode = {
        value,
        field: row.fields[rowDepth],
        children: [],
        type: this.fieldsType[fieldName] || "char",
        width: 0, // not used
      };
      treesAtDepth[depth].push(node);
    }
    return tree;
  }

  buildColumnsTree(): DimensionTree {
    const tree: DimensionTree = [];
    const columns = this.columns.at(-2) || [];
    const treesAtDepth: Record<number, DimensionTree> = {};
    treesAtDepth[0] = tree;
    for (const leaf of columns) {
      for (let depth = 0; depth < leaf.fields.length; depth++) {
        const fieldWithGranularity = leaf.fields[depth];
        const { fieldName, granularity } = parseDimension(fieldWithGranularity);
        const type = this.fieldsType[fieldName] ?? "char";
        const value = toNormalizedPivotValue(
          { displayName: fieldName, type, granularity },
          leaf.values[depth]
        );
        const node: DimensionTreeNode = {
          value,
          field: leaf.fields[depth],
          children: [],
          width: leaf.width,
          type: this.fieldsType[fieldName] || "char",
        };
        if (treesAtDepth[depth]?.at(-1)?.value !== value) {
          treesAtDepth[depth + 1] = [];
          node.children = treesAtDepth[depth + 1];
          treesAtDepth[depth].push(node);
        }
      }
    }
    return tree;
  }

  export() {
    return {
      cols: this.columns,
      rows: this.rows,
      measures: this.measures,
      fieldsType: this.fieldsType,
    };
  }

  sort(
    measure: string,
    sortedColumn: PivotSortedColumn,
    getValue: (measure: string, domain: PivotDomain) => FunctionResultObject
  ) {
    if (this.isSorted) {
      return;
    }
    const getSortValue = (measure: string, domain: PivotDomain): number => {
      const rawValue = getValue(measure, domain).value;
      return typeof rawValue === "number" ? rawValue : -Infinity;
    };
    const sortColDomain = sortedColumn.domain;

    const sortFn = (rowDomain1: PivotDomain, rowDomain2: PivotDomain) => {
      const value1 = getSortValue(measure, [...rowDomain1, ...sortColDomain]);
      const value2 = getSortValue(measure, [...rowDomain2, ...sortColDomain]);
      return sortedColumn.order === "asc" ? value1 - value2 : value2 - value1;
    };
    const sortedRowTree = sortPivotTree(this.rowTree(), [], sortFn);
    this.rowTree = lazy(sortedRowTree);
    this.rows = [...this.rowTreeToRows(sortedRowTree), this.rows[this.rows.length - 1]];
    this.isSorted = true;
  }

  private rowTreeToRows(tree: DimensionTree, parentRow?: PivotTableRow): PivotTableRow[] {
    return tree.flatMap((node) => {
      const row: PivotTableRow = {
        indent: parentRow ? parentRow.indent + 1 : 1,
        fields: [...(parentRow?.fields || []), node.field],
        values: [...(parentRow?.values || []), node.value],
      };
      return [row, ...this.rowTreeToRows(node.children, row)];
    });
  }

  get numberOfCells() {
    return this.rows.length * this.getNumberOfDataColumns();
  }

  getColumnDomainsAtDepth(depth: number) {
    if (depth < 0 || depth >= this.getColHeadersHeight() - 1) {
      return [];
    }
    return this.columns[depth].map((col) => this.getDomain(col)).filter((d) => d.length);
  }

  getRowDomainsAtDepth(depth: number) {
    if (depth < 0 || depth > this.maxIndent) {
      return [];
    }
    return this.rows.filter((row) => row.indent === depth + 1).map((row) => this.getDomain(row));
  }

  getPivotTableDimensions(pivotStyle: Required<PivotStyle>) {
    const cells = this.getPivotCells(pivotStyle);
    let numberOfHeaderRows = 0;
    if (pivotStyle.displayColumnHeaders) {
      numberOfHeaderRows = this.getColHeadersHeight() - 1;
    }
    if (pivotStyle.displayMeasuresRow) {
      numberOfHeaderRows++;
    }

    return {
      numberOfCols: Math.min(
        this.getRowHeadersWidth(pivotStyle) + pivotStyle.numberOfColumns,
        cells.length
      ),
      numberOfRows: Math.min(numberOfHeaderRows + pivotStyle.numberOfRows, cells[0].length),
      numberOfHeaderRows,
    };
  }

  getNumberOfRowGroupBys() {
    return Math.max(...this.rows.map((row) => row.fields.length));
  }
}

export const EMPTY_PIVOT_CELL = { type: "EMPTY" } as const;
