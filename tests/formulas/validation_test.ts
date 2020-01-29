import { validate } from "../../src/formulas/validation";
import { addFunction } from "../../src/functions";

describe("constants", () => {
  test("should always validate constants to true", () => {
    expect(validate("")).toBeTruthy();
    expect(validate("    ")).toBeTruthy();
    expect(validate("=3")).toBeTruthy();
    expect(validate("3")).toBeTruthy();
    expect(validate("0")).toBeTruthy();
    expect(validate("bla")).toBeTruthy();
    expect(validate("='bla'")).toBeTruthy();
    expect(validate("=A1")).toBeTruthy();
    expect(validate("=3.5")).toBeTruthy();
    expect(validate("3.5")).toBeTruthy();
    expect(validate("=3.5+3")).toBeTruthy();
  });
});

describe("formula with no parameters should not allow parameters", () => {
  beforeAll(() => {
    addFunction("NOARGS", {
      description: "function with no arguments",
      compute: () => 0,
      args: [],
      returns: ["ANY"]
    });
  });

  test("no parameters", () => {
    expect(validate("=noargs()")).toBeTruthy();
  });
  test("int", () => {
    expect(validate("=noargs(1)")).toBeFalsy();
  });
  test("cell", () => {
    expect(validate("=noargs(A1)")).toBeFalsy();
  });
  test("bool", () => {
    expect(validate("=noargs(true)")).toBeFalsy();
  });
  test("bool 1st uppercase", () => {
    expect(validate("=noargs(True)")).toBeFalsy();
  });
  test("bool all uppercase", () => {
    expect(validate("=noargs(TRUE)")).toBeFalsy();
  });
  test("range", () => {
    expect(validate("=noargs(A1:A2)")).toBeFalsy();
  });
  test("string", () => {
    expect(validate("=noargs('bla')")).toBeFalsy();
  });
  test("empty string", () => {
    expect(validate("=noargs('')")).toBeFalsy();
  });
  test("int 0", () => {
    expect(validate("=noargs(0)")).toBeFalsy();
  });
  test("function call", () => {
    expect(validate("=noargs(noargs())")).toBeFalsy();
  });
  test("constant computation", () => {
    expect(validate("=noargs(1+2)")).toBeFalsy();
  });
  test("2 cells ref computation", () => {
    expect(validate("=noargs(A1+A2)")).toBeFalsy();
  });
  test("undefined as parameter", () => {
    expect(validate("=noargs(undefined)")).toBeFalsy();
  });
  test("string 'undefined' as parameter", () => {
    expect(validate("=noargs('undefined')")).toBeFalsy();
  });
  test("null as parameter", () => {
    expect(validate("=noargs(null)")).toBeFalsy();
  });
  test("computation of valid functions", () => {
    expect(validate("=noargs() + noargs()")).toBeTruthy();
  });
  test("computation of invalid functions", () => {
    expect(validate("=noargs() + noargs(1)")).toBeFalsy();
  });
  test("spaces as parameters", () => {
    expect(validate("=noargs(  )")).toBeTruthy();
  });
});
describe("formula with exactly 1 parameter of any type", () => {
  beforeAll(() => {
    addFunction("ONE", {
      description: "function with exactly 1 argument",
      compute: arg => arg,
      args: [{ name: "arg", description: "", type: ["ANY"] }],
      returns: ["ANY"]
    });
  });

  test("no parameters", () => {
    expect(validate("=one()")).toBeFalsy();
  });
  test("int", () => {
    expect(validate("=one(1)")).toBeTruthy();
  });
  test("cell", () => {
    expect(validate("=one(A1)")).toBeTruthy();
  });
  test("bool", () => {
    expect(validate("=one(true)")).toBeTruthy();
  });
  test("bool 1st uppercase", () => {
    expect(validate("=one(True)")).toBeTruthy();
  });
  test("bool all uppercase", () => {
    expect(validate("=one(TRUE)")).toBeTruthy();
  });
  test("range", () => {
    expect(validate("=one(A1:A2)")).toBeTruthy();
  });
  test("string", () => {
    expect(validate("=one('bla')")).toBeTruthy();
  });
  test("empty string", () => {
    expect(validate("=one('')")).toBeTruthy();
  });
  test("int 0", () => {
    expect(validate("=one(0)")).toBeTruthy();
  });
  test("function call", () => {
    expect(validate("=one(one(1))")).toBeTruthy();
  });
  test("constant computation", () => {
    expect(validate("=one(1+2)")).toBeTruthy();
  });
  test("2 cells ref computation", () => {
    expect(validate("=one(A1+A2)")).toBeTruthy();
  });
  test("undefined as parameter", () => {
    expect(validate("=one(undefined)")).toBeFalsy();
  });
  test("string 'undefined' as parameter", () => {
    expect(validate("=one('undefined')")).toBeTruthy();
  });
  test("null as parameter", () => {
    expect(validate("=one(null)")).toBeFalsy();
  });
  test("computation of valid functions", () => {
    expect(validate("=one(1) + one(1)")).toBeTruthy();
  });
  test("computation of invalid functions", () => {
    expect(validate("=one() + one(1)")).toBeFalsy();
  });
  test("spaces as parameters", () => {
    expect(validate("=one(  )")).toBeFalsy();
  });
});
describe("formula with exactly 1 parameter of type number", () => {
  beforeAll(() => {
    addFunction("ONENUM", {
      description: "function with exactly 1 argument number",
      compute: arg => arg,
      args: [{ name: "arg", description: "", type: ["NUMBER"] }],
      returns: ["ANY"]
    });
  });

  test("no parameters", () => {
    expect(validate("=onenum()")).toBeFalsy();
  });
  test("int", () => {
    expect(validate("=onenum(1)")).toBeTruthy();
  });
  test("cell", () => {
    expect(validate("=onenum(A1)")).toBeTruthy();
  });
  test("bool", () => {
    expect(validate("=onenum(true)")).toBeTruthy();
  });
  test("bool 1st uppercase", () => {
    expect(validate("=onenum(True)")).toBeTruthy();
  });
  test("bool all uppercase", () => {
    expect(validate("=onenum(TRUE)")).toBeTruthy();
  });
  test("range", () => {
    expect(validate("=onenum(A1:A2)")).toBeFalsy();
  });
  test("string", () => {
    expect(validate("=onenum('bla')")).toBeFalsy();
  });
  test("empty string", () => {
    expect(validate("=onenum('')")).toBeFalsy();
  });
  test("int 0", () => {
    expect(validate("=onenum(0)")).toBeTruthy();
  });
  test("function call", () => {
    expect(validate("=onenum(onenum(1))")).toBeTruthy();
  });
  test("constant computation", () => {
    expect(validate("=onenum(1+2)")).toBeTruthy();
  });
  test("2 cells ref computation", () => {
    expect(validate("=onenum(A1+A2)")).toBeTruthy();
  });
  test("undefined as parameter", () => {
    expect(validate("=onenum(undefined)")).toBeFalsy();
  });
  test("string 'undefined' as parameter", () => {
    expect(validate("=onenum('undefined')")).toBeFalsy();
  });
  test("null as parameter", () => {
    expect(validate("=onenum(null)")).toBeFalsy();
  });
  test("computation of valid functions", () => {
    expect(validate("=onenum(1) + onenum(1)")).toBeTruthy();
  });
  test("computation of invalid functions", () => {
    expect(validate("=onenum() + onenum(1)")).toBeFalsy();
  });
  test("spaces as parameters", () => {
    expect(validate("=onenum(  )")).toBeFalsy();
  });
});
describe("formula with 1 optional parameter of type number", () => {
  beforeAll(() => {
    addFunction("ONENUMOPT", {
      description: "function with exactly 1 argument number",
      compute: arg => arg,
      args: [{ name: "arg", description: "", type: ["NUMBER"], optional: true }],
      returns: ["ANY"]
    });
  });

  test("no parameters", () => {
    expect(validate("=onenumopt()")).toBeTruthy();
  });
  test("int", () => {
    expect(validate("=onenumopt(1)")).toBeTruthy();
  });
  test("cell", () => {
    expect(validate("=onenumopt(A1)")).toBeTruthy();
  });
  test("bool", () => {
    expect(validate("=onenumopt(true)")).toBeTruthy();
  });
  test("bool 1st uppercase", () => {
    expect(validate("=onenumopt(True)")).toBeTruthy();
  });
  test("bool all uppercase", () => {
    expect(validate("=onenumopt(TRUE)")).toBeTruthy();
  });
  test("range", () => {
    expect(validate("=onenumopt(A1:A2)")).toBeFalsy();
  });
  test("string", () => {
    expect(validate("=onenumopt('bla')")).toBeFalsy();
  });
  test("empty string", () => {
    expect(validate("=onenumopt('')")).toBeFalsy();
  });
  test("int 0", () => {
    expect(validate("=onenumopt(0)")).toBeTruthy();
  });
  test("function call", () => {
    expect(validate("=onenumopt(onenumopt(1))")).toBeTruthy();
  });
  test("function call 2", () => {
    expect(validate("=onenumopt(onenumopt())")).toBeTruthy();
  });
  test("constant computation", () => {
    expect(validate("=onenumopt(1+2)")).toBeTruthy();
  });
  test("2 cells ref computation", () => {
    expect(validate("=onenumopt(A1+A2)")).toBeTruthy();
  });
  test("undefined as parameter", () => {
    expect(validate("=onenumopt(undefined)")).toBeFalsy();
  });
  test("string 'undefined' as parameter", () => {
    expect(validate("=onenumopt('undefined')")).toBeFalsy();
  });
  test("null as parameter", () => {
    expect(validate("=onenumopt(null)")).toBeFalsy();
  });
  test("computation of valid functions", () => {
    expect(validate("=onenumopt(1) + onenumopt(1)")).toBeTruthy();
  });
  test("computation of invalid functions", () => {
    expect(validate("=onenumopt() + onenumopt(1)")).toBeTruthy();
  });
  test("spaces as parameters", () => {
    expect(validate("=onenumopt(  )")).toBeTruthy();
  });
});
describe("formula with 1 mandatory and 1 optional parameter of type number", () => {
  beforeAll(() => {
    addFunction("NUMNUMOPT", {
      description: "function with exactly 1 argument number",
      compute: arg => arg,
      args: [
        { name: "arg", description: "", type: ["NUMBER"] },
        { name: "arg", description: "", type: ["NUMBER"], optional: true }
      ],
      returns: ["ANY"]
    });
  });

  test("no parameters", () => {
    expect(validate("=numnumopt()")).toBeFalsy();
  });
  test("int", () => {
    expect(validate("=numnumopt(1)")).toBeTruthy();
  });
  test("cell", () => {
    expect(validate("=numnumopt(A1)")).toBeTruthy();
  });
  test("bool", () => {
    expect(validate("=numnumopt(true)")).toBeTruthy();
  });
  test("bool 1st uppercase", () => {
    expect(validate("=numnumopt(True)")).toBeTruthy();
  });
  test("bool all uppercase", () => {
    expect(validate("=numnumopt(TRUE)")).toBeTruthy();
  });
  test("range", () => {
    expect(validate("=numnumopt(A1:A2)")).toBeFalsy();
  });
  test("string", () => {
    expect(validate("=numnumopt('bla')")).toBeFalsy();
  });
  test("empty string", () => {
    expect(validate("=numnumopt('')")).toBeFalsy();
  });
  test("int 0", () => {
    expect(validate("=numnumopt(0)")).toBeTruthy();
  });
  test("function call", () => {
    expect(validate("=numnumopt(numnumopt(1))")).toBeTruthy();
  });
  test("function call 2", () => {
    expect(validate("=numnumopt(numnumopt())")).toBeFalsy();
  });
  test("constant computation", () => {
    expect(validate("=numnumopt(1+2)")).toBeTruthy();
  });
  test("2 cells ref computation", () => {
    expect(validate("=numnumopt(A1+A2)")).toBeTruthy();
  });
  test("undefined as parameter", () => {
    expect(validate("=numnumopt(undefined)")).toBeFalsy();
  });
  test("string 'undefined' as parameter", () => {
    expect(validate("=numnumopt('undefined')")).toBeFalsy();
  });
  test("null as parameter", () => {
    expect(validate("=numnumopt(null)")).toBeFalsy();
  });
  test("computation of valid functions", () => {
    expect(validate("=numnumopt(1) + numnumopt(1)")).toBeTruthy();
  });
  test("computation of invalid functions", () => {
    expect(validate("=numnumopt() + numnumopt(1)")).toBeFalsy();
  });
  test("spaces as parameters", () => {
    expect(validate("=numnumopt(  )")).toBeFalsy();
  });
  test("2 correct params", () => {
    expect(validate("=numnumopt(1,1)")).toBeTruthy();
  });
  test("1 correct params, 1 correct function", () => {
    expect(validate("=numnumopt(1,numnumopt(1))")).toBeTruthy();
  });
  test("1st incorrect params with second", () => {
    expect(validate("=numnumopt('bla',1)")).toBeFalsy();
  });
  test("2nd incorrect params with 1st correct", () => {
    expect(validate("=numnumopt(1,'bla')")).toBeFalsy();
  });
});
describe("formula with repeating number of args", () => {
  beforeAll(() => {
    addFunction("REPA", {
      description: "function with exactly 1 argument number",
      compute: arg => arg,
      args: [{ name: "arg", description: "", type: ["NUMBER"], repeating: true }],
      returns: ["ANY"]
    });
  });

  test("no parameters", () => {
    expect(validate("=repa()")).toBeFalsy();
  });
  test("int", () => {
    expect(validate("=repa(1)")).toBeTruthy();
  });
  test("cell", () => {
    expect(validate("=repa(A1)")).toBeTruthy();
  });
  test("bool", () => {
    expect(validate("=repa(true)")).toBeTruthy();
  });
  test("bool 1st uppercase", () => {
    expect(validate("=repa(True)")).toBeTruthy();
  });
  test("bool all uppercase", () => {
    expect(validate("=repa(TRUE)")).toBeTruthy();
  });
  test("range", () => {
    expect(validate("=repa(A1:A2)")).toBeFalsy();
  });
  test("string", () => {
    expect(validate("=repa('bla')")).toBeFalsy();
  });
  test("empty string", () => {
    expect(validate("=repa('')")).toBeFalsy();
  });
  test("int 0", () => {
    expect(validate("=repa(0)")).toBeTruthy();
  });
  test("function call", () => {
    expect(validate("=repa(repa(1))")).toBeTruthy();
  });
  test("function call 2", () => {
    expect(validate("=repa(repa())")).toBeFalsy();
  });
  test("constant computation", () => {
    expect(validate("=repa(1+2)")).toBeTruthy();
  });
  test("2 cells ref computation", () => {
    expect(validate("=repa(A1+A2)")).toBeTruthy();
  });
  test("undefined as parameter", () => {
    expect(validate("=repa(undefined)")).toBeFalsy();
  });
  test("string 'undefined' as parameter", () => {
    expect(validate("=repa('undefined')")).toBeFalsy();
  });
  test("null as parameter", () => {
    expect(validate("=repa(null)")).toBeFalsy();
  });
  test("computation of valid functions", () => {
    expect(validate("=repa(1) + repa(1)")).toBeTruthy();
  });
  test("computation of invalid functions", () => {
    expect(validate("=repa() + repa(1)")).toBeFalsy();
  });
  test("spaces as parameters", () => {
    expect(validate("=repa(  )")).toBeFalsy();
  });
  test("2 correct params", () => {
    expect(validate("=repa(1,1)")).toBeTruthy();
  });

  test("3 correct params", () => {
    expect(validate("=repa(1,2, 3)")).toBeTruthy();
  });
  test("1 correct params, 1 correct function", () => {
    expect(validate("=repa(1,repa(1))")).toBeTruthy();
  });
  test("1st incorrect params with second", () => {
    expect(validate("=repa('bla',1)")).toBeFalsy();
  });
  test("2nd incorrect params with 1st correct", () => {
    expect(validate("=repa(1,'bla')")).toBeFalsy();
  });
});
describe("formula with optional repeating  number of args", () => {
  beforeAll(() => {
    addFunction("REPAOPT", {
      description: "function with exactly 1 argument number",
      compute: arg => arg,
      args: [{ name: "arg", description: "", type: ["NUMBER"], repeating: true, optional: true }],
      returns: ["ANY"]
    });
  });

  test("no parameters", () => {
    expect(validate("=repaopt()")).toBeTruthy();
  });
  test("3 correct params", () => {
    expect(validate("=repaopt(1,2, 3)")).toBeTruthy();
  });
  test("1 correct params, 1 correct function", () => {
    expect(validate("=repaopt(1,repaopt(1))")).toBeTruthy();
  });
  test("1st incorrect params with second", () => {
    expect(validate("=repaopt('bla',1)")).toBeFalsy();
  });
  test("2nd incorrect params with 1st correct", () => {
    expect(validate("=repaopt(1,'bla')")).toBeFalsy();
  });
});

describe("formula with bool", () => {
  beforeAll(() => {
    addFunction("BOOLARG", {
      description: "",
      compute: () => 0,
      args: [{ type: ["BOOLEAN"], description: "", name: "" }],
      returns: ["ANY"]
    });
  });
  test("true", () => {
    expect(validate("=boolarg(true)")).toBeTruthy();
  });
  test("True", () => {
    expect(validate("=boolarg(True)")).toBeTruthy();
  });
  test("TRUE", () => {
    expect(validate("=boolarg(TRUE)")).toBeTruthy();
  });
  test("inner function call that returns a bool", () => {
    expect(validate("=boolarg(boolarg(True))")).toBeTruthy();
  });
  test("TRUEe", () => {
    expect(validate("=boolarg(TRUEe)")).toBeFalsy();
  });
  test("false", () => {
    expect(validate("=boolarg(false)")).toBeTruthy();
  });
  test("False", () => {
    expect(validate("=boolarg(False)")).toBeTruthy();
  });
  test("FALSE", () => {
    expect(validate("=boolarg(FALSE)")).toBeTruthy();
  });
  test("1", () => {
    expect(validate("=boolarg(1)")).toBeTruthy();
  });
  test("33", () => {
    expect(validate("=boolarg(33)")).toBeTruthy();
  });
  test("0", () => {
    expect(validate("=boolarg(0)")).toBeTruthy();
  });
  test("'whatever'", () => {
    expect(validate("=boolarg('whatever')")).toBeFalsy();
  });
});
describe("formula with string", () => {
  beforeAll(() => {
    addFunction("STRINGY", {
      description: "",
      compute: () => 0,
      args: [{ type: ["STRING"], description: "", name: "" }],
      returns: ["ANY"]
    });
  });
  test("'true'", () => {
    expect(validate("=stringy('true')")).toBeTruthy();
  });
  test('"true"', () => {
    expect(validate('=stringy("true")')).toBeTruthy();
  });
  test("true", () => {
    expect(validate("=stringy(true)")).toBeTruthy();
  });
  test("12", () => {
    expect(validate("=stringy(12)")).toBeTruthy();
  });
  test("12.5", () => {
    expect(validate("=stringy(12.5)")).toBeTruthy();
  });
  test("qsdjfmlqjsdf", () => {
    expect(validate("=stringy(qsdjfmlqjsdf)")).toBeFalsy();
  });
});
describe("formula with async", () => {
  //todo VSC
});

describe("formula with return types", () => {});
describe("invalid formulas", () => {
  //todo VSC missing ( or )
  //todo VSC too many args
});
describe("formulas missing )", () => {
  //todo VSC
});
describe("next argument", () => {
  //todo VSC
});

describe("argument at position", () => {
  //todo VSC
});
