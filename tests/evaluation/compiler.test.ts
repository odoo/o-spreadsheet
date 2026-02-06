import { functionRegistry } from "@odoo/o-spreadsheet-engine/functions/function_registry";
import { compile, functionCache } from "../../src";

import { isMimicMatrix } from "@odoo/o-spreadsheet-engine/functions/helper_arg";
import { CompiledFormula } from "../../src/types";
import { addToRegistry, evaluateCell, evaluateCellFormat } from "../test_helpers/helpers";

function compiledBaseFunction(formula: string): CompiledFormula {
  for (const f in functionCache) {
    delete functionCache[f];
  }
  return compileFromCompleteFormula(formula);
}

function compileFromCompleteFormula(formula: string) {
  return compile(formula);
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
          return !isMimicMatrix(arg2) && arg2.value === 42 && arg2.format === "42"
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
    compile("= SUM(A1)");
    compile("=SUM( A1)");
    compile("= SUM(A1 )");
    compile("= SUM   (    A1    )");
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
});
