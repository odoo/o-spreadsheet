import { tokenColors } from "../../components/composer/composer/composer";
import { EnrichedToken } from "../../formulas/composer_tokenizer";
import { isDefined } from "../../helpers";
import { supportedPivotExplodedFormulaRegistry } from "../../helpers/pivot/pivot_exploded_formula_registry";
import {
  extractFormulaIdFromToken,
  insertTokenAfterArgSeparator,
  insertTokenAfterLeftParenthesis,
  makeFieldProposal,
} from "../../helpers/pivot/pivot_helpers";
import { _t } from "../../translation";
import { autoCompleteProviders } from "./auto_complete_registry";

autoCompleteProviders.add("pivot_ids", {
  sequence: 50,
  autoSelectFirstProposal: true,
  getProposals(tokenAtCursor) {
    const functionContext = tokenAtCursor.functionContext;
    const pivotFunction = ["PIVOT.VALUE", "PIVOT.HEADER", "PIVOT"];
    if (
      !functionContext ||
      !pivotFunction.includes(functionContext.parent.toUpperCase()) ||
      functionContext.argPosition !== 0
    ) {
      return;
    }
    const pivotIds = this.getters.getPivotIds();
    if (pivotIds.includes(tokenAtCursor.value)) {
      return;
    }
    return pivotIds
      .map((pivotId) => {
        const definition = this.getters.getPivotCoreDefinition(pivotId);
        if (
          functionContext.parent.toUpperCase() !== "PIVOT" &&
          !supportedPivotExplodedFormulaRegistry.get(definition.type)
        ) {
          return undefined;
        }
        const formulaId = this.getters.getPivotFormulaId(pivotId);
        const str = `${formulaId}`;
        return {
          text: str,
          description: definition.name,
          htmlContent: [{ value: str, color: tokenColors.NUMBER }],
          fuzzySearchKey: str + definition.name,
        };
      })
      .filter(isDefined);
  },
  selectProposal: insertTokenAfterLeftParenthesis,
});

autoCompleteProviders.add("pivot_measures", {
  sequence: 50,
  autoSelectFirstProposal: true,
  getProposals(tokenAtCursor) {
    const functionContext = tokenAtCursor.functionContext;
    if (
      functionContext?.parent.toUpperCase() !== "PIVOT.VALUE" ||
      functionContext.argPosition !== 1
    ) {
      return [];
    }
    const pivotFormulaId = extractFormulaIdFromToken(tokenAtCursor);
    const pivotId = this.getters.getPivotId(pivotFormulaId);
    if (!pivotId || !this.getters.isExistingPivot(pivotId)) {
      return [];
    }
    const dataSource = this.getters.getPivot(pivotId);
    const fields = dataSource.getFields();
    if (!fields) {
      return [];
    }
    const definition = this.getters.getPivotCoreDefinition(pivotId);
    if (!supportedPivotExplodedFormulaRegistry.get(definition.type)) {
      return [];
    }
    return definition.measures
      .map((measure) => {
        if (measure.name === "__count") {
          const text = '"__count"';
          return {
            text,
            description: _t("Count"),
            htmlContent: [{ value: text, color: tokenColors.STRING }],
            fuzzySearchKey: _t("Count") + text,
          };
        }
        const field = fields[measure.name];
        if (!field) {
          return;
        }
        return makeFieldProposal(field);
      })
      .filter(isDefined);
  },
  selectProposal: insertTokenAfterArgSeparator,
});

autoCompleteProviders.add("pivot_group_fields", {
  sequence: 50,
  autoSelectFirstProposal: true,
  getProposals(tokenAtCursor) {
    const functionContext = tokenAtCursor.functionContext;
    if (
      !functionContext ||
      (!canAutoCompletePivotField(tokenAtCursor) && !canAutoCompletePivotHeaderField(tokenAtCursor))
    ) {
      return;
    }
    const pivotFormulaId = extractFormulaIdFromToken(tokenAtCursor);
    const pivotId = this.getters.getPivotId(pivotFormulaId);
    if (!pivotId || !this.getters.isExistingPivot(pivotId)) {
      return;
    }
    const dataSource = this.getters.getPivot(pivotId);
    const fields = dataSource.getFields();
    if (!fields) {
      return;
    }
    const { columns, rows, type } = this.getters.getPivotCoreDefinition(pivotId);
    if (!supportedPivotExplodedFormulaRegistry.get(type)) {
      return [];
    }
    let args = functionContext.args;
    if (functionContext?.parent.toUpperCase() === "PIVOT.VALUE") {
      args = args.filter((ast, index) => index % 2 === 0); // keep only the field names
      args = args.slice(1, functionContext.argPosition); // remove the first even argument (the pivot id)
    } else {
      args = args.filter((ast, index) => index % 2 === 1); // keep only the field names
    }
    const argGroupBys = args.map((ast) => ast?.value).filter(isDefined);
    const colFields = columns.map((groupBy) => groupBy.name);
    const rowFields = rows.map((groupBy) => groupBy.name);

    const proposals: string[] = [];
    const previousGroupBy = ["ARG_SEPARATOR", "SPACE"].includes(tokenAtCursor.type)
      ? argGroupBys.at(-1)
      : argGroupBys.at(-2);
    if (previousGroupBy === undefined) {
      proposals.push(colFields[0]);
      proposals.push(rowFields[0]);
    }
    if (rowFields.includes(previousGroupBy)) {
      const nextRowGroupBy = rowFields[rowFields.indexOf(previousGroupBy) + 1];
      proposals.push(nextRowGroupBy);
      proposals.push(colFields[0]);
    }
    if (colFields.includes(previousGroupBy)) {
      const nextGroupBy = colFields[colFields.indexOf(previousGroupBy) + 1];
      proposals.push(nextGroupBy);
    }
    const groupBys = proposals.filter(isDefined);
    return groupBys
      .map((groupBy) => {
        const field = fields[groupBy];
        return field ? makeFieldProposal(field) : undefined;
      })
      .concat(
        groupBys.map((groupBy) => {
          const field = fields[groupBy];
          if (!field) {
            return undefined;
          }
          const positionalFieldArg = `"#${field.name}"`;
          const positionalProposal = {
            text: positionalFieldArg,
            description:
              _t("%s (positional)", field.string) + (field.help ? ` (${field.help})` : ""),
            htmlContent: [{ value: positionalFieldArg, color: tokenColors.STRING }],
            fuzzySearchKey: field.string + positionalFieldArg, // search on translated name and on technical name
          };
          return positionalProposal;
        })
      )
      .filter(isDefined);
  },
  selectProposal: insertTokenAfterArgSeparator,
});

function canAutoCompletePivotField(tokenAtCursor) {
  const functionContext = tokenAtCursor.functionContext;
  return (
    functionContext?.parent.toUpperCase() === "PIVOT.VALUE" &&
    functionContext.argPosition >= 2 && // the first two arguments are the pivot id and the measure
    functionContext.argPosition % 2 === 0 // only the even arguments are the group bys
  );
}

function canAutoCompletePivotHeaderField(tokenAtCursor) {
  const functionContext = tokenAtCursor.functionContext;
  return (
    functionContext?.parent.toUpperCase() === "PIVOT.HEADER" &&
    functionContext.argPosition >= 1 && // the first argument is the pivot id
    functionContext.argPosition % 2 === 1 // only the odd arguments are the group bys
  );
}

autoCompleteProviders.add("pivot_group_values", {
  sequence: 50,
  autoSelectFirstProposal: true,
  getProposals(tokenAtCursor) {
    const functionContext = tokenAtCursor.functionContext;
    if (
      !functionContext ||
      !tokenAtCursor ||
      (!canAutoCompletePivotGroupValue(tokenAtCursor) &&
        !canAutoCompletePivotHeaderGroupValue(tokenAtCursor))
    ) {
      return;
    }
    const pivotFormulaId = extractFormulaIdFromToken(tokenAtCursor);
    const pivotId = this.getters.getPivotId(pivotFormulaId);
    if (!pivotId || !this.getters.isExistingPivot(pivotId)) {
      return;
    }
    const { type } = this.getters.getPivotCoreDefinition(pivotId);
    if (!supportedPivotExplodedFormulaRegistry.get(type)) {
      return [];
    }

    const dataSource = this.getters.getPivot(pivotId);
    if (!dataSource.isValid()) {
      return;
    }
    const argPosition = functionContext.argPosition;
    const groupByField = tokenAtCursor.functionContext?.args[argPosition - 1]?.value;
    if (!groupByField) {
      return;
    }
    return dataSource.getPossibleFieldValues(groupByField).map(({ value, label }) => {
      const isString = typeof value === "string";
      const text = isString ? `"${value}"` : value.toString();
      const color = isString ? tokenColors.STRING : tokenColors.NUMBER;
      return {
        text,
        description: label,
        htmlContent: [{ value: text, color }],
        fuzzySearchKey: value + label,
      };
    });
  },
  selectProposal: insertTokenAfterArgSeparator,
});

function canAutoCompletePivotGroupValue(tokenAtCursor: EnrichedToken) {
  const functionContext = tokenAtCursor.functionContext;
  return (
    functionContext?.parent.toUpperCase() === "PIVOT.VALUE" &&
    functionContext.argPosition >= 2 && // the first two arguments are the pivot id and the measure
    functionContext.argPosition % 2 === 1 // only the odd arguments are the group by values
  );
}

function canAutoCompletePivotHeaderGroupValue(tokenAtCursor: EnrichedToken) {
  const functionContext = tokenAtCursor.functionContext;
  return (
    functionContext?.parent.toUpperCase() === "PIVOT.HEADER" &&
    functionContext.argPosition >= 1 && // the first argument is the pivot id
    functionContext.argPosition % 2 === 0 // only the even arguments are the group by values
  );
}
