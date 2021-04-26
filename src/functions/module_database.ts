import { _lt } from "../translation";
import { AddFunctionDescription } from "../types";
import { args } from "./arguments";
import { assert, toString, visitMatchingRanges } from "./helpers";
import { PRODUCT, SUM } from "./module_math";
import { AVERAGE, COUNT, COUNTA, MAX, MIN, STDEV, STDEVP, VAR, VARP } from "./module_statistical";

function getMatchingCells(database: any, field: any, criteria: any): any[] {
  // Example :
  //
  // # DATABASE             # CRITERIA          # field = "C"
  //
  // | A | B | C |          | A | C |
  // |===========|          |=======|
  // | 1 | x | j |          |<2 | j |
  // | 1 | Z | k |          |   | 7 |
  // | 5 | y | 7 |

  // 1 - Select coordinates of database columns
  const indexColNameDB = new Map();
  const dimRowDB = database.length;
  for (let indexCol = dimRowDB - 1; indexCol >= 0; indexCol--) {
    indexColNameDB.set(toString(database[indexCol][0]).toUpperCase(), indexCol);
  } // Ex: indexColNameDB = {A => 0, B => 1, C => 2}

  // 2 - Check if the field parameter exists in the column names of the database
  const typeofField = typeof field;
  let index;
  if (typeofField === "number") {
    // field may either be a text label corresponding to a column header in the
    // first row of database or a numeric index indicating which column to consider,
    // where the first column has the value 1.
    index = Math.trunc(field) - 1;

    assert(
      () => 0 <= index && index <= dimRowDB - 1,
      _lt(
        "The field (%s) must be between 1 and %s inclusive.",
        field.toString(),
        dimRowDB.toString()
      )
    );
  } else {
    const colName = typeofField === "string" ? field.toUpperCase() : field;
    index = indexColNameDB.get(colName);

    assert(
      () => index !== undefined,
      _lt(
        "The field (%s) must be one of %s.",
        field.toString(),
        [...indexColNameDB.keys()].toString()
      )
    );
  } // Ex: index = 2

  // 3 - For each criteria row, find database row that correspond
  const dimColCriteria = criteria[0].length;

  assert(
    () => dimColCriteria >= 2,
    _lt(
      "The criteria range contains %s row, it must be at least 2 rows.",
      dimColCriteria.toString()
    )
  );

  let matchingRows: Set<number> = new Set();
  const dimColDB = database[0].length;
  for (let indexRow = 1; indexRow < dimColCriteria; indexRow++) {
    let args: any[] = [];
    let existColNameDB = true;
    for (let indexCol = 0; indexCol < criteria.length; indexCol++) {
      const currentName = toString(criteria[indexCol][0]).toUpperCase();
      const indexColDB = indexColNameDB.get(currentName);
      const criter = criteria[indexCol][indexRow];
      if (criter !== undefined) {
        if (indexColDB !== undefined) {
          args.push([database[indexColDB].slice(1, dimColDB)]);
          args.push(criter);
        } else {
          existColNameDB = false;
          break;
        }
      }
    }
    // Ex: args1 = [[1,1,5], "<2", ["j","k",7], "j"]
    // Ex: args2 = [["j","k",7], "7"]

    if (existColNameDB) {
      if (args.length > 0) {
        visitMatchingRanges(
          args,
          (i, j) => {
            matchingRows.add(j);
          },
          true
        );
      } else {
        // return indices of each database row when a criteria table row is void
        matchingRows = new Set(Array(dimColDB - 1).keys());
        break;
      }
    }
  } // Ex: matchingRows = {0, 2}

  // 4 - return for each database row corresponding, the cells corresponding to
  // the field parameter
  const fieldCol: any[] = database[index];
  // Ex: fieldCol = ["C", "j", "k", 7]
  const matchingCells = [...matchingRows].map((x) => fieldCol[x + 1]);
  // Ex: matchingCells = ["j", 7]

  return matchingCells;
}

const databaseArgs = args(`
  database (array) ${_lt(
    "The array or range containing the data to consider, structured in such a way that the first row contains the labels for each column's values."
  )}
  field (any) ${_lt(
    "Indicates which column in database contains the values to be extracted and operated on."
  )}
  criteria (array) ${_lt(
    "An array or range containing zero or more criteria to filter the database values by before operating."
  )}
`);

// -----------------------------------------------------------------------------
// DAVERAGE
// -----------------------------------------------------------------------------
export const DAVERAGE: AddFunctionDescription = {
  description: _lt("Average of a set of values from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (database: any, field: any, criteria: any): number {
    const cells = getMatchingCells(database, field, criteria);
    return AVERAGE.compute([cells]);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DCOUNT
// -----------------------------------------------------------------------------
export const DCOUNT: AddFunctionDescription = {
  description: _lt("Counts values from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (database: any, field: any, criteria: any): number {
    const cells = getMatchingCells(database, field, criteria);
    return COUNT.compute([cells]);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DCOUNTA
// -----------------------------------------------------------------------------
export const DCOUNTA: AddFunctionDescription = {
  description: _lt("Counts values and text from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (database: any, field: any, criteria: any): number {
    const cells = getMatchingCells(database, field, criteria);
    return COUNTA.compute([cells]);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DGET
// -----------------------------------------------------------------------------
export const DGET: AddFunctionDescription = {
  description: _lt("Single value from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (database: any, field: any, criteria: any): any {
    const cells = getMatchingCells(database, field, criteria);
    assert(() => cells.length === 1, _lt("More than one match found in DGET evaluation."));
    return cells[0];
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DMAX
// -----------------------------------------------------------------------------
export const DMAX: AddFunctionDescription = {
  description: _lt("Maximum of values from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (database: any, field: any, criteria: any): number {
    const cells = getMatchingCells(database, field, criteria);
    return MAX.compute([cells]);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DMIN
// -----------------------------------------------------------------------------
export const DMIN: AddFunctionDescription = {
  description: _lt("Minimum of values from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (database: any, field: any, criteria: any): number {
    const cells = getMatchingCells(database, field, criteria);
    return MIN.compute([cells]);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DPRODUCT
// -----------------------------------------------------------------------------
export const DPRODUCT: AddFunctionDescription = {
  description: _lt("Product of values from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (database: any, field: any, criteria: any): number {
    const cells = getMatchingCells(database, field, criteria);
    return PRODUCT.compute([cells]);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DSTDEV
// -----------------------------------------------------------------------------
export const DSTDEV: AddFunctionDescription = {
  description: _lt("Standard deviation of population sample from table."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (database: any, field: any, criteria: any): number {
    const cells = getMatchingCells(database, field, criteria);
    return STDEV.compute([cells]);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DSTDEVP
// -----------------------------------------------------------------------------
export const DSTDEVP: AddFunctionDescription = {
  description: _lt("Standard deviation of entire population from table."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (database: any, field: any, criteria: any): number {
    const cells = getMatchingCells(database, field, criteria);
    return STDEVP.compute([cells]);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DSUM
// -----------------------------------------------------------------------------
export const DSUM: AddFunctionDescription = {
  description: _lt("Sum of values from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (database: any, field: any, criteria: any): number {
    const cells = getMatchingCells(database, field, criteria);
    return SUM.compute([cells]);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DVAR
// -----------------------------------------------------------------------------
export const DVAR: AddFunctionDescription = {
  description: _lt("Variance of population sample from table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (database: any, field: any, criteria: any): number {
    const cells = getMatchingCells(database, field, criteria);
    return VAR.compute([cells]);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// DVARP
// -----------------------------------------------------------------------------
export const DVARP: AddFunctionDescription = {
  description: _lt("Variance of a population from a table-like range."),
  args: databaseArgs,
  returns: ["NUMBER"],
  compute: function (database: any, field: any, criteria: any): number {
    const cells = getMatchingCells(database, field, criteria);
    return VARP.compute([cells]);
  },
  isExported: true,
};
