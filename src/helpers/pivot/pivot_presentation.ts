import { handleError } from "../../functions";
import { transposeMatrix } from "../../functions/helpers";
import { ModelConfig } from "../../model";
import { _t } from "../../translation";
import {
  CellValue,
  DimensionTree,
  FunctionResultObject,
  Getters,
  InitPivotParams,
  PivotDomain,
  PivotMeasure,
  PivotMeasureDisplay,
  PivotValueCell,
  isMatrix,
} from "../../types";
import { CellErrorType, NotAvailableError } from "../../types/errors";
import { deepEquals, removeDuplicates, transpose2dPOJO } from "../misc";
import {
  NEXT_VALUE,
  PREVIOUS_VALUE,
  domainToColRowDomain,
  domainToString,
  getDimensionDomain,
  getDomainOfParentCol,
  getDomainOfParentRow,
  getFieldDimensionType,
  getFieldParentDomain,
  getPreviousOrNextValueDomain,
  getRankingDomainKey,
  getRunningTotalDomainKey,
  isDomainIsInPivot,
  isFieldInDomain,
  replaceFieldValueInDomain,
} from "./pivot_domain_helpers";
import { AGGREGATORS_FN, toNormalizedPivotValue } from "./pivot_helpers";
import { PivotParams, PivotUIConstructor } from "./pivot_registry";

const PERCENT_FORMAT = "0.00%";

type CacheForMeasureAndField<T> = { [measureId: string]: { [field: string]: T } };
type DomainGroups<T> = { [colDomain: string]: { [rowDomain: string]: T } };

/**
 * Dynamically creates a presentation layer wrapper around a given pivot class.
 *
 * It allows to implement additional behaviors and features that can be applied
 * to all pivots, regardless of the specific pivot implementation.
 * Examples of such features include calculated measures or "Show value as" options.
 */
export default function (PivotClass: PivotUIConstructor) {
  class PivotPresentationLayer extends PivotClass {
    private getters: Getters;
    private cache: Record<string, FunctionResultObject> = {};
    private rankAsc: CacheForMeasureAndField<DomainGroups<number> | undefined> = {};
    private rankDesc: CacheForMeasureAndField<DomainGroups<number> | undefined> = {};
    private runningTotal: CacheForMeasureAndField<DomainGroups<number | undefined> | undefined> =
      {};

    private runningTotalInPercent: CacheForMeasureAndField<
      DomainGroups<number | undefined> | undefined
    > = {};

    constructor(custom: ModelConfig["custom"], params: PivotParams) {
      super(custom, params);
      this.getters = params.getters;
    }

    init(params?: InitPivotParams | undefined): void {
      this.cache = {};
      this.rankAsc = {};
      this.rankDesc = {};
      this.runningTotal = {};
      this.runningTotalInPercent = {};
      super.init(params);
    }

    getPivotCellValueAndFormat(measureName: string, domain: PivotDomain): FunctionResultObject {
      return this.getMeasureDisplayValue(measureName, domain);
    }

    private _getPivotCellValueAndFormat(
      measureName: string,
      domain: PivotDomain
    ): FunctionResultObject {
      const cacheKey = `${measureName}-${domain
        .map((node) => node.field + "=" + node.value)
        .join(",")}`;
      if (this.cache[cacheKey]) {
        return this.cache[cacheKey];
      }
      const measure = this.getMeasure(measureName);
      const result = measure.computedBy
        ? this.computeMeasure(measure, domain)
        : super.getPivotCellValueAndFormat(measureName, domain);
      if (measure.format) {
        this.cache[cacheKey] = { ...result, format: measure.format };
      } else {
        this.cache[cacheKey] = result;
      }
      return this.cache[cacheKey];
    }

    private computeMeasure(measure: PivotMeasure, domain: PivotDomain): FunctionResultObject {
      if (!measure.computedBy) {
        return { value: 0 };
      }
      const { columns, rows } = super.definition;
      if (columns.length + rows.length !== domain.length) {
        const values = this.getValuesToAggregate(measure, domain);
        const aggregator = AGGREGATORS_FN[measure.aggregator];
        if (!aggregator) {
          return { value: 0 };
        }
        try {
          return aggregator([values], this.getters.getLocale());
        } catch (error) {
          return handleError(error, measure.aggregator.toUpperCase());
        }
      }
      const formula = this.getters.getMeasureCompiledFormula(measure);
      const getSymbolValue = (symbolName: string) => {
        const { columns, rows } = this.definition;
        if (columns.find((col) => col.nameWithGranularity === symbolName)) {
          const { colDomain } = domainToColRowDomain(this, domain);
          const symbolIndex = colDomain.findIndex((node) => node.field === symbolName);
          return this.getPivotHeaderValueAndFormat(colDomain.slice(0, symbolIndex + 1));
        }
        if (rows.find((row) => row.nameWithGranularity === symbolName)) {
          const { rowDomain } = domainToColRowDomain(this, domain);
          const symbolIndex = rowDomain.findIndex((row) => row.field === symbolName);
          return this.getPivotHeaderValueAndFormat(rowDomain.slice(0, symbolIndex + 1));
        }
        return this._getPivotCellValueAndFormat(symbolName, domain);
      };
      const result = this.getters.evaluateCompiledFormula(
        measure.computedBy.sheetId,
        formula,
        getSymbolValue
      );
      if (isMatrix(result)) {
        return result[0][0];
      }
      return result;
    }

    private getValuesToAggregate(measure: PivotMeasure, domain: PivotDomain) {
      const { rowDomain, colDomain } = domainToColRowDomain(this, domain);
      const table = this.getTableStructure();
      const values: FunctionResultObject[] = [];
      if (
        colDomain.length === 0 &&
        rowDomain.length < this.definition.rows.length &&
        this.definition.rows.length &&
        this.definition.columns.length
      ) {
        const colDomains = this.treeToLeafDomains(table.getColTree());
        const rowSubTree = this.getSubTreeMatchingDomain(table.getRowTree(), rowDomain);
        const rowDomains = this.treeToLeafDomains(rowSubTree);
        for (const colDomain of colDomains) {
          for (const subRowDomain of rowDomains) {
            values.push(
              this._getPivotCellValueAndFormat(
                measure.id,
                rowDomain.concat(subRowDomain).concat(colDomain)
              )
            );
          }
        }
        return values;
      } else if (rowDomain.length === this.definition.rows.length && colDomain.length === 0) {
        // aggregate a row in the last column
        const tree = table.getColTree();
        const subTree = this.getSubTreeMatchingDomain(tree, colDomain);
        const domains = this.treeToLeafDomains(subTree, colDomain);
        for (const domain of domains) {
          values.push(this._getPivotCellValueAndFormat(measure.id, rowDomain.concat(domain)));
        }
        return values;
      } else {
        const tree = table.getRowTree();
        const subTree = this.getSubTreeMatchingDomain(tree, rowDomain);
        const domains = this.treeToLeafDomains(subTree, rowDomain);
        for (const domain of domains) {
          values.push(this._getPivotCellValueAndFormat(measure.id, domain.concat(colDomain)));
        }
        return values;
      }
    }

    private getSubTreeMatchingDomain(
      tree: DimensionTree,
      domain: PivotDomain,
      domainLevel = 0
    ): DimensionTree {
      if (domainLevel > domain.length) {
        return [];
      }
      if (domain.length === domainLevel) {
        return tree;
      }
      for (const node of tree) {
        const dimension = this.definition.getDimension(node.field);
        const normalizedValue = toNormalizedPivotValue(dimension, domain[domainLevel]?.value);
        if (node.field === domain[domainLevel]?.field && node.value === normalizedValue) {
          return this.getSubTreeMatchingDomain(node.children, domain, domainLevel + 1);
        }
      }
      return tree;
    }

    treeToLeafDomains(tree: DimensionTree, parentDomain: PivotDomain = []) {
      const domains: PivotDomain[] = [];
      for (const node of tree) {
        const dimension = this.definition.getDimension(node.field);
        const nodeDomain = [
          ...parentDomain,
          { field: node.field, value: node.value, type: dimension.type },
        ];
        if (node.children.length === 0) {
          domains.push(nodeDomain);
        } else {
          domains.push(...this.treeToLeafDomains(node.children, nodeDomain));
        }
      }
      return domains;
    }

    private getMeasureDisplayValue(measureId: string, domain: PivotDomain): FunctionResultObject {
      const measure = this.getMeasure(measureId);
      const rawValue = this._getPivotCellValueAndFormat(measureId, domain);
      if (!measure.display || measure.display.type === "no_calculations" || rawValue.message) {
        return rawValue;
      }
      const fieldName = measure.display.fieldNameWithGranularity;
      if (fieldName && !this.isFieldInPivot(fieldName)) {
        return {
          value: CellErrorType.NotAvailable,
          message: _t('Field "%s" not found in pivot for measure display calculation', fieldName),
        };
      }

      try {
        const display = measure.display;
        switch (display.type) {
          case "%_of_grand_total":
            return this.asPercentOfGrandTotal(rawValue, measure);
          case "%_of_col_total":
            return this.asPercentOfColumnTotal(rawValue, measure, domain);
          case "%_of_row_total":
            return this.asPercentOfRowTotal(rawValue, measure, domain);
          case "%_of_parent_row_total":
            return this.asPercentOfParentRowTotal(rawValue, measure, domain);
          case "%_of_parent_col_total":
            return this.asPercentOfParentColumnTotal(rawValue, measure, domain);
          case "index":
            return this.asIndex(rawValue, measure, domain);
          case "%_of_parent_total":
            return this.asPercentOfParentTotal(rawValue, measure, domain, display);
          case "running_total":
            return this.asRunningTotal(rawValue, measure, domain, display, "running_total");
          case "%_running_total":
            return this.asRunningTotal(rawValue, measure, domain, display, "%_running_total");
          case "rank_asc":
            return this.asRank(rawValue, measure, domain, display, "asc");
          case "rank_desc":
            return this.asRank(rawValue, measure, domain, display, "desc");
          case "%_of":
            return this.asPercentOf(rawValue, measure, domain, display);
          case "difference_from":
            return this.asDifferenceFrom(rawValue, measure, domain, display);
          case "%_difference_from":
            return this.asDifferenceFromInPercent(rawValue, measure, domain, display);
        }
        return rawValue;
      } catch (e) {
        return handleError(e, "COMPUTE_MEASURE_DISPLAY_VALUE");
      }
    }

    private asPercentOfGrandTotal(
      rawValue: FunctionResultObject,
      measure: PivotMeasure
    ): FunctionResultObject {
      const grandTotal = this.getGrandTotal(measure.id);
      return grandTotal === 0
        ? { value: CellErrorType.DivisionByZero }
        : { value: this.measureValueToNumber(rawValue) / grandTotal, format: PERCENT_FORMAT };
    }

    private asPercentOfRowTotal(
      rawValue: FunctionResultObject,
      measure: PivotMeasure,
      domain: PivotDomain
    ): FunctionResultObject {
      const rowTotal = this.getRowTotal(measure.id, domain);
      return rowTotal === 0
        ? { value: CellErrorType.DivisionByZero }
        : { value: this.measureValueToNumber(rawValue) / rowTotal, format: PERCENT_FORMAT };
    }

    private asPercentOfColumnTotal(
      rawValue: FunctionResultObject,
      measure: PivotMeasure,
      domain: PivotDomain
    ): FunctionResultObject {
      const columnTotal = this.getColumnTotal(measure.id, domain);
      return columnTotal === 0
        ? { value: CellErrorType.DivisionByZero }
        : { value: this.measureValueToNumber(rawValue) / columnTotal, format: PERCENT_FORMAT };
    }

    private asPercentOfParentRowTotal(
      rawValue: FunctionResultObject,
      measure: PivotMeasure,
      domain: PivotDomain
    ): FunctionResultObject {
      const parentRowDomain = getDomainOfParentRow(this, domain);
      const parentRowValue = this.measureValueToNumber(
        this._getPivotCellValueAndFormat(measure.id, parentRowDomain)
      );
      return parentRowValue === 0
        ? { value: "" }
        : { value: this.measureValueToNumber(rawValue) / parentRowValue, format: PERCENT_FORMAT };
    }

    private asPercentOfParentColumnTotal(
      rawValue: FunctionResultObject,
      measure: PivotMeasure,
      domain: PivotDomain
    ): FunctionResultObject {
      const parentColumnDomain = getDomainOfParentCol(this, domain);
      const parentColValue = this.measureValueToNumber(
        this._getPivotCellValueAndFormat(measure.id, parentColumnDomain)
      );
      return parentColValue === 0
        ? { value: "" }
        : { value: this.measureValueToNumber(rawValue) / parentColValue, format: PERCENT_FORMAT };
    }

    private asPercentOfParentTotal(
      rawValue: FunctionResultObject,
      measure: PivotMeasure,
      domain: PivotDomain,
      display: PivotMeasureDisplay
    ): FunctionResultObject {
      const { fieldNameWithGranularity } = display;
      if (!fieldNameWithGranularity) {
        return rawValue;
      }
      if (!isFieldInDomain(fieldNameWithGranularity, domain)) {
        return { value: "" };
      }
      const parentDomain = getFieldParentDomain(this, fieldNameWithGranularity, domain);
      const parentTotal = this._getPivotCellValueAndFormat(measure.id, parentDomain);
      const parentTotalValue = this.measureValueToNumber(parentTotal);

      return parentTotalValue === 0
        ? { value: "" }
        : { value: this.measureValueToNumber(rawValue) / parentTotalValue, format: PERCENT_FORMAT };
    }

    private asIndex(
      rawValue: FunctionResultObject,
      measure: PivotMeasure,
      domain: PivotDomain
    ): FunctionResultObject {
      const value = this.measureValueToNumber(rawValue);
      const parentRowTotal = this.getRowTotal(measure.id, domain);
      const parentColTotal = this.getColumnTotal(measure.id, domain);
      const grandTotal = this.getGrandTotal(measure.id);

      return parentRowTotal === 0 || parentColTotal === 0
        ? { value: CellErrorType.DivisionByZero }
        : { value: (value * grandTotal) / (parentColTotal * parentRowTotal), format: undefined };
    }

    private asRunningTotal(
      rawValue: FunctionResultObject,
      measure: PivotMeasure,
      domain: PivotDomain,
      display: PivotMeasureDisplay,
      mode: "running_total" | "%_running_total"
    ): FunctionResultObject {
      const { fieldNameWithGranularity } = display;
      if (!fieldNameWithGranularity) {
        return rawValue;
      }

      const totalCache = mode === "running_total" ? this.runningTotal : this.runningTotalInPercent;

      let runningTotals = totalCache[measure.id]?.[fieldNameWithGranularity];
      if (!runningTotals) {
        runningTotals = this.computeRunningTotal(measure, fieldNameWithGranularity, mode);
        if (!totalCache[measure.id]) {
          totalCache[measure.id] = {};
        }
        totalCache[measure.id][fieldNameWithGranularity] = runningTotals;
      }

      const { rowDomain, colDomain } = domainToColRowDomain(this, domain);
      const colDomainKey = domainToString(colDomain);
      const rowDomainKey = domainToString(rowDomain);
      const runningTotal = runningTotals[colDomainKey]?.[rowDomainKey];

      return {
        value: runningTotal ?? "",
        format: mode === "running_total" ? rawValue.format : PERCENT_FORMAT,
      };
    }

    private asPercentOf(
      rawValue: FunctionResultObject,
      measure: PivotMeasure,
      domain: PivotDomain,
      display: PivotMeasureDisplay
    ): FunctionResultObject {
      const { fieldNameWithGranularity, value } = display;
      if (value === undefined || !fieldNameWithGranularity) {
        return rawValue;
      }
      if (!isFieldInDomain(fieldNameWithGranularity, domain)) {
        return { value: "" };
      }

      let comparedValue = this.getComparisonValue(measure, domain, fieldNameWithGranularity, value);
      let numberValue = this.strictMeasureValueToNumber(rawValue);

      if (comparedValue === 0 || (comparedValue === "sameValue" && numberValue === 0)) {
        return { value: CellErrorType.DivisionByZero };
      } else if (!comparedValue || (comparedValue === "sameValue" && !numberValue)) {
        return { value: "" };
      } else if (comparedValue === "sameValue") {
        return { value: 1, format: PERCENT_FORMAT };
      } else if (numberValue === undefined) {
        return { value: CellErrorType.NullError };
      }
      return { value: numberValue / comparedValue, format: PERCENT_FORMAT };
    }

    private asDifferenceFrom(
      rawValue: FunctionResultObject,
      measure: PivotMeasure,
      domain: PivotDomain,
      display: PivotMeasureDisplay
    ): FunctionResultObject {
      const { fieldNameWithGranularity, value } = display;
      if (value === undefined || !fieldNameWithGranularity) {
        return rawValue;
      }
      if (!isFieldInDomain(fieldNameWithGranularity, domain)) {
        return { value: "" };
      }

      const comparedValue =
        this.getComparisonValue(measure, domain, fieldNameWithGranularity, value) || 0;
      return comparedValue === "sameValue"
        ? { value: "" }
        : {
            value: this.measureValueToNumber(rawValue) - comparedValue,
            format: rawValue.format,
          };
    }

    private asDifferenceFromInPercent(
      rawValue: FunctionResultObject,
      measure: PivotMeasure,
      domain: PivotDomain,
      display: PivotMeasureDisplay
    ): FunctionResultObject {
      const { fieldNameWithGranularity, value } = display;
      if (value === undefined || !fieldNameWithGranularity) {
        return rawValue;
      }
      if (!isFieldInDomain(fieldNameWithGranularity, domain)) {
        return { value: "" };
      }

      let comparedValue = this.getComparisonValue(measure, domain, fieldNameWithGranularity, value);
      const numberValue = this.strictMeasureValueToNumber(rawValue);

      if (comparedValue === 0) {
        return { value: CellErrorType.DivisionByZero };
      } else if (!comparedValue || comparedValue === "sameValue") {
        return { value: "" };
      } else if (numberValue === undefined) {
        return { value: CellErrorType.NullError };
      }

      return { value: (numberValue - comparedValue) / comparedValue, format: PERCENT_FORMAT };
    }

    private asRank(
      rawValue: FunctionResultObject,
      measure: PivotMeasure,
      domain: PivotDomain,
      display: PivotMeasureDisplay,
      order: "asc" | "desc"
    ): FunctionResultObject {
      const { fieldNameWithGranularity } = display;
      if (!fieldNameWithGranularity) {
        return rawValue;
      }
      if (!isFieldInDomain(fieldNameWithGranularity, domain)) {
        return { value: "" };
      }

      const rankingCache = order === "asc" ? this.rankAsc : this.rankDesc;

      let ranking = rankingCache[measure.id]?.[fieldNameWithGranularity];
      if (!ranking) {
        ranking = this.computeRank(measure, fieldNameWithGranularity, order);
        if (!rankingCache[measure.id]) {
          rankingCache[measure.id] = {};
        }
        rankingCache[measure.id][fieldNameWithGranularity] = ranking;
      }

      const { rowDomain, colDomain } = domainToColRowDomain(this, domain);
      const colDomainKey = domainToString(colDomain);
      const rowDomainKey = domainToString(rowDomain);
      const rank = ranking[colDomainKey]?.[rowDomainKey];

      return { value: rank ?? "" };
    }

    private computeRank(
      measure: PivotMeasure,
      fieldNameWithGranularity: string,
      order: "asc" | "desc"
    ): DomainGroups<number> {
      const ranking: DomainGroups<number> = {};
      const mainDimension = getFieldDimensionType(this, fieldNameWithGranularity);
      const secondaryDimension = mainDimension === "row" ? "column" : "row";

      let pivotCells = this.getPivotValueCells(measure.id);

      if (mainDimension === "column") {
        // Transpose the pivot cells so we can do the same operations on the columns as on the rows
        // This means that we need to transpose back the ranking at the end
        pivotCells = transposeMatrix(pivotCells);
      }

      for (const col of pivotCells) {
        const colDomain = getDimensionDomain(this, secondaryDimension, col[0].domain);
        const colDomainKey = domainToString(colDomain);

        const cells = col
          .map((cell) => ({
            ...cell,
            value: this.strictMeasureValueToNumber(
              this._getPivotCellValueAndFormat(measure.id, cell.domain)
            ),
            rowDomain: getDimensionDomain(this, mainDimension, cell.domain),
          }))
          .filter((cell) => isFieldInDomain(fieldNameWithGranularity, cell.rowDomain));

        // Group the cells by ranking domain, and sort them to get the ranking
        const groupedCell = Object.groupBy(cells, (cell) =>
          getRankingDomainKey(cell.rowDomain, fieldNameWithGranularity)
        );
        for (const rankingDomainKey in groupedCell) {
          groupedCell[rankingDomainKey] = removeDuplicates(
            groupedCell[rankingDomainKey] || [],
            (cell) => cell.value
          )
            .filter((cell) => cell.value !== undefined)
            .sort((a, b) => (order === "asc" ? a.value! - b.value! : b.value! - a.value!));
        }

        ranking[colDomainKey] = {};
        for (const cell of cells) {
          const rowDomain = getDimensionDomain(this, mainDimension, cell.domain);
          const rowDomainKey = domainToString(rowDomain);
          const rankingDomainKey = getRankingDomainKey(cell.rowDomain, fieldNameWithGranularity);
          const group = groupedCell[rankingDomainKey];
          if (!group) {
            continue;
          }

          const rank = group.findIndex((c) => c.value === cell.value);
          if (rank !== -1) {
            ranking[colDomainKey][rowDomainKey] = rank + 1; // Ranks start at 1
          }
        }
      }

      return mainDimension === "row" ? ranking : transpose2dPOJO(ranking);
    }

    private computeRunningTotal(
      measure: PivotMeasure,
      fieldNameWithGranularity: string,
      mode: "running_total" | "%_running_total"
    ): DomainGroups<number | undefined> {
      const cellsRunningTotals: DomainGroups<number | undefined> = {};
      const mainDimension = getFieldDimensionType(this, fieldNameWithGranularity);
      const secondaryDimension = mainDimension === "row" ? "column" : "row";

      let pivotCells = this.getPivotValueCells(measure.id);

      if (mainDimension === "column") {
        // Transpose the pivot cells so we can do the same operations on the columns as on the rows
        // This means that we need to transpose back the totals at the end
        pivotCells = transposeMatrix(pivotCells);
      }

      for (const col of pivotCells) {
        const colDomain = getDimensionDomain(this, secondaryDimension, col[0].domain);
        const colDomainKey = domainToString(colDomain);
        cellsRunningTotals[colDomainKey] = {};
        const runningTotals: { [runningTotalKey: string]: number } = {};

        const cellsWithValue = col
          .map((cell) => ({
            ...cell,
            rowDomain: getDimensionDomain(this, mainDimension, cell.domain),
            value: this.measureValueToNumber(
              this._getPivotCellValueAndFormat(measure.id, cell.domain)
            ),
          }))
          .filter((cell) => isFieldInDomain(fieldNameWithGranularity, cell.rowDomain));

        for (const cell of cellsWithValue) {
          const rowDomainKey = domainToString(cell.rowDomain);
          const runningTotalKey = getRunningTotalDomainKey(
            cell.rowDomain,
            fieldNameWithGranularity
          );

          const runningTotal = (runningTotals[runningTotalKey] || 0) + cell.value;
          runningTotals[runningTotalKey] = runningTotal;
          cellsRunningTotals[colDomainKey][rowDomainKey] = runningTotal;
        }

        if (mode === "%_running_total") {
          for (const cell of cellsWithValue) {
            const rowDomain = cell.rowDomain;
            const rowDomainKey = domainToString(rowDomain);
            const runningTotalKey = getRunningTotalDomainKey(rowDomain, fieldNameWithGranularity);

            const cellRunningTotal = cellsRunningTotals[colDomainKey][rowDomainKey] || 0;
            const finalRunningTotal = runningTotals[runningTotalKey];
            cellsRunningTotals[colDomainKey][rowDomainKey] = !finalRunningTotal
              ? undefined
              : cellRunningTotal / finalRunningTotal;
          }
        }
      }
      return mainDimension === "row" ? cellsRunningTotals : transpose2dPOJO(cellsRunningTotals);
    }

    private getGrandTotal(measureId: string): number {
      const grandTotal = this._getPivotCellValueAndFormat(measureId, []);
      return this.measureValueToNumber(grandTotal);
    }

    private getRowTotal(measureId: string, domain: PivotDomain) {
      const totalDomain = domainToColRowDomain(this, domain).rowDomain;
      const rowTotal = this._getPivotCellValueAndFormat(measureId, totalDomain);
      return this.measureValueToNumber(rowTotal);
    }

    private getColumnTotal(measureId: string, domain: PivotDomain) {
      const totalDomain = domainToColRowDomain(this, domain).colDomain;
      const columnTotal = this._getPivotCellValueAndFormat(measureId, totalDomain);
      return this.measureValueToNumber(columnTotal);
    }

    private isFieldInPivot(nameWithGranularity: string): boolean {
      return (
        this.definition.columns.some((c) => c.nameWithGranularity === nameWithGranularity) ||
        this.definition.rows.some((r) => r.nameWithGranularity === nameWithGranularity)
      );
    }

    /**
     * With the given measure, fetch the value of the cell in the pivot that has the given domain with
     * the value of the field `fieldNameWithGranularity` replaced by `valueToCompare`.
     *
     * @param valueToCompare either a value to replace the field value with, or "(previous)" or "(next)"
     * @returns the value of the cell in the pivot with the new domain, or "sameValue" if the domain is the same
     */
    private getComparisonValue(
      measure: PivotMeasure,
      domain: PivotDomain,
      fieldNameWithGranularity: string,
      valueToCompare: CellValue | typeof PREVIOUS_VALUE | typeof NEXT_VALUE
    ): number | "sameValue" | undefined {
      const comparedDomain =
        valueToCompare === PREVIOUS_VALUE || valueToCompare === NEXT_VALUE
          ? getPreviousOrNextValueDomain(this, domain, fieldNameWithGranularity, valueToCompare)
          : replaceFieldValueInDomain(domain, fieldNameWithGranularity, valueToCompare);
      if (deepEquals(comparedDomain, domain)) {
        return "sameValue";
      }
      if (!comparedDomain || !isDomainIsInPivot(this, comparedDomain)) {
        throw new NotAvailableError();
      }

      const comparedValue = this._getPivotCellValueAndFormat(measure.id, comparedDomain);
      const comparedValueNumber = this.strictMeasureValueToNumber(comparedValue);
      return comparedValueNumber;
    }

    private getPivotValueCells(measureId: string): PivotValueCell[][] {
      return this.getTableStructure()
        .getPivotCells()
        .map((col) => col.filter((cell) => cell.type === "VALUE" && cell.measure === measureId))
        .filter((col) => col.length > 0) as PivotValueCell[][];
    }

    private measureValueToNumber(result: FunctionResultObject): number {
      if (typeof result.value === "number") {
        return result.value;
      }
      if (!result.value) {
        return 0;
      }
      // Should not happen, measures aggregates are always numbers or undefined
      throw new Error(`Value ${result.value} is not a number`);
    }

    private strictMeasureValueToNumber(result: FunctionResultObject): number | undefined {
      if (typeof result.value === "number") {
        return result.value;
      }
      if (!result.value) {
        return undefined;
      }
      throw new Error(`Value ${result.value} is not a number`);
    }
  }
  return PivotPresentationLayer;
}
