import {
  functionCache,
  FunctionResultObject,
  Matrix,
  Maybe,
  Model,
  UnboundedZone,
} from "../../src";
import { functionRegistry } from "../../src/functions/function_registry";

import { CompiledFormula } from "../../src/formulas/compiler";
import { generateSubMatrix } from "../../src/functions/helpers";
import { addToRegistry, evaluateCell, evaluateCellFormat } from "../test_helpers/helpers";

function compiledBaseFunction(formula: string): CompiledFormula {
  for (const f in functionCache) {
    delete functionCache[f];
  }
  return compileFromCompleteFormula(formula);
}
const debugConsole = console.debug;
console.debug = () => {};
const fakeModel = new Model();
console.debug = debugConsole;
function compileFromCompleteFormula(formula: string) {
  return CompiledFormula.Compile(formula, "no_sheet", fakeModel.getters);
}

describe("expression compiler", () => {
  test.each(["=1", "=true", `="abc"`])("some arithmetic expressions", (formula) => {
    const compiledFormula = compiledBaseFunction(formula);
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test.each(["=1 + 3", "=2 * 3", "=2 - 3", "=2 / 3", "=-3", "=(3 + 1) * (-1 + 4)"])(
    "some arithmetic expressions",
    (formula) => {
      const compiledFormula = compiledBaseFunction(formula);
      expect(compiledFormula.execute.toString()).toMatchSnapshot();
    }
  );

  test.each(["=sum(1,2)", '=sum(true, "")', "=sum(1,,2)"])(
    "some arithmetic expressions",
    (formula) => {
      const compiledFormula = compiledBaseFunction(formula);
      expect(compiledFormula.execute.toString()).toMatchSnapshot();
    }
  );

  test.each(["=1%", "=(2+5)%", "=A1%"])("some arithmetic expressions", (formula) => {
    const compiledFormula = compiledBaseFunction(formula);
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("read some values and functions", () => {
    const compiledFormula = compiledBaseFunction("=A1 + sum(A2:C3)");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("with the same reference multiple times", () => {
    const compiledFormula = compiledBaseFunction("=SUM(A1, A1, A2)");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("expression with $ref", () => {
    const compiledFormula = compiledBaseFunction("=$A1+$A$2+A$3");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("expression with references with a sheet", () => {
    const compiledFormula = compiledBaseFunction("=Sheet34!B3");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("expressions with a debugger", () => {
    const compiledFormula = compiledBaseFunction("=? A1 / 2");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("cells are converted to ranges if function require a range", () => {
    const compiledFormula = compiledBaseFunction("=sum(A1)");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("array literal expression", () => {
    const compiledFormula = compiledBaseFunction("={1,2;3,4}");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("array literal expression with one row only", () => {
    const compiledFormula = compiledBaseFunction("={1,2,3,4}");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("array literal expression with one column only", () => {
    const compiledFormula = compiledBaseFunction("={1;2;3;4}");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("expression with cell#", () => {
    const compiledFormula = compiledBaseFunction("=A1#");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("expression with range#", () => {
    const compiledFormula = compiledBaseFunction("=A1:B2#");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });
});

describe("compile functions", () => {
  describe("check number of arguments", () => {
    test("with basic arguments", () => {
      addToRegistry(functionRegistry, "ANYFUNCTION", {
        description: "any function",
        compute: () => {
          return { value: true };
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"] },
        ],
      });
      expect(compiledBaseFunction("=ANYFUNCTION()").isBadExpression).toBe(true);
      expect(compiledBaseFunction("=ANYFUNCTION(1)").isBadExpression).toBe(true);
      expect(compiledBaseFunction("=ANYFUNCTION(1,2)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=ANYFUNCTION(1,2,3)").isBadExpression).toBe(true);
    });

    test("with optional argument", () => {
      addToRegistry(functionRegistry, "OPTIONAL", {
        description: "function with optional argument",
        compute: () => {
          return { value: true };
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], optional: true },
        ],
      });
      expect(compiledBaseFunction("=OPTIONAL(1)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=OPTIONAL(1,2)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=OPTIONAL(1,2,3)").isBadExpression).toBe(true);
    });

    test("with default argument", () => {
      addToRegistry(functionRegistry, "USEDEFAULTARG", {
        description: "function with a default argument",
        compute: () => {
          return { value: true };
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], default: true, defaultValue: 42 },
        ],
      });
      expect(compiledBaseFunction("=USEDEFAULTARG(1)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=USEDEFAULTARG(1,2)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=USEDEFAULTARG(1,2,3)").isBadExpression).toBe(true);
    });

    test("with repeatable argument", () => {
      addToRegistry(functionRegistry, "REPEATABLE", {
        description: "function with repeatable argument",
        compute: (arg) => {
          return { value: true };
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], repeating: true },
        ],
      });
      expect(compiledBaseFunction("=REPEATABLE(1)").isBadExpression).toBe(true);
      expect(compiledBaseFunction("=REPEATABLE(1,2)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=REPEATABLE(1,2,3,4,5,6)").isBadExpression).toBe(false);
    });

    test("with more than one repeatable argument", () => {
      addToRegistry(functionRegistry, "REPEATABLES", {
        description: "any function",
        compute: (arg) => {
          return { value: true };
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], repeating: true },
          { name: "arg3", description: "", type: ["ANY"], repeating: true },
        ],
      });
      expect(compiledBaseFunction("=REPEATABLES(1)").isBadExpression).toBe(true);
      expect(compiledBaseFunction("=REPEATABLES(1, 2)").isBadExpression).toBe(true);
      expect(compiledBaseFunction("=REPEATABLES(1, 2, 3)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=REPEATABLES(1, 2, 3, 4)").isBadExpression).toBe(true);
      expect(compiledBaseFunction("=REPEATABLES(1, 2, 3, 4, 5)").isBadExpression).toBe(false);
    });

    test("with optional repeatable argument", () => {
      addToRegistry(functionRegistry, "REPEATABLE_AND_OPTIONAL", {
        description: "function with repeatable argument",
        compute: (arg) => {
          return { value: true };
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], repeating: true, optional: true },
        ],
      });
      expect(compiledBaseFunction("=REPEATABLE_AND_OPTIONAL(1)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=REPEATABLE_AND_OPTIONAL(1,2)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=REPEATABLE_AND_OPTIONAL(1,2,3,4,5,6)").isBadExpression).toBe(
        false
      );
    });

    test("with more than one optional repeatable argument", () => {
      addToRegistry(functionRegistry, "REPEATABLES_AND_OPTIONALS", {
        description: "any function",
        compute: (arg) => {
          return { value: true };
        },
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], repeating: true, optional: true },
          { name: "arg3", description: "", type: ["ANY"], repeating: true, optional: true },
        ],
      });
      expect(compiledBaseFunction("=REPEATABLES_AND_OPTIONALS(1)").isBadExpression).toBe(false);
      expect(compiledBaseFunction("=REPEATABLES_AND_OPTIONALS(1, 2)").isBadExpression).toBe(true);
      expect(compiledBaseFunction("=REPEATABLES_AND_OPTIONALS(1, 2, 3)").isBadExpression).toBe(
        false
      );
      expect(compiledBaseFunction("=REPEATABLES_AND_OPTIONALS(1, 2, 3, 4)").isBadExpression).toBe(
        true
      );
      expect(
        compiledBaseFunction("=REPEATABLES_AND_OPTIONALS(1, 2, 3, 4, 5)").isBadExpression
      ).toBe(false);
    });
  });

  describe("interpret arguments", () => {
    beforeEach(() => {
      addToRegistry(functionRegistry, "ISSECONDARGUNDEFINED", {
        description: "any function",
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"] },
        ],
        compute: (arg1, arg2) => {
          return {
            value: arg2 === undefined,
            format: arg2 === undefined ? '"TRUE"' : '"FALSE"',
          };
        },
      });

      addToRegistry(functionRegistry, "SECONDARGDEFAULTVALUEEQUAL42", {
        description: "function with a default argument",
        args: [
          { name: "arg1", description: "", type: ["ANY"] },
          { name: "arg2", description: "", type: ["ANY"], default: true, defaultValue: 42 },
        ],
        compute: (arg1, arg2 = { value: 42, format: "42" }) => {
          return !Array.isArray(arg2) && arg2.value === 42 && arg2.format === "42"
            ? { value: true, format: '"TRUE"' }
            : { value: false, format: '"FALSE"' };
        },
      });
    });
    test("empty value interpreted as undefined", () => {
      expect(evaluateCell("A1", { A1: "=ISSECONDARGUNDEFINED(1,)" })).toBe(true);
      expect(evaluateCellFormat("A1", { A1: "=ISSECONDARGUNDEFINED(1,)" })).toBe('"TRUE"');
    });

    test("if default value --> empty value interpreted as default value", () => {
      expect(evaluateCell("A1", { A1: "=SECONDARGDEFAULTVALUEEQUAL42(1,)" })).toBe(true);
      expect(evaluateCellFormat("A1", { A1: "=SECONDARGDEFAULTVALUEEQUAL42(1,)" })).toBe('"TRUE"');
    });

    test("if default value --> non-value interpreted as default value", () => {
      expect(evaluateCell("A1", { A1: "=SECONDARGDEFAULTVALUEEQUAL42(1)" })).toBe(true);
      expect(evaluateCellFormat("A1", { A1: "=SECONDARGDEFAULTVALUEEQUAL42(1)" })).toBe('"TRUE"');
    });
  });

  test("function cache ignore spaces in functions", () => {
    compiledBaseFunction("=SUM(A1)");
    expect(Object.keys(functionCache)).toEqual(["=SUM(|C|)"]);
    compiledBaseFunction("= SUM(A1)");
    compiledBaseFunction("=SUM( A1)");
    compiledBaseFunction("= SUM(A1 )");
    compiledBaseFunction("= SUM   (    A1    )");
    expect(Object.keys(functionCache)).toEqual(["=SUM(|C|)"]);
  });

  test("simple symbol", () => {
    const compiledFormula = compiledBaseFunction("=Hello");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("simple in a function", () => {
    const compiledFormula = compiledBaseFunction("=SUM(Hello)");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("two different symbols", () => {
    const compiledFormula = compiledBaseFunction("=Hello+world");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("same symbol twice", () => {
    const compiledFormula = compiledBaseFunction("=Hello+Hello");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("symbol with optional single quotes", () => {
    const compiledFormula = compiledBaseFunction("='Hello'");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("symbol with space and with single quotes", () => {
    const compiledFormula = compiledBaseFunction("='Hello world'");
    expect(compiledFormula.execute.toString()).toMatchSnapshot();
  });

  test("symbol with space and without single quotes", () => {
    expect(compiledBaseFunction("=Hello world").isBadExpression).toBe(true);
  });

  describe("function lazy arguments", () => {
    let counter = 0;

    beforeEach(() => {
      counter = 0;

      // /////////////////////////////
      // FORMULA WITHOUT LAZY ARGUMENT
      // /////////////////////////////

      // concerning formula examples:
      // COS / UPPER
      addToRegistry(functionRegistry, "ACCEPT_SCALAR_RETURN_SCALAR", {
        description: "function that return the scalar given as argument",
        compute: (arg: Maybe<FunctionResultObject>) => {
          counter++;
          return arg || { value: null };
        },
        args: [{ name: "arg", description: "", type: ["ANY"] }],
      });

      // concerning formula examples:
      // MUNIT / SEQUENCE
      addToRegistry(functionRegistry, "ACCEPT_SCALAR_RETURN_RANGE", {
        description:
          "function that return the scalar given as argument placed at each position of a range",
        computeArray: (zone: UnboundedZone, arg: Maybe<FunctionResultObject>) => {
          const obj = arg || { value: null };
          return generateSubMatrix(zone, 2, 2, () => {
            counter++;
            return obj;
          });
        },
        args: [{ name: "arg", description: "", type: ["ANY"] }],
      });

      // concerning formula examples:
      // SUM / AVERAGE
      addToRegistry(functionRegistry, "ACCEPT_RANGE_RETURN_SCALAR", {
        description: "function that return the first element of the range given as argument",
        compute: (arg: Matrix<FunctionResultObject>) => {
          counter++;
          return arg[0][0];
        },
        args: [{ name: "arg", description: "", type: ["RANGE"], acceptMatrix: true }],
      });

      // concerning formula examples:
      // TRANSPOSE / MMULT
      addToRegistry(functionRegistry, "ACCEPT_RANGE_RETURN_RANGE", {
        description: "function that return the range given as argument",
        computeArray: (zone: UnboundedZone, arg: Matrix<FunctionResultObject>) => {
          return generateSubMatrix(zone, arg.length, arg[0].length, () => {
            counter++;
            return { value: counter };
          });
        },
        args: [{ name: "arg", description: "", type: ["RANGE"], acceptMatrix: true }],
      });

      // //////////////////////////
      // FORMULA WITH LAZY ARGUMENT
      // //////////////////////////

      // // DON'T KNOW IF THIS PATTERN EXIST
      // addToRegistry(functionRegistry, "ACCEPT_LAZY_SCALAR_RETURN_SCALAR", {
      //   description:
      //     "function that return the argument if today is Monday and return null otherwise",
      //   compute: (arg: Maybe<() => FunctionResultObject>) => {
      //     // Mock: force "today" to Monday so tests are deterministic
      //     const mockedDayOfWeek = 1; // 1 = Monday (Date.getDay convention)
      //     if (mockedDayOfWeek === 1 && arg) {
      //       return arg();
      //     }
      //     return { value: null };
      //   },
      //   args: [{ name: "arg1", description: "", type: ["ANY"], lazy: true }],
      // });

      // // DON'T KNOW IF THIS PATTERN EXIST
      // addToRegistry(functionRegistry, "ACCEPT_LAZY_RANGE_RETURN_SCALAR", {
      //   description: "function that return the first element of the range given as argument",
      //   compute: (arg: (zone: UnboundedZone) => Matrix<FunctionResultObject>) => {
      //     const newZone = { top: 0, left: 0, bottom: 0, right: 0 };
      //     return arg(newZone)[0][0];
      //   },
      //   args: [{ name: "arg1", description: "", type: ["RANGE"], acceptMatrix: true, lazy: true }],
      // });

      // DON'T KNOW IF THIS PATTERN EXIST
      addToRegistry(functionRegistry, "ACCEPT_LAZY_SCALAR_RETURN_RANGE", {
        description:
          "function that return a range filled with arg if today is Monday and return null otherwise",
        computeArray: (zone: UnboundedZone, arg: Maybe<() => FunctionResultObject>) => {
          // Mock: force "today" to Monday so tests are deterministic
          const mockedDayOfWeek = 1; // 1 = Monday (Date.getDay convention)
          return generateSubMatrix(zone, 2, 2, () => {
            return mockedDayOfWeek === 1 && arg ? arg() : { value: null };
          });
        },
        args: [{ name: "arg", description: "", type: ["ANY"], lazy: true }],
      });

      // main case of the lazy evaluation
      // concerning formula examples:
      // COLUMNS / ROWS / ARRAY.CONSTRAIN
      addToRegistry(functionRegistry, "ACCEPT_LAZY_RANGE_RETURN_RANGE", {
        description: "function that return the first column of the range given as argument",
        computeArray: (
          zone: UnboundedZone,
          arg: (zone: UnboundedZone) => Matrix<FunctionResultObject>
        ) => {
          const newZone = { top: zone.top, left: 0, bottom: zone.bottom, right: 0 };
          return arg(newZone);
        },
        args: [{ name: "arg", description: "", type: ["RANGE"], acceptMatrix: true, lazy: true }],
      });
    });

    // /////////////////////////////
    // FORMULA WITHOUT LAZY ARGUMENT
    // /////////////////////////////

    test("pass a scalar as scalar argument --> arg is not encapsulated", () => {
      expect(
        compiledBaseFunction("=ACCEPT_SCALAR_RETURN_SCALAR(A1)").execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_SCALAR_RETURN_SCALAR(ACCEPT_SCALAR_RETURN_SCALAR(42))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_SCALAR_RETURN_SCALAR(ACCEPT_RANGE_RETURN_SCALAR(A1:A2))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction("=ACCEPT_SCALAR_RETURN_RANGE(42)").execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_SCALAR_RETURN_RANGE(ACCEPT_SCALAR_RETURN_SCALAR(42))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_SCALAR_RETURN_RANGE(ACCEPT_RANGE_RETURN_SCALAR(A1:A2))"
        ).execute.toString()
      ).toMatchSnapshot();
    });

    test("pass a range as range argument --> arg is not encapsulated", () => {
      expect(
        compiledBaseFunction("=ACCEPT_RANGE_RETURN_SCALAR(A1:A2)").execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_RANGE_RETURN_SCALAR(ACCEPT_SCALAR_RETURN_RANGE(42))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_RANGE_RETURN_SCALAR(ACCEPT_RANGE_RETURN_RANGE(A1:A2))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction("=ACCEPT_RANGE_RETURN_RANGE(A1:A2)").execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_RANGE_RETURN_RANGE(ACCEPT_SCALAR_RETURN_RANGE(42))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_RANGE_RETURN_RANGE(ACCEPT_RANGE_RETURN_RANGE(A1:A2))"
        ).execute.toString()
      ).toMatchSnapshot();
    });

    // note: in practice, zone check is done during respective compute function.
    test("pass a scalar as range argument --> arg is not encapsulated", () => {
      expect(
        compiledBaseFunction("=ACCEPT_RANGE_RETURN_SCALAR(42)").execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_RANGE_RETURN_SCALAR(ACCEPT_SCALAR_RETURN_SCALAR(42))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_RANGE_RETURN_SCALAR(ACCEPT_RANGE_RETURN_SCALAR(A1:A2))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction("=ACCEPT_RANGE_RETURN_RANGE(42)").execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_RANGE_RETURN_RANGE(ACCEPT_RANGE_RETURN_SCALAR(42))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_RANGE_RETURN_RANGE(ACCEPT_RANGE_RETURN_RANGE(A1:A2))"
        ).execute.toString()
      ).toMatchSnapshot();
    });

    test("pass a range as scalar argument (VECTORIZATION) --> arg is not encapsulated", () => {
      expect(
        compiledBaseFunction("=ACCEPT_SCALAR_RETURN_SCALAR(A1:A2)").execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_SCALAR_RETURN_SCALAR(ACCEPT_SCALAR_RETURN_RANGE(42))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_SCALAR_RETURN_SCALAR(ACCEPT_RANGE_RETURN_RANGE(A1:A2))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction("=ACCEPT_SCALAR_RETURN_RANGE(A1:A2)").execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_SCALAR_RETURN_RANGE(ACCEPT_SCALAR_RETURN_RANGE(42))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_SCALAR_RETURN_RANGE(ACCEPT_RANGE_RETURN_RANGE(A1:A2))"
        ).execute.toString()
      ).toMatchSnapshot();
    });

    // TODO: pass a vector as scalar (VECTORIZATION) --> arg is not encapsulated
    // TODO: pass a vector as range (VECTORIZATION) --> arg is not encapsulated

    // //////////////////////////
    // FORMULA WITH LAZY ARGUMENT
    // //////////////////////////

    // DON'T KNOW IF THIS PATTERN EXIST IN PRACTICE. BUT WORKS AT COMPILE TIME
    test("pass a scalar as lazy scalar argument --> arg is encapsulated without zone", () => {
      expect(
        compiledBaseFunction("=ACCEPT_LAZY_SCALAR_RETURN_RANGE(42)").execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_LAZY_SCALAR_RETURN_RANGE(ACCEPT_SCALAR_RETURN_SCALAR(42))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_LAZY_SCALAR_RETURN_RANGE(ACCEPT_RANGE_RETURN_SCALAR(A1:A2))"
        ).execute.toString()
      ).toMatchSnapshot();
    });

    // TODO: compilation isn't correct. to fix...
    // DON'T KNOW IF THIS PATTERN EXIST IN PRACTICE.
    test.skip("pass a range as lazy scalar argument (vectorization) --> arg is encapsulated with zone", () => {
      expect(
        compiledBaseFunction("=ACCEPT_LAZY_SCALAR_RETURN_RANGE(A1:A2)").execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_LAZY_SCALAR_RETURN_RANGE(ACCEPT_SCALAR_RETURN_RANGE(42))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_LAZY_SCALAR_RETURN_RANGE(ACCEPT_RANGE_RETURN_RANGE(A1:A2))"
        ).execute.toString()
      ).toMatchSnapshot();
    });

    // main case of the lazy evaluation
    test("pass a range as lazy range argument --> arg is encapsulated with zone", () => {
      expect(
        compiledBaseFunction("=ACCEPT_LAZY_RANGE_RETURN_RANGE(A1:A2)").execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_LAZY_RANGE_RETURN_RANGE(ACCEPT_SCALAR_RETURN_RANGE(42))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_LAZY_RANGE_RETURN_RANGE(ACCEPT_RANGE_RETURN_RANGE(A1:A2))"
        ).execute.toString()
      ).toMatchSnapshot();
    });

    // TODO: in this case, arg is encapsulated but zone is not used. compilation should treat this special case
    // and return error when the zone isn't {top:0, left:0, bottom:0, right:0}
    test.skip("pass a scalar as lazy range argument --> arg is encapsulated with zone", () => {
      expect(
        compiledBaseFunction("=ACCEPT_LAZY_RANGE_RETURN_RANGE(42)").execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_LAZY_RANGE_RETURN_RANGE(ACCEPT_SCALAR_RETURN_SCALAR(42))"
        ).execute.toString()
      ).toMatchSnapshot();

      expect(
        compiledBaseFunction(
          "=ACCEPT_LAZY_RANGE_RETURN_RANGE(ACCEPT_RANGE_RETURN_SCALAR(A1:A2))"
        ).execute.toString()
      ).toMatchSnapshot();
    });

    // TODO: pass a vector as lazy range argument --> arg is encapsulated with zone
    // TODO: pass a vector as lazy scalar argument --> arg is encapsulated with zone

    // /////////////////////////////////////
    // PARTIAL EVALUATION WITH LAZY ARGUMENT
    // /////////////////////////////////////

    test("function with lazy range argument can be implemented to compute arguments partially", () => {
      evaluateCell("A1", {
        A1: "=ACCEPT_LAZY_RANGE_RETURN_RANGE(ACCEPT_RANGE_RETURN_RANGE(B1:C2))",
      });
      expect(counter).toBe(2); // instead of 4

      counter = 0;
      evaluateCell("A1", {
        // vector case
        A1: "=ACCEPT_LAZY_RANGE_RETURN_RANGE(ACCEPT_SCALAR_RETURN_SCALAR(B1:C2))",
      });
      expect(counter).toBe(2); // instead of 4

      counter = 0;
      evaluateCell("A1", {
        A1: "=ACCEPT_LAZY_RANGE_RETURN_RANGE(ACCEPT_SCALAR_RETURN_RANGE(42))",
      });
      expect(counter).toBe(2); // instead of 4
    });

    // TODO: function with lazy scalar argument can be implemented to compute arguments partially

    // TODO: lazy arg empty is not encapsulated
  });
});
