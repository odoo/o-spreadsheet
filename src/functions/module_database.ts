import { _t } from "../translation";
import {
  AddFunctionDescription,
  Arg,
  FPayload,
  FPayloadNumber,
  Locale,
  Matrix,
  Maybe,
} from "../types";
import { EvaluationError } from "../types/errors";
import { arg } from "./arguments";
import { assert, toString, visitMatchingRanges } from "./helpers";
import { PRODUCT, SUM } from "./module_math";
import { AVERAGE, COUNT, COUNTA, MAX, MIN, STDEV, STDEVP, VAR, VARP } from "./module_statistical";

function getMatchingCells(
  database: Matrix<FPayload>,
  field: Maybe<FPayload>,
  criteria: Matrix<FPayload>,
  locale: Locale
): any[] {
  // Example

  // # DATABASE             # CRITERIA          # field = "C"
  //
  // | A | B | C |          | A | C |
  // |===========|          |=======|
  // | 1 | x | j |          |<2 | j |
  // | 1 | Z | k |          |   | 7 |
  // | 5 | y | 7 |

  // 1 - Select coordinates of database columns ----------------------------------------------------

  const indexColNameDB: Map<string, number> = new Map();
  const dimRowDB = database.length;
  for (let indexCol = dimRowDB - 1; indexCol >= 0; indexCol--) {
    indexColNameDB.set(toString(database[indexCol][0]).toUpperCase(), indexCol);
  }

  // Example continuation: indexColNameDB = {"A" => 0, "B" => 1, "C" => 2}

  // 2 - Check if the field parameter exists in the column names of the database -------------------

  // field may either be a text label corresponding to a column header in the
  // first row of database or a numeric index indicating which column to consider,
  // where the first column has the value 1.
  const fieldValue = field?.value;

  if (typeof fieldValue !== "number" && typeof fieldValue !== "string") {
    throw new EvaluationError(_t("The field must be a number or a string"));
  }

  let index: number;
  if (typeof fieldValue === "number") {
    index = Math.trunc(fieldValue) - 1;
    if (index < 0 || dimRowDB - 1 < index) {
      throw new EvaluationError(
        _t(
          "The field (%(fieldValue)s) must be one of %(dimRowDB)s or must be a number between 1 and %s inclusive.",
          {
            fieldValue: fieldValue.toString(),
            dimRowDB: dimRowDB.toString(),
          }
        )
      );
    }
  } else {
    const colName = toString(field).toUpperCase();
    index = indexColNameDB.get(colName) ?? -1;
    if (index === -1) {
      throw new EvaluationError(
        _t(
          "The field (%s) must be one of %s.",
          toString(field),
          [...indexColNameDB.keys()].toString()
        )
      );
    }
  }

  // Example continuation: index = 2

  // 3 - For each criteria row, find database row that correspond ----------------------------------

  const dimColCriteria = criteria[0].length;

  if (dimColCriteria < 2) {
    throw new EvaluationError(
      _t(
        "The criteria range contains %s row, it must be at least 2 rows.",
        dimColCriteria.toString()
      )
    );
  }

  let matchingRows: Set<number> = new Set();
  const dimColDB = database[0].length;
  for (let indexRow = 1; indexRow < dimColCriteria; indexRow++) {
    let args: Arg[] = [];
    let existColNameDB = true;
    for (let indexCol = 0; indexCol < criteria.length; indexCol++) {
      const currentName = toString(criteria[indexCol][0]).toUpperCase();
      const indexColDB = indexColNameDB.get(currentName);
      const criter = criteria[indexCol][indexRow];
      if (criter.value !== null) {
        if (indexColDB !== undefined) {
          args.push([database[indexColDB].slice(1, dimColDB)]);
          args.push(criter);
        } else {
          existColNameDB = false;
          break;
        }
      }
    }
    // Example continuation: args1 = [[1,1,5], "<2", ["j","k",7], "j"]
    // Example continuation: args2 = [["j","k",7], "7"]

    if (existColNameDB) {
      if (args.length > 0) {
        visitMatchingRanges(
          args,
          (i, j) => {
            matchingRows.add(j);
          },
          locale,
          true
        );
      } else {
        // return indices of each database row when a criteria table row is void
        matchingRows = new Set(Array(dimColDB - 1).keys());
        break;
      }
    }
  }

  // Example continuation: matchingRows = {0, 2}

  // 4 - return for each database row corresponding, the cells corresponding to the field parameter

  const fieldCol = database[index];
  // Example continuation:: fieldCol = ["C", "j", "k", 7]
  const matchingCells = [...matchingRows].map((x) => fieldCol[x + 1]);
  // Example continuation:: matchingCells = ["j", 7]

  return matchingCells;
}

const databaseArgs = [
  arg(
    "database (range)",
    _t(
      "The array or range containing the data to consider, structured in such a way that the first row contains the labels for each column's values."
    )
  ),
  arg(
    "field (any)",
    _t("Indicates which column in database contains the values to be extracted and operated on.")
  ),
  arg(
    "criteria (range)",
    _t(
      "An array or range containing zero or more criteria to filter the database values by before operating."
    )
  ),
];

// -----------------------------------------------------------------------------
// DAVERAGE
// -----------------------------------------------------------------------------
export const DAVERAGE = {
  description: _t("Average of a set of values from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (
    database: Matrix<FPayload>,
    field: Maybe<FPayload>,
    criteria: Matrix<FPayload>
  ): FPayloadNumber {
    const cells = getMatchingCells(database, field, criteria, this.locale);
    return AVERAGE.compute.bind(this)([cells]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DCOUNT
// -----------------------------------------------------------------------------
export const DCOUNT = {
  description: _t("Counts values from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (
    database: Matrix<FPayload>,
    field: Maybe<FPayload>,
    criteria: Matrix<FPayload>
  ): number {
    const cells = getMatchingCells(database, field, criteria, this.locale);
    return COUNT.compute.bind(this)([cells]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DCOUNTA
// -----------------------------------------------------------------------------
export const DCOUNTA = {
  description: _t("Counts values and text from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (
    database: Matrix<FPayload>,
    field: Maybe<FPayload>,
    criteria: Matrix<FPayload>
  ): number {
    const cells = getMatchingCells(database, field, criteria, this.locale);
    return COUNTA.compute.bind(this)([cells]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DGET
// -----------------------------------------------------------------------------
export const DGET = {
  description: _t("Single value from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (
    database: Matrix<FPayload>,
    field: Maybe<FPayload>,
    criteria: Matrix<FPayload>
  ): FPayload {
    const cells = getMatchingCells(database, field, criteria, this.locale);
    assert(() => cells.length === 1, _t("More than one match found in DGET evaluation."));
    return cells[0];
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DMAX
// -----------------------------------------------------------------------------
export const DMAX = {
  description: _t("Maximum of values from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (
    database: Matrix<FPayload>,
    field: Maybe<FPayload>,
    criteria: Matrix<FPayload>
  ): FPayloadNumber {
    const cells = getMatchingCells(database, field, criteria, this.locale);
    return MAX.compute.bind(this)([cells]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DMIN
// -----------------------------------------------------------------------------
export const DMIN = {
  description: _t("Minimum of values from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (
    database: Matrix<FPayload>,
    field: Maybe<FPayload>,
    criteria: Matrix<FPayload>
  ): FPayloadNumber {
    const cells = getMatchingCells(database, field, criteria, this.locale);
    return MIN.compute.bind(this)([cells]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DPRODUCT
// -----------------------------------------------------------------------------
export const DPRODUCT = {
  description: _t("Product of values from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (
    database: Matrix<FPayload>,
    field: Maybe<FPayload>,
    criteria: Matrix<FPayload>
  ): FPayloadNumber {
    const cells = getMatchingCells(database, field, criteria, this.locale);
    return PRODUCT.compute.bind(this)([cells]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DSTDEV
// -----------------------------------------------------------------------------
export const DSTDEV = {
  description: _t("Standard deviation of population sample from table."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (
    database: Matrix<FPayload>,
    field: Maybe<FPayload>,
    criteria: Matrix<FPayload>
  ): number {
    const cells = getMatchingCells(database, field, criteria, this.locale);
    return STDEV.compute.bind(this)([cells]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DSTDEVP
// -----------------------------------------------------------------------------
export const DSTDEVP = {
  description: _t("Standard deviation of entire population from table."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (
    database: Matrix<FPayload>,
    field: Maybe<FPayload>,
    criteria: Matrix<FPayload>
  ): number {
    const cells = getMatchingCells(database, field, criteria, this.locale);
    return STDEVP.compute.bind(this)([cells]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DSUM
// -----------------------------------------------------------------------------
export const DSUM = {
  description: _t("Sum of values from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (
    database: Matrix<FPayload>,
    field: Maybe<FPayload>,
    criteria: Matrix<FPayload>
  ): FPayloadNumber {
    const cells = getMatchingCells(database, field, criteria, this.locale);
    return SUM.compute.bind(this)([cells]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DVAR
// -----------------------------------------------------------------------------
export const DVAR = {
  description: _t("Variance of population sample from table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (
    database: Matrix<FPayload>,
    field: Maybe<FPayload>,
    criteria: Matrix<FPayload>
  ): number {
    const cells = getMatchingCells(database, field, criteria, this.locale);
    return VAR.compute.bind(this)([cells]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// DVARP
// -----------------------------------------------------------------------------
export const DVARP = {
  description: _t("Variance of a population from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (
    database: Matrix<FPayload>,
    field: Maybe<FPayload>,
    criteria: Matrix<FPayload>
  ): number {
    const cells = getMatchingCells(database, field, criteria, this.locale);
    return VARP.compute.bind(this)([cells]);
  },
  isExported: true,
} satisfies AddFunctionDescription;
