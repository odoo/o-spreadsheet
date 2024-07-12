import { handleError } from "../../functions";
import { ModelConfig } from "../../model";
import {
  DimensionTree,
  FunctionResultObject,
  Getters,
  Pivot,
  PivotDomain,
  PivotMeasure,
  isMatrix,
} from "../../types";
import { AGGREGATORS_FN } from "./pivot_helpers";
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

    constructor(custom: ModelConfig["custom"], params: PivotParams) {
      super(custom, params);
      this.getters = params.getters;
    }

    getPivotCellValueAndFormat(measureName: string, domain: PivotDomain): FunctionResultObject {
      const measure = this.getMeasure(measureName);
      if (measure.computedBy) {
        return this.computeMeasure(measure, domain);
      }
      return super.getPivotCellValueAndFormat(measureName, domain);
    }

    private computeMeasure(measure: PivotMeasure, domain: PivotDomain): FunctionResultObject {
      if (!measure.computedBy) {
        return { value: 0 };
      }
      const { columns, rows } = super.definition;
      if (columns.length + rows.length !== domain.length) {
        const values = this.getValuesToAggregate(measure, domain);
        const aggregator = AGGREGATORS_FN[measure.aggregator];
        try {
          return {
            value: aggregator?.fn([values], this.getters.getLocale()) || 0,
            format: aggregator?.format([values]),
          };
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
        // FIXME This is clearly sub-optimal. The same aggregates and values are computed multiple times :(
        const colDomains = treeToLeafDomains(table.getColTree());
        const rowSubTree = getSubTreeMatchingDomain(table.getRowTree(), rowDomain);
        const rowDomains = treeToLeafDomains(rowSubTree);
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
        const subTree = getSubTreeMatchingDomain(tree, colDomain);
        const domains = treeToLeafDomains(subTree, colDomain);
        // FIXME This is clearly sub-optimal. The same aggregates and values are computed multiple times :(
        for (const domain of domains) {
          values.push(this.getPivotCellValueAndFormat(measure.id, rowDomain.concat(domain)));
        }
        return values;
      } else {
        const tree = table.getRowTree();
        const subTree = getSubTreeMatchingDomain(tree, rowDomain);
        const domains = treeToLeafDomains(subTree, rowDomain);
        // FIXME This is clearly sub-optimal. The same aggregates and values are computed multiple times :(
        for (const domain of domains) {
          values.push(this.getPivotCellValueAndFormat(measure.id, domain.concat(colDomain)));
        }
        return values;
      }
    }
  }
  return PivotPresentationLayer;
}

// from ADRM's PR
// @ts-ignore
function domainToColRowDomain(pivot: Pivot, domain: PivotDomain) {
  const rowFields = pivot.definition.rows.map((c) => c.nameWithGranularity);
  const rowDomain = domain.filter((node) => rowFields.includes(node.field));
  const columnFields = pivot.definition.columns.map((c) => c.nameWithGranularity);
  const colDomain = domain.filter((node) => columnFields.includes(node.field));
  return { colDomain, rowDomain };
}

function getSubTreeMatchingDomain(tree: DimensionTree, domain: PivotDomain, domainLevel = 0) {
  if (domainLevel > domain.length) {
    return [];
  }
  for (const node of tree) {
    if (node.field === domain[domainLevel]?.field && node.value === domain[domainLevel]?.value) {
      return getSubTreeMatchingDomain(node.children, domain, domainLevel + 1);
    }
  }
  return tree;
}

function treeToLeafDomains(tree: DimensionTree, parentDomain: PivotDomain = []) {
  const domains: PivotDomain[] = [];
  for (const node of tree) {
    const nodeDomain = [...parentDomain, { field: node.field, value: node.value, type: "char" }];
    if (node.children.length === 0) {
      domains.push(nodeDomain);
    } else {
      domains.push(...treeToLeafDomains(node.children, nodeDomain));
    }
  }
  return domains;
}
