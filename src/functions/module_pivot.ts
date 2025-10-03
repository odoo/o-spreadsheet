import { PIVOT_MAX_NUMBER_OF_CELLS } from "@odoo/o-spreadsheet-engine/constants";
import { arg } from "@odoo/o-spreadsheet-engine/functions/arguments";
import {
  addPivotDependencies,
  assertDomainLength,
  assertMeasureExist,
  getPivotId,
} from "@odoo/o-spreadsheet-engine/functions/helper_lookup";
import { toBoolean, toNumber, toString } from "@odoo/o-spreadsheet-engine/functions/helpers";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { CellErrorType, EvaluationError } from "@odoo/o-spreadsheet-engine/types/errors";
import { getPivotTooBigErrorMessage } from "../components/translations_terms";
import { range } from "../helpers/index";
import { addAlignFormatToPivotHeader } from "../helpers/pivot/pivot_helpers";
import {
  AddFunctionDescription,
  FunctionResultObject,
  Matrix,
  Maybe,
  PivotVisibilityOptions,
} from "../types";

//--------------------------------------------------------------------------
// Pivot functions
//--------------------------------------------------------------------------

// PIVOT.VALUE

export const PIVOT_VALUE = {
  description: _t("Get the value from a pivot."),
  args: [
    arg("pivot_id (number,string)", _t("ID of the pivot.")),
    arg("measure_name (string)", _t("Name of the measure.")),
    arg("domain_field_name (string,repeating)", _t("Field name.")),
    arg("domain_value (number,string,boolean,repeating)", _t("Value.")),
  ],
  compute: function (
    formulaId: Maybe<FunctionResultObject>,
    measureName: Maybe<FunctionResultObject>,
    ...domainArgs: Maybe<FunctionResultObject>[]
  ) {
    const _pivotFormulaId = toString(formulaId);
    const _measure = toString(measureName);
    const pivotId = getPivotId(_pivotFormulaId, this.getters);
    assertMeasureExist(pivotId, _measure, this.getters);
    assertDomainLength(domainArgs);
    const pivot = this.getters.getPivot(pivotId);
    const coreDefinition = this.getters.getPivotCoreDefinition(pivotId);

    addPivotDependencies(
      this,
      coreDefinition,
      coreDefinition.measures.filter((m) => m.id === _measure)
    );
    pivot.init({ reload: pivot.needsReevaluation });
    const error = pivot.assertIsValid({ throwOnError: false });
    if (error) {
      return error;
    }

    if (!pivot.areDomainArgsFieldsValid(domainArgs)) {
      const suggestion = _t(
        "Consider using a dynamic pivot formula: %s. Or re-insert the static pivot from the Data menu.",
        `=PIVOT(${_pivotFormulaId})`
      );
      return {
        value: CellErrorType.GenericError,
        message: _t("Dimensions don't match the pivot definition") + ". " + suggestion,
      };
    }
    const domain = pivot.parseArgsToPivotDomain(domainArgs);
    if (this.getters.getActiveSheetId() === this.__originSheetId) {
      this.getters.getPivotPresenceTracker(pivotId)?.trackValue(_measure, domain);
    }
    return pivot.getPivotCellValueAndFormat(_measure, domain);
  },
} satisfies AddFunctionDescription;

// PIVOT.HEADER

export const PIVOT_HEADER = {
  description: _t("Get the header of a pivot."),
  args: [
    arg("pivot_id (number,string)", _t("ID of the pivot.")),
    arg("domain_field_name (string,repeating)", _t("Field name.")),
    arg("domain_value (number,string,value,repeating)", _t("Value.")),
  ],
  compute: function (
    pivotId: Maybe<FunctionResultObject>,
    ...domainArgs: Maybe<FunctionResultObject>[]
  ) {
    const _pivotFormulaId = toString(pivotId);
    const _pivotId = getPivotId(_pivotFormulaId, this.getters);
    assertDomainLength(domainArgs);
    const pivot = this.getters.getPivot(_pivotId);
    const coreDefinition = this.getters.getPivotCoreDefinition(_pivotId);
    addPivotDependencies(this, coreDefinition, []);
    pivot.init({ reload: pivot.needsReevaluation });
    const error = pivot.assertIsValid({ throwOnError: false });
    if (error) {
      return error;
    }
    if (!pivot.areDomainArgsFieldsValid(domainArgs)) {
      const suggestion = _t(
        "Consider using a dynamic pivot formula: %s. Or re-insert the static pivot from the Data menu.",
        `=PIVOT(${_pivotFormulaId})`
      );
      return {
        value: CellErrorType.GenericError,
        message: _t("Dimensions don't match the pivot definition") + ". " + suggestion,
      };
    }
    const domain = pivot.parseArgsToPivotDomain(domainArgs);
    if (this.getters.getActiveSheetId() === this.__originSheetId) {
      this.getters.getPivotPresenceTracker(_pivotId)?.trackHeader(domain);
    }
    const lastNode = domain.at(-1);
    if (lastNode?.field === "measure") {
      return pivot.getPivotMeasureValue(toString(lastNode.value), domain);
    }
    const { value, format } = pivot.getPivotHeaderValueAndFormat(domain);
    return {
      value,
      format:
        !lastNode || lastNode.field === "measure" || lastNode.value === "false"
          ? undefined
          : format,
    };
  },
} satisfies AddFunctionDescription;

export const PIVOT = {
  description: _t("Get a pivot table."),
  args: [
    arg("pivot_id (string)", _t("ID of the pivot.")),
    arg("row_count (number, optional)", _t("number of rows")),
    arg("include_total (boolean, default=TRUE)", _t("Whether to include total/sub-totals or not.")),
    arg(
      "include_column_titles (boolean, default=TRUE)",
      _t("Whether to include the column titles or not.")
    ),
    arg("column_count (number, optional)", _t("number of columns")),
    arg(
      "include_measure_titles (boolean, default=TRUE)",
      _t("Whether to include the measure titles row or not.")
    ),
  ],
  compute: function (
    pivotFormulaId: Maybe<FunctionResultObject>,
    rowCount: Maybe<FunctionResultObject> = { value: 10000 },
    includeTotal: Maybe<FunctionResultObject> = { value: true },
    includeColumnHeaders: Maybe<FunctionResultObject> = { value: true },
    columnCount: Maybe<FunctionResultObject> = { value: Number.MAX_VALUE },
    includeMeasureTitles: Maybe<FunctionResultObject> = { value: true }
  ) {
    const _pivotFormulaId = toString(pivotFormulaId);
    const _rowCount = toNumber(rowCount, this.locale);
    if (_rowCount < 0) {
      return new EvaluationError(_t("The number of rows must be positive."));
    }
    const _columnCount = toNumber(columnCount, this.locale);
    if (_columnCount < 0) {
      return new EvaluationError(_t("The number of columns must be positive."));
    }
    const visibilityOptions: PivotVisibilityOptions = {
      displayColumnHeaders: toBoolean(includeColumnHeaders),
      displayTotals: toBoolean(includeTotal),
      displayMeasuresRow: toBoolean(includeMeasureTitles),
    };

    const pivotId = getPivotId(_pivotFormulaId, this.getters);
    const pivot = this.getters.getPivot(pivotId);
    const coreDefinition = this.getters.getPivotCoreDefinition(pivotId);
    addPivotDependencies(this, coreDefinition, coreDefinition.measures);
    pivot.init({ reload: pivot.needsReevaluation });
    const error = pivot.assertIsValid({ throwOnError: false });
    if (error) {
      return error;
    }
    const table = pivot.getCollapsedTableStructure();
    if (table.numberOfCells > PIVOT_MAX_NUMBER_OF_CELLS) {
      return new EvaluationError(getPivotTooBigErrorMessage(table.numberOfCells, this.locale));
    }
    const cells = table.getPivotCells(visibilityOptions);

    let headerRows = 0;
    if (visibilityOptions.displayColumnHeaders) {
      headerRows = table.columns.length - 1;
    }
    if (visibilityOptions.displayMeasuresRow) {
      headerRows++;
    }
    const pivotTitle = this.getters.getPivotName(pivotId);
    const tableHeight = Math.min(headerRows + _rowCount, cells[0].length);
    if (tableHeight === 0) {
      return [[{ value: pivotTitle }]];
    }
    const tableWidth = Math.min(1 + _columnCount, cells.length);
    const result: Matrix<FunctionResultObject> = [];
    for (const col of range(0, tableWidth)) {
      result[col] = [];
      for (const row of range(0, tableHeight)) {
        const pivotCell = cells[col][row];
        switch (pivotCell.type) {
          case "EMPTY":
            result[col].push({ value: "" });
            break;
          case "HEADER":
            const valueAndFormat = pivot.getPivotHeaderValueAndFormat(pivotCell.domain);
            result[col].push(addAlignFormatToPivotHeader(pivotCell.domain, valueAndFormat));
            break;
          case "MEASURE_HEADER":
            result[col].push(pivot.getPivotMeasureValue(pivotCell.measure, pivotCell.domain));
            break;
          case "VALUE":
            result[col].push(pivot.getPivotCellValueAndFormat(pivotCell.measure, pivotCell.domain));
            break;
        }
      }
    }
    if (visibilityOptions.displayColumnHeaders || visibilityOptions.displayMeasuresRow) {
      result[0][0] = { value: pivotTitle };
    }
    return result;
  },
} satisfies AddFunctionDescription;
