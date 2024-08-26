import { handleError } from "../../functions";
import { ModelConfig } from "../../model";
import {
  DimensionTree,
  FunctionResultObject,
  Getters,
  InitPivotParams,
  PivotDomain,
  PivotMeasure,
  isMatrix,
} from "../../types";
import { domainToColRowDomain } from "./pivot_domain_helpers";
import { AGGREGATORS_FN, toNormalizedPivotValue } from "./pivot_helpers";
import { PivotParams, PivotUIConstructor } from "./pivot_registry";

/**
 * Dynamically creates a presentation layer wrapper around a given pivot class.
 *
 * It allows to implement additional behaviors and features that can be applied
 * to all pivots, regardless of the specific pivot implementation.
 * Examples of such features include calculated measures or "Show value as" options.
 */
export function withPivotPresentationLayer(PivotClass: PivotUIConstructor) {
  class PivotPresentationLayer extends PivotClass {
    private getters: Getters;
    private cache: Record<string, FunctionResultObject> = {};

    constructor(custom: ModelConfig["custom"], params: PivotParams) {
      super(custom, params);
      this.getters = params.getters;
    }

    init(params?: InitPivotParams | undefined): void {
      this.cache = {};
      super.init(params);
    }

    getPivotCellValueAndFormat(measureName: string, domain: PivotDomain): FunctionResultObject {
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
        return this.getPivotCellValueAndFormat(symbolName, domain);
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
              this.getPivotCellValueAndFormat(
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
          values.push(this.getPivotCellValueAndFormat(measure.id, rowDomain.concat(domain)));
        }
        return values;
      } else {
        const tree = table.getRowTree();
        const subTree = this.getSubTreeMatchingDomain(tree, rowDomain);
        const domains = this.treeToLeafDomains(subTree, rowDomain);
        for (const domain of domains) {
          values.push(this.getPivotCellValueAndFormat(measure.id, domain.concat(colDomain)));
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
      if (!domain.length) {
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
  }
  return PivotPresentationLayer;
}
