import { Model } from "../../src";
import { setCellContent } from "../test_helpers/commands_helpers";
import {
  checkFunctionDoesntSpreadBeyondRange,
  createModelFromGrid,
  evaluateArrayFormula,
  evaluateCell,
  evaluateGrid,
  getRangeValuesAsMatrix,
} from "../test_helpers/helpers";

describe("CHAR formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=CHAR()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CHAR(65)" })).toBe("A");
    expect(evaluateCell("A1", { A1: "=CHAR(122)" })).toBe("z");
    expect(evaluateCell("A1", { A1: "=CHAR(57)" })).toBe("9");
    expect(evaluateCell("A1", { A1: "=CHAR(-1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CHAR(65.9)" })).toBe("A");
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=CHAR("65")' })).toBe("A");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=CHAR(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: "66" })).toBe("B");
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: "121" })).toBe("y");
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: "56" })).toBe("8");
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: "-1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: "66.9" })).toBe("B");
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: '"68"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: '="68"' })).toBe("D");
  });
});

describe("CLEAN formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=CLEAN()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CLEAN(65)" })).toBe("65");
    expect(evaluateCell("A1", { A1: '=CLEAN("hey")' })).toBe("hey");
    expect(evaluateCell("A1", { A1: "=CLEAN(CHAR(50))" })).toBe("2");
    expect(evaluateCell("A1", { A1: "=CLEAN(CHAR(10))" })).toBe("");
    expect(evaluateCell("A1", { A1: '=CLEAN("A")' })).toBe("A");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=CLEAN(A2)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=CLEAN(A2)", A2: "66" })).toBe("66");
    expect(evaluateCell("A1", { A1: "=CLEAN(A2)", A2: "hey" })).toBe("hey");
    expect(evaluateCell("A1", { A1: "=CLEAN(A2)", A2: "=CHAR(50)" })).toBe("2");
    expect(evaluateCell("A1", { A1: "=CLEAN(A2)", A2: '="A" & CHAR(5)' })).toBe("A");
  });
});

describe("CONCATENATE formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=CONCATENATE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CONCATENATE( ,  )" })).toBe("");
    expect(evaluateCell("A1", { A1: "=CONCATENATE( , 1)" })).toBe("1");
    expect(evaluateCell("A1", { A1: "=CONCATENATE(42)" })).toBe("42");
    expect(evaluateCell("A1", { A1: "=CONCATENATE(42, 24)" })).toBe("4224");
    expect(evaluateCell("A1", { A1: "=CONCATENATE(42, -24)" })).toBe("42-24");
    expect(evaluateCell("A1", { A1: "=CONCATENATE(42, 0.42)" })).toBe("420.42");
    expect(evaluateCell("A1", { A1: "=CONCATENATE(42, 42%)" })).toBe("420.42");
    expect(evaluateCell("A1", { A1: '=CONCATENATE(1, "")' })).toBe("1");
    expect(evaluateCell("A1", { A1: '=CONCATENATE(1, " ")' })).toBe("1 ");
    expect(evaluateCell("A1", { A1: '=CONCATENATE(1, "3")' })).toBe("13");
    expect(evaluateCell("A1", { A1: '=CONCATENATE(1, "-3")' })).toBe("1-3");
    expect(evaluateCell("A1", { A1: "=CONCATENATE(1, TRUE)" })).toBe("1TRUE");
    expect(evaluateCell("A1", { A1: "=CONCATENATE(1, FALSE)" })).toBe("1FALSE");
    expect(evaluateCell("A1", { A1: '=CONCATENATE(1, "3%")' })).toBe("13%");
    expect(evaluateCell("A1", { A1: '=CONCATENATE("ki", "kou")' })).toBe("kikou");
    expect(evaluateCell("A1", { A1: '=CONCATENATE("TRUE", TRUE)' })).toBe("TRUETRUE");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=CONCATENATE(A2, A3)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=CONCATENATE(A2, A3)", A2: "1" })).toBe("1");
    expect(evaluateCell("A1", { A1: "=CONCATENATE(A2, A3)", A2: "1", A3: "42" })).toBe("142");
    expect(evaluateCell("A1", { A1: "=CONCATENATE(A2, A3)", A2: "42", A3: '""' })).toBe('42""');
    expect(evaluateCell("A1", { A1: "=CONCATENATE(A2, A3)", A2: "42", A3: '"42"' })).toBe('42"42"');
    expect(evaluateCell("A1", { A1: "=CONCATENATE(A2, A3)", A2: "42", A3: "TRUE" })).toBe("42TRUE");
    expect(evaluateCell("A1", { A1: "=CONCATENATE(A2, A3)", A2: '"TRUE"', A3: "TRUE" })).toBe(
      '"TRUE"TRUE'
    );
    expect(evaluateCell("A1", { A1: "=CONCATENATE(A2, A3)", A2: "42", A3: '=""' })).toBe("42");
    expect(evaluateCell("A1", { A1: "=CONCATENATE(A2, A3)", A2: "42", A3: '=" "' })).toBe("42 ");
    expect(evaluateCell("A1", { A1: "=CONCATENATE(A2, A3)", A2: "42", A3: '="24"' })).toBe("4224");
  });

  // prettier-ignore
  test("functional tests on range arguments", () => {
    const grid = {
      A1: "=CONCATENATE(A2:A4)",
      B1: "=CONCATENATE(B2:B4)",
      C1: "=CONCATENATE(C2:C4)",

      A2: "9",    A3: "test",   A4: '"42"',
      B2: "tRuE", B3: '="123"', B4: '="tset"',
      C2: "7%",   C3: '"8%"',   C4: '=""',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A1).toBe('9test"42"');
    expect(gridResult.B1).toBe("TRUE123tset");
    expect(gridResult.C1).toBe('0.07"8%"');
  });
});

describe("EXACT formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=EXACT(,)" })).toBe(true);
    expect(evaluateCell("A1", { A1: '=EXACT(,"")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=EXACT("test","test")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=EXACT("test","Test")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=EXACT("test"," test   ")' })).toBe(false);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=EXACT(123, 123)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EXACT(123, 1234)" })).toBe(false);
    expect(evaluateCell("A1", { A1: '=EXACT(123, "123")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=EXACT(TRUE, "TRUE")' })).toBe(true);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=EXACT(A2, A3)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EXACT(A2, A3)", A2: "test", A3: "test" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EXACT(A2, A3)", A2: "test", A3: "Test" })).toBe(false);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=EXACT(A2, A3)", A2: "TRUE", A3: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EXACT(A2, A3)", A2: "TRUE", A3: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EXACT(A2, A3)", A2: "456", A3: "456" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EXACT(A2, A3)", A2: "456", A3: '"456"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EXACT(A2, A3)", A2: "456", A3: '="456"' })).toBe(true);
  });
});

describe("FIND formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=FIND( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=FIND("", "")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=FIND( ,  ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=FIND( , "",  )' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=FIND("C", "ABCD")' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=FIND("C", "ABCD", 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=FIND("C", "ABCD", 1)' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=FIND("C", "ABCD", 2)' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=FIND("C", "ABCD", 3)' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=FIND("C", "ABCD", 4)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=FIND("C", "ABCDC", 4)' })).toBe(5);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=FIND(A2, A3)", A2: "do", A3: "Odoo" })).toBe(2);
    expect(
      evaluateCell("A1", { A1: "=FIND(A2, A3, A4)", A2: "do", A3: "Odoo Docs", A4: "1" })
    ).toBe(2);
    expect(
      evaluateCell("A1", { A1: "=FIND(A2, A3, A4)", A2: "do", A3: "Odoo Docs", A4: "4" })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", { A1: "=FIND(A2, A3, A4)", A2: "S", A3: "Spreadsheet", A4: "1" })
    ).toBe(1);
    expect(
      evaluateCell("A1", { A1: "=FIND(A2, A3, A4)", A2: "S", A3: "Spreadsheet", A4: "6" })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", { A1: "=FIND(A2, A3, A4)", A2: "S", A3: "Spreadsheet", A4: "8" })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=FIND(A2, A3)", A2: "7", A3: "No.7 Doc" })).toBe(4);
  });

  test("casting tests on cell arguments", () => {
    expect(
      evaluateCell("A1", { A1: "=FIND(A2, A3, A4)", A2: "S", A3: "Spreadsheet", A4: '="6"' })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", { A1: "=FIND(A2, A3, A4)", A2: "S", A3: "Spreadsheet", A4: "TRUE" })
    ).toBe(1);
    expect(evaluateCell("A1", { A1: "=FIND(A2, A3, A4)", A2: "U", A3: "TRUE", A4: "1" })).toBe(3);
    expect(
      evaluateCell("A1", { A1: "=FIND(A2, A3, A4)", A2: "TRUE", A3: "FALSETRUE", A4: "1" })
    ).toBe(6);
  });
});

describe("JOIN formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=JOIN()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=JOIN( ,  )" })).toBe("");
    expect(evaluateCell("A1", { A1: "=JOIN( , 1)" })).toBe("1");
    expect(evaluateCell("A1", { A1: '=JOIN("-", 1)' })).toBe("1");
    expect(evaluateCell("A1", { A1: "=JOIN( , 1, 2, 3)" })).toBe("123");
    expect(evaluateCell("A1", { A1: '=JOIN("", 1, 2, 3)' })).toBe("123");
    expect(evaluateCell("A1", { A1: '=JOIN("-", 1, 2, 3)' })).toBe("1-2-3");
    expect(evaluateCell("A1", { A1: '=JOIN("9", 1, 2, 3)' })).toBe("19293");
    expect(evaluateCell("A1", { A1: '=JOIN(9, "1", "2", "3")' })).toBe("19293");
    expect(evaluateCell("A1", { A1: "=JOIN(TRUE, 1, 2, 3)" })).toBe("1TRUE2TRUE3");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=JOIN(A2, A3)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=JOIN(A2, A3)", A3: "1" })).toBe("1");
    expect(evaluateCell("A1", { A1: "=JOIN(A2, A3)", A2: "-", A3: "1" })).toBe("1");
    expect(evaluateCell("A1", { A1: "=JOIN(A2, A3, A4, A5)", A3: "1", A4: "2", A5: "3" })).toBe(
      "123"
    );
    expect(
      evaluateCell("A1", { A1: "=JOIN(A2, A3, A4, A5)", A2: '=""', A3: "1", A4: "2", A5: "3" })
    ).toBe("123");
    expect(
      evaluateCell("A1", { A1: "=JOIN(A2, A3, A4, A5)", A2: "-", A3: "1", A4: "2", A5: "3" })
    ).toBe("1-2-3");
    expect(
      evaluateCell("A1", { A1: "=JOIN(A2, A3, A4, A5)", A2: '="9"', A3: "1", A4: "2", A5: "3" })
    ).toBe("19293");
    expect(
      evaluateCell("A1", {
        A1: "=JOIN(A2, A3, A4, A5)",
        A2: "9",
        A3: '="1"',
        A4: '="2"',
        A5: '="3"',
      })
    ).toBe("19293");
    expect(
      evaluateCell("A1", { A1: "=JOIN(A2, A3, A4, A5)", A2: "TRUE", A3: "1", A4: "2", A5: "3" })
    ).toBe("1TRUE2TRUE3");
  });

  // prettier-ignore
  test("functional tests on range arguments", () => {
    const grid = {
      A1: '=JOIN("*", A2:A4)',
      B1: '=JOIN(42, B2:B4)',
      C1: '=JOIN(",", C2:C4)',

      A2: "9",    A3: "test",   A4: '"42"',
      B2: "tRuE", B3: '="123"', B4: '="tset"',
      C2: "7%",   C3: '"8%"',   C4: '=""',
    };

    const gridResult = evaluateGrid(grid);
    expect(gridResult.A1).toBe('9*test*"42"');
    expect(gridResult.B1).toBe("TRUE4212342tset");
    expect(gridResult.C1).toBe('0.07,"8%",');
  });
});

describe("LEFT formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=LEFT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=LEFT("kikou")' })).toBe("k");
    expect(evaluateCell("A1", { A1: '=LEFT("123")' })).toBe("1");
    expect(evaluateCell("A1", { A1: "=LEFT(123)" })).toBe("1");
    expect(evaluateCell("A1", { A1: "=LEFT(TRUE)" })).toBe("T");
    expect(evaluateCell("A1", { A1: "=LEFT( ,  )" })).toBe("");
    expect(evaluateCell("A1", { A1: '=LEFT("kikou", )' })).toBe("");
    expect(evaluateCell("A1", { A1: '=LEFT("kikou", -1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=LEFT("kikou", 0)' })).toBe("");
    expect(evaluateCell("A1", { A1: '=LEFT("kikou", 1)' })).toBe("k");
    expect(evaluateCell("A1", { A1: '=LEFT("kikou", 2)' })).toBe("ki");
    expect(evaluateCell("A1", { A1: '=LEFT("kikou", 6)' })).toBe("kikou");
    expect(evaluateCell("A1", { A1: '=LEFT("kikou", 99)' })).toBe("kikou");
    expect(evaluateCell("A1", { A1: '=LEFT("kikou", "2")' })).toBe("ki");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=LEFT(A2)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=LEFT(A2)", A2: "kikou" })).toBe("k");
    expect(evaluateCell("A1", { A1: "=LEFT(A2)", A2: '="123"' })).toBe("1");
    expect(evaluateCell("A1", { A1: "=LEFT(A2)", A2: "123" })).toBe("1");
    expect(evaluateCell("A1", { A1: "=LEFT(A2)", A2: "TRUE" })).toBe("T");
    expect(evaluateCell("A1", { A1: "=LEFT(A2, A3)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=LEFT(A2, A3)", A2: "kikou" })).toBe("");
    expect(evaluateCell("A1", { A1: "=LEFT(A2, A3)", A2: "kikou", A3: "-1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=LEFT(A2, A3)", A2: "kikou", A3: "0" })).toBe("");
    expect(evaluateCell("A1", { A1: "=LEFT(A2, A3)", A2: "kikou", A3: "1" })).toBe("k");
    expect(evaluateCell("A1", { A1: "=LEFT(A2, A3)", A2: "kikou", A3: "2" })).toBe("ki");
    expect(evaluateCell("A1", { A1: "=LEFT(A2, A3)", A2: "kikou", A3: "6" })).toBe("kikou");
    expect(evaluateCell("A1", { A1: "=LEFT(A2, A3)", A2: "kikou", A3: "99" })).toBe("kikou");
    expect(evaluateCell("A1", { A1: "=LEFT(A2, A3)", A2: "kikou", A3: '="2"' })).toBe("ki");
  });
});

describe("LEN formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=LEN()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=LEN(0)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=LEN(42)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=LEN(-4.42)" })).toBe(5);
    expect(evaluateCell("A1", { A1: "=LEN(TRUE)" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=LEN(FALSE)" })).toBe(5);
    expect(evaluateCell("A1", { A1: "=LEN(FALSE)" })).toBe(5);
    expect(evaluateCell("A1", { A1: '=LEN("")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=LEN(" ")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=LEN("42")' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=LEN("オドゥ")' })).toBe(3);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=LEN(A2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=LEN(A2)", A2: " " })).toBe(1);
    expect(evaluateCell("A1", { A1: "=LEN(A2)", A2: "0" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=LEN(A2)", A2: "42" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=LEN(A2)", A2: "TRUE" })).toBe(4);
    expect(evaluateCell("A1", { A1: "=LEN(A2)", A2: "FALSE" })).toBe(5);
    expect(evaluateCell("A1", { A1: "=LEN(A2)", A2: '""' })).toBe(2);
    expect(evaluateCell("A1", { A1: "=LEN(A2)", A2: '" "' })).toBe(3);
    expect(evaluateCell("A1", { A1: "=LEN(A2)", A2: '"42"' })).toBe(4);
    expect(evaluateCell("A1", { A1: "=LEN(A2)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=LEN(A2)", A2: '=" "' })).toBe(1);
    expect(evaluateCell("A1", { A1: "=LEN(A2)", A2: '="42"' })).toBe(2);
  });
});

describe("LOWER formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=LOWER()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=LOWER(0)" })).toBe("0");
    expect(evaluateCell("A1", { A1: "=LOWER(42)" })).toBe("42");
    expect(evaluateCell("A1", { A1: "=LOWER(TRUE)" })).toBe("true");
    expect(evaluateCell("A1", { A1: "=LOWER(FALSE)" })).toBe("false");
    expect(evaluateCell("A1", { A1: '=LOWER("")' })).toBe("");
    expect(evaluateCell("A1", { A1: '=LOWER(" ")' })).toBe(" ");
    expect(evaluateCell("A1", { A1: '=LOWER("42")' })).toBe("42");
    expect(evaluateCell("A1", { A1: '=LOWER("オドゥ")' })).toBe("オドゥ");
    expect(evaluateCell("A1", { A1: '=LOWER("オAドB")' })).toBe("オaドb");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=LOWER(A2)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=LOWER(A2)", A2: " " })).toBe(" ");
    expect(evaluateCell("A1", { A1: "=LOWER(A2)", A2: "0" })).toBe("0");
    expect(evaluateCell("A1", { A1: "=LOWER(A2)", A2: "42" })).toBe("42");
    expect(evaluateCell("A1", { A1: "=LOWER(A2)", A2: "TRUE" })).toBe("true");
    expect(evaluateCell("A1", { A1: "=LOWER(A2)", A2: "FALSE" })).toBe("false");
    expect(evaluateCell("A1", { A1: "=LOWER(A2)", A2: '""' })).toBe('""');
    expect(evaluateCell("A1", { A1: "=LOWER(A2)", A2: '" "' })).toBe('" "');
    expect(evaluateCell("A1", { A1: "=LOWER(A2)", A2: '"TEST"' })).toBe('"test"');
    expect(evaluateCell("A1", { A1: "=LOWER(A2)", A2: '=""' })).toBe("");
    expect(evaluateCell("A1", { A1: "=LOWER(A2)", A2: '=" "' })).toBe(" ");
    expect(evaluateCell("A1", { A1: "=LOWER(A2)", A2: '="TEST"' })).toBe("test");
  });
});

describe("MID formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=MID()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=MID("amen")' })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=MID("amen", 2)' })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=MID("amen", 0, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: '=MID("amen", 0, -1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!

    expect(evaluateCell("A1", { A1: '=MID("amen", 2, 1)' })).toBe("m");
    expect(evaluateCell("A1", { A1: "=MID(6558, 2, 2)" })).toBe("55");
    expect(evaluateCell("A1", { A1: '=MID("hey", 2, 20)' })).toBe("ey");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MID(A2, 1, 1)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=MID(A2, 2, 1)", A2: "66" })).toBe("6");
    expect(evaluateCell("A1", { A1: "=MID(A2, 3, 5)", A2: "hey" })).toBe("y");
    expect(evaluateCell("A1", { A1: "=MID(A2, 3, 5)", A2: "I'm a legend)" })).toBe("m a l");
  });
});

describe("PROPER formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=PROPER()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=PROPER(65)" })).toBe("65");
    expect(evaluateCell("A1", { A1: '=PROPER("hey")' })).toBe("Hey");
    expect(evaluateCell("A1", { A1: '=PROPER("75google@rdm.com")' })).toBe("75Google@Rdm.Com");
    expect(evaluateCell("A1", { A1: '=PROPER("ça")' })).toBe("Ça");
    expect(evaluateCell("A1", { A1: '=PROPER("ébloui")' })).toBe("Ébloui");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=PROPER(A2)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=PROPER(A2)", A2: "66" })).toBe("66");
    expect(evaluateCell("A1", { A1: "=PROPER(A2)", A2: "hey" })).toBe("Hey");
    expect(evaluateCell("A1", { A1: "=PROPER(A2)", A2: '="bi-annual' })).toBe("Bi-Annual");
  });
});

describe("REGEXEXTRACT function", () => {
  test("REGEXEXTRACT takes 2-4 arguments", () => {
    expect(evaluateCell("A1", { A1: "=REGEXEXTRACT()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello")' })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "lo")' })).toBe("lo");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "lo", 0)' })).toBe("lo");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "lo", 0, 0)' })).toBe("lo");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "lo", 0, 0, 0)' })).toBe("#BAD_EXPR");
  });

  test("Empty text/pattern returns an empty string", () => {
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("", "lo")' })).toBe("");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "")' })).toBe("");
  });

  test("return_mode is 0, 1 or 2", () => {
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "lo", -1)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "lo", 0)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "lo", 1)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "(lo)", 2)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "lo", 3)' })).toBe("#ERROR");
  });

  test("error if return_mode is 2 and there is no capturing groups in the regex", () => {
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "lo", 2)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "(lo)", 2)' })).not.toBe("#ERROR");
  });

  test("case_sensitivity is either 0 or 1", () => {
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "lo", 0, -1)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "lo", 0, 0)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "lo", 0, 1)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello", "lo", 0, 2)' })).toBe("#ERROR");
  });

  test("Can return the first match, all the matches, or the capturing groups of first match", () => {
    const model = new Model();
    expect(
      evaluateArrayFormula(model, `REGEXEXTRACT("hello there my guy", "e([a-z]+)", 0)`)
    ).toEqual([["ello"]]);
    expect(
      evaluateArrayFormula(model, `REGEXEXTRACT("hello there my guy", "e([a-z]+)", 1)`)
    ).toEqual([["ello"], ["ere"]]);
    expect(
      evaluateArrayFormula(model, `REGEXEXTRACT("hello there my guy", "e([a-z]+)", 2)`)
    ).toEqual([["llo"]]);
  });

  test("Can be either case sensitive or insensitive", () => {
    const model = new Model();
    expect(evaluateArrayFormula(model, `REGEXEXTRACT("HellO", "[A-Z]+", 1, 0)`)).toEqual([
      ["H"],
      ["O"],
    ]);
    expect(evaluateArrayFormula(model, `REGEXEXTRACT("HellO", "[A-Z]+", 1, 1)`)).toEqual([
      ["HellO"],
    ]);
  });

  test.each([
    ["Hello there", "there", 0, 0, ["there"]],
    ["Hello there", "o.*", 0, 0, ["o there"]],
    ["Hello there", "o.*", 1, 0, ["o there"]],
    ["Hello there", "o(.*)", 2, 0, [" there"]],
    ["Hello there", "\\s.*", 0, 0, [" there"]],
    ["Hello 56 there 89", "[0-9]+", 1, 0, ["56", "89"]],
    ["Hello there my guy", "\\s[a-z]+", 0, 0, [" there"]],
    ["Hello there my guy", "\\s[a-z]+", 1, 0, [" there", " my", " guy"]],
    ["word boundary", "\\b[a-z]+", 1, 0, ["word", "boundary"]],
    ["Hello There My Guy", "(\\s[a-z]+)+", 1, 1, [" There My Guy"]],
    ["Hello There My Guy", "(\\s[a-z]+)+", 2, 1, [" Guy"]], // Repeated capturing group, only last one is returned
    ["VAT:21% PRICE:200€", ".*:([0-9]+).*:([0-9]+)", 2, 0, ["21", "200"]], // Multiple capturing groups
  ])(
    "various function results =REGEXEXTRACT(%s, %s, %s, %s)",
    (arg0: string, arg1: string, arg2: number, arg3: number, expectedResult: string[]) => {
      const model = new Model();
      expect(
        evaluateArrayFormula(model, `REGEXEXTRACT("${arg0}", "${arg1}", ${arg2}, ${arg3})`).flat()
      ).toEqual(expectedResult);
    }
  );

  test("invalid regex raise an error", () => {
    expect(evaluateCell("A1", { A1: '=REGEXEXTRACT("Hello there", "[a-z+")' })).toBe("#ERROR");
  });
});

describe("REPLACE formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", 2, 1, "Y")' })).toBe("AYZ");
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", 3, 1, "Y")' })).toBe("ABY");
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", 4, 1, "Y")' })).toBe("ABZY");
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", 5, 1, "Y")' })).toBe("ABZY");
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", 3, 2, "Y")' })).toBe("ABY");
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", 3, 2, " Y")' })).toBe("AB Y");
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", 5, 2, " Y")' })).toBe("ABZ Y");
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", 2, 2, "Y")' })).toBe("AY");
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", 1, 2, "Y")' })).toBe("YZ");
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", 0, 2, "Y")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", 1, 1, "Y")' })).toBe("YBZ");
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", 1, 0, "Y")' })).toBe("YABZ");
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", 2, 0, "Y")' })).toBe("AYBZ");
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", -1, 0, "Y")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=REPLACE("ABZ", "2", TRUE, "Y")' })).toBe("AYZ");
    expect(evaluateCell("A1", { A1: '=REPLACE(1239, 2, 2, "78")' })).toBe("1789");
    expect(evaluateCell("A1", { A1: '=REPLACE("1789", 2, 2, 23)' })).toBe("1239");
  });
});

describe("RIGHT formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=RIGHT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=RIGHT("kikou")' })).toBe("u");
    expect(evaluateCell("A1", { A1: '=RIGHT("123")' })).toBe("3");
    expect(evaluateCell("A1", { A1: "=RIGHT(123)" })).toBe("3");
    expect(evaluateCell("A1", { A1: "=RIGHT(TRUE)" })).toBe("E");
    expect(evaluateCell("A1", { A1: "=RIGHT( ,  )" })).toBe("");
    expect(evaluateCell("A1", { A1: '=RIGHT("kikou", )' })).toBe("");
    expect(evaluateCell("A1", { A1: '=RIGHT("kikou", -1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=RIGHT("kikou", 0)' })).toBe("");
    expect(evaluateCell("A1", { A1: '=RIGHT("kikou", 1)' })).toBe("u");
    expect(evaluateCell("A1", { A1: '=RIGHT("kikou", 2)' })).toBe("ou");
    expect(evaluateCell("A1", { A1: '=RIGHT("kikou", 6)' })).toBe("kikou");
    expect(evaluateCell("A1", { A1: '=RIGHT("kikou", 99)' })).toBe("kikou");
    expect(evaluateCell("A1", { A1: '=RIGHT("kikou", "2")' })).toBe("ou");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=RIGHT(A2)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=RIGHT(A2)", A2: "kikou" })).toBe("u");
    expect(evaluateCell("A1", { A1: "=RIGHT(A2)", A2: '="123"' })).toBe("3");
    expect(evaluateCell("A1", { A1: "=RIGHT(A2)", A2: "123" })).toBe("3");
    expect(evaluateCell("A1", { A1: "=RIGHT(A2)", A2: "TRUE" })).toBe("E");
    expect(evaluateCell("A1", { A1: "=RIGHT(A2, A3)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=RIGHT(A2, A3)", A2: "kikou" })).toBe("");
    expect(evaluateCell("A1", { A1: "=RIGHT(A2, A3)", A2: "kikou", A3: "-1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=RIGHT(A2, A3)", A2: "kikou", A3: "0" })).toBe("");
    expect(evaluateCell("A1", { A1: "=RIGHT(A2, A3)", A2: "kikou", A3: "1" })).toBe("u");
    expect(evaluateCell("A1", { A1: "=RIGHT(A2, A3)", A2: "kikou", A3: "2" })).toBe("ou");
    expect(evaluateCell("A1", { A1: "=RIGHT(A2, A3)", A2: "kikou", A3: "6" })).toBe("kikou");
    expect(evaluateCell("A1", { A1: "=RIGHT(A2, A3)", A2: "kikou", A3: "99" })).toBe("kikou");
    expect(evaluateCell("A1", { A1: "=RIGHT(A2, A3)", A2: "kikou", A3: '="2"' })).toBe("ou");
  });
});

describe("SEARCH formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=SEARCH( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=SEARCH( ,  ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SEARCH("C", "ABCD")' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=SEARCH("C", "ABCD", 0)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SEARCH("C", "ABCD", 1)' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=SEARCH("C", "ABCD", 2)' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=SEARCH("C", "ABCD", 3)' })).toBe(3);
    expect(evaluateCell("A1", { A1: '=SEARCH("C", "ABCD", 4)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SEARCH("C", "ABCDC", 4)' })).toBe(5);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=SEARCH(A2, A3)", A2: "do", A3: "Odoo" })).toBe(2);
    expect(
      evaluateCell("A1", { A1: "=SEARCH(A2, A3, A4)", A2: "do", A3: "Odoo Docs", A4: "1" })
    ).toBe(2);
    expect(
      evaluateCell("A1", { A1: "=SEARCH(A2, A3, A4)", A2: "do", A3: "Odoo Docs", A4: "4" })
    ).toBe(6);
    expect(
      evaluateCell("A1", { A1: "=SEARCH(A2, A3, A4)", A2: "S", A3: "Spreadsheet", A4: "1" })
    ).toBe(1);
    expect(
      evaluateCell("A1", { A1: "=SEARCH(A2, A3, A4)", A2: "S", A3: "Spreadsheet", A4: "6" })
    ).toBe(7);
    expect(
      evaluateCell("A1", { A1: "=SEARCH(A2, A3, A4)", A2: "S", A3: "Spreadsheet", A4: "8" })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=SEARCH(A2, A3)", A2: "7", A3: "No.7 Doc" })).toBe(4);
  });

  test("casting tests on cell arguments", () => {
    expect(
      evaluateCell("A1", { A1: "=SEARCH(A2, A3, A4)", A2: "S", A3: "Spreadsheet", A4: '="6"' })
    ).toBe(7);
    expect(
      evaluateCell("A1", { A1: "=SEARCH(A2, A3, A4)", A2: "S", A3: "Spreadsheet", A4: "TRUE" })
    ).toBe(1);
    expect(evaluateCell("A1", { A1: "=SEARCH(A2, A3, A4)", A2: "U", A3: "TRUE", A4: "1" })).toBe(3);
    expect(
      evaluateCell("A1", { A1: "=SEARCH(A2, A3, A4)", A2: "TRUE", A3: "FALSETRUE", A4: "1" })
    ).toBe(6);
  });
});

describe("SPLIT function", () => {
  test("SPLIT takes 2-4 arguments", () => {
    expect(evaluateCell("A1", { A1: "=SPLIT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=SPLIT("Hello")' })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=SPLIT("Hello", " ")' })).toBe("Hello");
    expect(evaluateCell("A1", { A1: '=SPLIT("Hello", " ", 1)' })).toBe("Hello");
    expect(evaluateCell("A1", { A1: '=SPLIT("Hello", " ", 1, 1)' })).toBe("Hello");
    expect(evaluateCell("A1", { A1: '=SPLIT("Hello", " ", 1, 1, 0)' })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
  });

  test("delimiter argument should not be empty", () => {
    expect(evaluateCell("A1", { A1: '=SPLIT("Hello", "", 1, 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=SPLIT("Hello", B1, 1, 1)', B1: '=""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("Simple split", () => {
    const grid = { A1: "Hello there, General Kenobi" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A5", '=SPLIT(A1, " ")');
    expect(getRangeValuesAsMatrix(model, "A5:D5")).toEqual([
      ["Hello", "there,", "General", "Kenobi"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "A1:D1")).toBeTruthy();
  });

  test("Split with multiple characters", () => {
    const grid = { A1: "Hello there, General Kenobi" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A5", '=SPLIT(A1, " e")');
    expect(getRangeValuesAsMatrix(model, "A5:J5")).toEqual([
      ["H", "llo", "th", "r", ",", "G", "n", "ral", "K", "nobi"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "A1:J1")).toBeTruthy();
  });

  test("split_by_each argument", () => {
    const grid = { A1: "Hello there, General Kenobi" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A5", '=SPLIT(A1, ", ", 1)');
    expect(getRangeValuesAsMatrix(model, "A5:D5")).toEqual([
      ["Hello", "there", "General", "Kenobi"],
    ]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "A1:D1")).toBeTruthy();

    setCellContent(model, "A5", '=SPLIT(A1, ", ", 0)');
    expect(getRangeValuesAsMatrix(model, "A5:B5")).toEqual([["Hello there", "General Kenobi"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "A5:B5")).toBeTruthy();
  });

  test("remove_empty_text argument", () => {
    const grid = { A1: "Hello     there" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A5", '=SPLIT(A1, " ", 1, 1)');
    expect(getRangeValuesAsMatrix(model, "A5:B5")).toEqual([["Hello", "there"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "A5:B5")).toBeTruthy();

    setCellContent(model, "A5", '=SPLIT(A1, " ", 1, 0)');
    expect(getRangeValuesAsMatrix(model, "A5:F5")).toEqual([["Hello", "", "", "", "", "there"]]);
    expect(checkFunctionDoesntSpreadBeyondRange(model, "A5:F5")).toBeTruthy();
  });

  test("Split with regex characters", () => {
    const model = new Model();
    setCellContent(model, "A1", "Hello.there");
    setCellContent(model, "A5", '=SPLIT(A1, ".", 1, 1)');
    expect(getRangeValuesAsMatrix(model, "A5:B5")).toEqual([["Hello", "there"]]);

    setCellContent(model, "A1", "Hello\\nthere");
    setCellContent(model, "A5", '=SPLIT(A1, "\\n", 1, 1)');
    expect(getRangeValuesAsMatrix(model, "A5:B5")).toEqual([["Hello", "there"]]);
  });
});

describe("TEXTSPLIT function", () => {
  test("TEXTSPLIT accepts minimum 2 and maximum 6 arguments", () => {
    expect(evaluateCell("A1", { A1: "=TEXTSPLIT()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=TEXTSPLIT("MERA")' })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=TEXTSPLIT("MERA",)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTSPLIT("MERA",,)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTSPLIT("", ",")' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTSPLIT("MERA", ",")' })).toBe("MERA");
    expect(evaluateCell("A1", { A1: '=TEXTSPLIT("MERA", "")' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTSPLIT("MERA",,",")' })).toBe("MERA");
    expect(evaluateCell("A1", { A1: '=TEXTSPLIT("MERA",",",, FALSE, 1)' })).toBe("MERA");
    expect(evaluateCell("A1", { A1: '=TEXTSPLIT("MERA",",",, FALSE, 45)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTSPLIT("MERA",",",, FALSE, 3)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTSPLIT("MERA",",",, FALSE, 0, "HOLA")' })).toBe("MERA");
    expect(evaluateCell("A1", { A1: '=TEXTSPLIT("MERA",",",, NOT_BOOLEAN, 0, "HOLA")' })).toBe(
      "#BAD_EXPR"
    );
    expect(evaluateCell("A1", { A1: '=TEXTSPLIT("MERA","",, FALSE, 0, "HOLA", 1)' })).toBe(
      "#BAD_EXPR"
    );
  });

  test("Split into columns", () => {
    const grid = { A1: "Red,Green,Blue" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(A1, ",")');
    expect(getRangeValuesAsMatrix(model, "A2:C2")).toEqual([["Red", "Green", "Blue"]]);
  });

  test("Split into rows", () => {
    const grid = { A1: "Red;Green;Blue" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(A1, , ";")');
    expect(getRangeValuesAsMatrix(model, "A2:A4")).toEqual([["Red"], ["Green"], ["Blue"]]);
  });

  test("Split by substring", () => {
    const grid = { A1: "2023--11--05" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(A1, "--")');
    expect(getRangeValuesAsMatrix(model, "A2:C2")).toEqual([["2023", "11", "05"]]);
  });

  test("Split into columns and rows", () => {
    const grid = { A1: "Name, Age=City, Country" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(A1, ", ", "=")');
    expect(getRangeValuesAsMatrix(model, "A2:B3")).toEqual([
      ["Name", "Age"],
      ["City", "Country"],
    ]);
  });

  test("Split by the same delimiter in both dimensions", () => {
    const grid = {
      A1: "AppledelimBanana;OrangedelimGrapes;TomatotestPotato",
      H1: "delim",
      H2: ";",
      H3: "test",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(A1, H1:H3, ";")');
    expect(getRangeValuesAsMatrix(model, "A2:F2")).toEqual([
      ["Apple", "Banana", "Orange", "Grapes", "Tomato", "Potato"],
    ]);
  });

  test("Multiple one-character delimiters", () => {
    const grid = { A1: "Apple, Banana;Orange, Grapes;Tomato", F1: ", ", F2: ";" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", "=TEXTSPLIT(A1, F1:F2)");
    expect(getRangeValuesAsMatrix(model, "A2:E2")).toEqual([
      ["Apple", "Banana", "Orange", "Grapes", "Tomato"],
    ]);
  });

  test("Mix of one-character and multi-character delimiters", () => {
    const grid = {
      A1: "AppledelimBanana;OrangedelimGrapes;TomatotestPotato",
      H1: "delim",
      H2: ";",
      H3: "test",
    };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", "=TEXTSPLIT(A1, H1:H3)");
    expect(getRangeValuesAsMatrix(model, "A2:F2")).toEqual([
      ["Apple", "Banana", "Orange", "Grapes", "Tomato", "Potato"],
    ]);
  });

  test("Ignore empty values at column split", () => {
    const grid = { A1: "Dog,,Cat,,Bird" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(A1, ",", , TRUE)');
    expect(getRangeValuesAsMatrix(model, "A2:C2")).toEqual([["Dog", "Cat", "Bird"]]);
  });

  test("Ignore empty values at column split with multiple delimiters", () => {
    const grid = { A1: "Do. Or do not. There is no try. -Anonymous", H1: ".", H2: "-" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", "=TEXTSPLIT(A1,H1:H2,,FALSE)");
    expect(getRangeValuesAsMatrix(model, "A2:E2")).toEqual([
      ["Do", " Or do not", " There is no try", " ", "Anonymous"],
    ]);
  });

  test("Ignore empty values at row split", () => {
    const grid = { A1: "Dog,,Cat,,Bird" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(A1,,",", TRUE)');
    expect(getRangeValuesAsMatrix(model, "A2:A4")).toEqual([["Dog"], ["Cat"], ["Bird"]]);
  });

  test("Ignore empty values at column and row split", () => {
    const grid = { A1: "Name=MERA, , Result=Excellent" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(A1, "=", ", ", TRUE)');
    expect(getRangeValuesAsMatrix(model, "A2:B4")).toEqual([
      ["Name", "MERA"],
      ["Result", "Excellent"],
      [null, null],
    ]);
  });

  test("Case-insensitive split", () => {
    const grid = { A1: "AppleDELIMbanaNADelimcHerry" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(A1, "delim",,,1)');
    expect(getRangeValuesAsMatrix(model, "A2:C2")).toEqual([["Apple", "banaNA", "cHerry"]]);
  });

  test("Case-sensitive split", () => {
    const grid = { A1: "AppleDELIMbanaNADelimcHerry" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(A1, "delim",,,0)');
    expect(getRangeValuesAsMatrix(model, "A2:C2")).toEqual([
      ["AppleDELIMbanaNADelimcHerry", null, null],
    ]);
  });

  test("Pad missing values with custom value", () => {
    const grid = { A1: "Name=MERA, Score, Result=Excellent" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(A1, "=",", ",,,"HOLA_PAD")');
    expect(getRangeValuesAsMatrix(model, "A2:B4")).toEqual([
      ["Name", "MERA"],
      ["Score", "HOLA_PAD"],
      ["Result", "Excellent"],
    ]);
  });

  test("Pad missing values with default value", () => {
    const grid = { A1: "Name=MERA, Score, Result=Excellent" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(A1, "=",", ",,,)');
    expect(getRangeValuesAsMatrix(model, "A2:B4")).toEqual([
      ["Name", "MERA"],
      ["Score", "#N/A"],
      ["Result", "Excellent"],
    ]);
  });

  test("Pad missing values with empty string", () => {
    const grid = { A1: "Name=MERA, Score, Result=Excellent" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(A1, "=",", ",,,"")');
    expect(getRangeValuesAsMatrix(model, "A2:B4")).toEqual([
      ["Name", "MERA"],
      ["Score", ""],
      ["Result", "Excellent"],
    ]);
  });

  test("Split dates", () => {
    const grid = { A1: "2024/05/09" };
    const model = createModelFromGrid(grid);
    setCellContent(model, "A2", '=TEXTSPLIT(TEXT(A1, "m/d/yyyy"), "/")');
    expect(getRangeValuesAsMatrix(model, "A2:C2")).toEqual([["5", "9", "2024"]]);
  });
});

describe("TEXTAFTER function", () => {
  test("TEXTAFTER accepts minimum 2 and maximum 5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=TEXTAFTER()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple")' })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 1)' })).toBe("#N/A");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 1, 0, 1)' })).toBe("");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 1, 0, 1, "N/A")' })).toBe("");
    expect(
      evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 1, 0, 1, "N/A", "extraParam")' })
    ).toBe("#BAD_EXPR");
  });

  test("instance_num should not be zero", () => {
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", -1)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 0)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 1)' })).not.toBe("#ERROR");
  });

  test("match_mode should be either 0 or 1", () => {
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 1, -1)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 1, 0)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 1, 1)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 1, 2)' })).toBe("#ERROR");
  });

  test("match_end should be either 0 or 1", () => {
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 1, 1, -1)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 1, 1, 0)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 1, 1, 1)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", ",", 1, 1, 2)' })).toBe("#ERROR");
  });

  test("Can have an empty delimiter ", () => {
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", "")' })).toBe("apple");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", "", 1)' })).toBe("apple");
    expect(evaluateCell("A1", { A1: '=TEXTAFTER("apple", "", -1)' })).toBe("");
  });

  test("Can match given index", () => {
    const text = "apple,banana,orange";
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, ",", 1)' })).toBe("banana,orange");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, ",", 2)' })).toBe("orange");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, ",", 3)' })).toBe("#N/A");

    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, ",", -1)' })).toBe("orange");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, ",", -2)' })).toBe("banana,orange");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, ",", -3)' })).toBe("#N/A");
  });

  test("using non-existent delimiter returns #N/A", () => {
    const text = "apple,banana,orange";
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, ".")' })).toBe("#N/A");
  });

  test("should use fallback value when delimiter is not found", () => {
    const text = "apple,banana,orange";
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, ".", , , , "Not Found")' })).toBe(
      "Not Found"
    );
  });

  test("can do case-insensitive text matching", () => {
    const text1 = "Start:MATCH:End";
    expect(evaluateCell("A2", { A1: text1, A2: '=TEXTAFTER(A1, "match", , 1)' })).toBe(":End");

    const text2 = "Red riding hood's red hood";
    expect(evaluateCell("A2", { A1: text2, A2: '=TEXTAFTER(A1, "red", -1)' })).toBe(" hood");
  });

  test("setting match_end parameter to 1 treats the end of the text as a delimiter", () => {
    const text = "report.final.v2.pdf";

    // With positive indexes
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, "pdf", 1, , 0)' })).toBe("");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, "pdf", 1, , 1)' })).toBe("");

    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, "pdf", 2, , 0)' })).toBe("#N/A");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, "pdf", 2, , 1)' })).toBe("");

    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, "pdf", 3, , 0)' })).toBe("#N/A");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, "pdf", 3, , 1)' })).toBe("#N/A");

    // With negative indexes
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, "pdf", -1, , 0)' })).toBe("");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, "pdf", -1, , 1)' })).toBe("");

    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, "pdf", -2, , 0)' })).toBe("#N/A");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, "pdf", -2, , 1)' })).toBe(text);

    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, "pdf", -3, , 0)' })).toBe("#N/A");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTAFTER(A1, "pdf", -3, , 1)' })).toBe("#N/A");
  });
});

describe("TEXTBEFORE function", () => {
  test("TEXTBEFORE accepts minimum 2 and maximum 5 arguments", () => {
    expect(evaluateCell("A1", { A1: "=TEXTBEFORE()" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple")' })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 1)' })).toBe("#N/A");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 1, 0, 1)' })).toBe("apple");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 1, 0, 1, "N/A")' })).toBe("apple");
    expect(
      evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 1, 0, 1, "N/A", "extraParam")' })
    ).toBe("#BAD_EXPR");
  });

  test("instance_num should not be zero", () => {
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", -1)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 0)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 1)' })).not.toBe("#ERROR");
  });

  test("match_mode should be either 0 or 1", () => {
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 1, -1)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 1, 0)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 1, 1)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 1, 2)' })).toBe("#ERROR");
  });

  test("match_end should be either 0 or 1", () => {
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 1, 1, -1)' })).toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 1, 1, 0)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 1, 1, 1)' })).not.toBe("#ERROR");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", ",", 1, 1, 2)' })).toBe("#ERROR");
  });

  test("Can have an empty delimiter ", () => {
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", "")' })).toBe("");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", "", 1)' })).toBe("");
    expect(evaluateCell("A1", { A1: '=TEXTBEFORE("apple", "", -1)' })).toBe("apple");
  });

  test("Can match given index", () => {
    const text = "apple,banana,orange";
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, ",", 1)' })).toBe("apple");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, ",", 2)' })).toBe("apple,banana");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, ",", 3)' })).toBe("#N/A");

    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, ",", -1)' })).toBe("apple,banana");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, ",", -2)' })).toBe("apple");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, ",", -3)' })).toBe("#N/A");
  });

  test("using non-existent delimiter returns #N/A", () => {
    const text = "apple,banana,orange";
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, ".")' })).toBe("#N/A");
  });

  test("should use fallback value when delimiter is not found", () => {
    const text = "apple,banana,orange";
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, ".", , , , "Not Found")' })).toBe(
      "Not Found"
    );
  });

  test("can do case-insensitive text matching", () => {
    const text1 = "Start:MATCH:End";
    expect(evaluateCell("A2", { A1: text1, A2: '=TEXTBEFORE(A1, "match", , 1)' })).toBe("Start:");

    const text2 = "Red riding hood's red hood";
    expect(evaluateCell("A2", { A1: text2, A2: '=TEXTBEFORE(A1, "red", -1)' })).toBe(
      "Red riding hood's "
    );
  });

  test("setting match_end parameter to 1 treats the end of the text as a delimiter", () => {
    const text = "report.final.v2.pdf";

    // With positive indexes
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, "pdf", 1, , 0)' })).toBe(
      "report.final.v2."
    );
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, "pdf", 1, , 1)' })).toBe(
      "report.final.v2."
    );

    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, "pdf", 2, , 0)' })).toBe("#N/A");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, "pdf", 2, , 1)' })).toBe(text);

    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, "pdf", 3, , 0)' })).toBe("#N/A");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, "pdf", 3, , 1)' })).toBe("#N/A");

    // With negative indexes
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, "pdf", -1, , 0)' })).toBe(
      "report.final.v2."
    );
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, "pdf", -1, , 1)' })).toBe(
      "report.final.v2."
    );

    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, "pdf", -2, , 0)' })).toBe("#N/A");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, "pdf", -2, , 1)' })).toBe("");

    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, "pdf", -3, , 0)' })).toBe("#N/A");
    expect(evaluateCell("A2", { A1: text, A2: '=TEXTBEFORE(A1, "pdf", -3, , 1)' })).toBe("#N/A");
  });
});

describe("SUBSTITUTE formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=SUBSTITUTE( ,  ,  )" })).toBe("");
    expect(evaluateCell("A1", { A1: '=SUBSTITUTE("Odoo", "do", "de à Odo")' })).toBe("Ode à Odoo");
    expect(evaluateCell("A1", { A1: '=SUBSTITUTE("odoodoo sur MON bidet", "o", "a")' })).toBe(
      "adaadaa sur MON bidet"
    );
    expect(evaluateCell("A1", { A1: '=SUBSTITUTE("Aa", "a", "b")' })).toBe("Ab");
    expect(evaluateCell("A1", { A1: '=SUBSTITUTE("Spread Sheet", "e", "E", 2)' })).toBe(
      "Spread ShEet"
    );
    expect(evaluateCell("A1", { A1: '=SUBSTITUTE("AAAA", "", "B")' })).toBe("AAAA");
  });

  test("functional tests on argument with regexp characters", () => {
    expect(evaluateCell("A1", { A1: '=SUBSTITUTE("(hello)", "(" , ")")' })).toBe(")hello)");
  });

  test("functional tests on cell arguments", () => {
    expect(
      evaluateCell("A1", {
        A1: "=SUBSTITUTE(A2, A3, A4)",
        A2: "Coquille",
        A3: "e",
        A4: 'e sans "q"',
      })
    ).toBe('Coquille sans "q"');
    expect(evaluateCell("A1", { A1: "=SUBSTITUTE(A2, A3, A4)", A2: "ABAB", A3: "A" })).toBe("BB");
    expect(evaluateCell("A1", { A1: "=SUBSTITUTE(A2, A3, A4)", A2: "AAAA", A3: "A" })).toBe("");
    expect(evaluateCell("A1", { A1: "=SUBSTITUTE(A2, A3, A4)", A2: "AAAA" })).toBe("AAAA");
    expect(evaluateCell("A1", { A1: "=SUBSTITUTE(A2, A3, A4)", A2: "AAAA", A4: "B" })).toBe("AAAA");

    expect(
      evaluateCell("A1", { A1: "=SUBSTITUTE(A2, A3, A4)", A2: "Hello there", A3: "e", A4: "E" })
    ).toBe("HEllo thErE");
    expect(
      evaluateCell("A1", { A1: "=SUBSTITUTE(A2, A3, A4, A5)", A2: "Hello there", A3: "e", A4: "E" })
    ).toBe("HEllo thErE");
    expect(
      evaluateCell("A1", {
        A1: "=SUBSTITUTE(A2, A3, A4, A5)",
        A2: "Hello there",
        A3: "e",
        A4: "E",
        A5: "0",
      })
    ).toBe("HEllo thErE");
    expect(
      evaluateCell("A1", {
        A1: "=SUBSTITUTE(A2, A3, A4, A5)",
        A2: "Hello there",
        A3: "e",
        A4: "E",
        A5: "1",
      })
    ).toBe("HEllo there");
    expect(
      evaluateCell("A1", {
        A1: "=SUBSTITUTE(A2, A3, A4, A5)",
        A2: "Hello there",
        A3: "e",
        A4: "E",
        A5: "2",
      })
    ).toBe("Hello thEre");
    expect(
      evaluateCell("A1", {
        A1: "=SUBSTITUTE(A2, A3, A4, A5)",
        A2: "Hello there",
        A3: "e",
        A4: "E",
        A5: "-1",
      })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=SUBSTITUTE(A2, A3, A4)", A2: "22", A3: "2", A4: "99" })).toBe(
      "9999"
    );
    expect(
      evaluateCell("A1", {
        A1: "=SUBSTITUTE(A2, A3, A4, A5)",
        A2: "2222",
        A3: "2",
        A4: "99",
        A5: "3",
      })
    ).toBe("22992");
    expect(
      evaluateCell("A1", { A1: "=SUBSTITUTE(A2, A3, A4)", A2: "TRUE", A3: "E", A4: "QUE" })
    ).toBe("TRUQUE");
  });
});

describe("TEXTJOIN formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=TEXTJOIN( ,  ,  )" })).toBe("");
    expect(evaluateCell("A1", { A1: '=TEXTJOIN("d", TRUE, "O", "oo", "oo", "oo")' })).toBe(
      "Odoodoodoo"
    );
    expect(evaluateCell("A1", { A1: '=TEXTJOIN(" ", TRUE, "1", "2", "3", "", "4")' })).toBe(
      "1 2 3 4"
    );
    expect(evaluateCell("A1", { A1: '=TEXTJOIN(" ", TRUE, "1", "2", "3",  , "4")' })).toBe(
      "1 2 3 4"
    );
    expect(evaluateCell("A1", { A1: '=TEXTJOIN(" ", FALSE, "1", "2", "3", "", "4")' })).toBe(
      "1 2 3  4"
    );
    expect(evaluateCell("A1", { A1: '=TEXTJOIN(" ", FALSE, "1", "2", "3",  , "4")' })).toBe(
      "1 2 3  4"
    );
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=TEXTJOIN(" ", TRUE, 1, 2, 3,  , 4)' })).toBe("1 2 3 4");
    expect(evaluateCell("A1", { A1: '=TEXTJOIN(" ", FALSE, 1, 2, 3,  , 4)' })).toBe("1 2 3  4");
    expect(evaluateCell("A1", { A1: '=TEXTJOIN(" ", 1, "1", "2", "3", "", "4")' })).toBe("1 2 3 4");
    expect(evaluateCell("A1", { A1: '=TEXTJOIN(" ", 0, "1", "2", "3", "", "4")' })).toBe(
      "1 2 3  4"
    );
  });

  test("functional tests on cell arguments", () => {
    expect(
      evaluateCell("A1", {
        A1: "=TEXTJOIN(A2, A3, A4:A6)",
        A2: "PINCE",
        A3: "FALSE",
        A5: "MI et ",
        A6: "MOI sont dans un bateau",
      })
    ).toBe("PINCEMI et PINCEMOI sont dans un bateau");
    expect(
      evaluateCell("A1", {
        A1: "=TEXTJOIN(A2, A3, A4:A6)",
        A2: "PINCE",
        A3: "TRUE",
        A5: "MI et ",
        A6: "MOI sont dans un bateau",
      })
    ).toBe("MI et PINCEMOI sont dans un bateau");
    expect(evaluateCell("A1", { A1: "=TEXTJOIN(A2, A3, A4:A6)", A2: "COU", A3: "FALSE" })).toBe(
      "COUCOU"
    );
    expect(evaluateCell("A1", { A1: "=TEXTJOIN(A2, A3, A4:A6)", A3: "TRUE" })).toBe("");
    expect(evaluateCell("A1", { A1: "=TEXTJOIN(A2, A3, A4:A6)", A2: "TRO", A4: "L'ÂNE " })).toBe(
      "L'ÂNE TROTRO"
    );
  });
});

describe("TRIM formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=TRIM()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=TRIM("")' })).toBe("");
    expect(evaluateCell("A1", { A1: '=TRIM(" ")' })).toBe("");
    expect(evaluateCell("A1", { A1: '=TRIM(" Jean Ticonstitutionnalise ")' })).toBe(
      "Jean Ticonstitutionnalise"
    );
    expect(evaluateCell("A1", { A1: '=TRIM(" A ")' })).toBe("A");
    expect(evaluateCell("A1", { A1: '=TRIM("  A     ")' })).toBe("A");
    expect(evaluateCell("A1", { A1: '=TRIM("  A    B  ")' })).toBe("A B");
    expect(evaluateCell("A1", { A1: '=TRIM("  A   \n B   \n  \n C  ")' })).toBe("A\nB\n\nC"); // @compatibility: the TRIM Excel function does not keep line breaks
    expect(evaluateCell("A1", { A1: '=TRIM(" \t  A   \t B\tC  \t")' })).toBe("A B C");
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=TRIM(123)" })).toBe("123");
    expect(evaluateCell("A1", { A1: "=TRIM(TRUE)" })).toBe("TRUE");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=TRIM(A2)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=TRIM(A2)", A2: " Kikou  " })).toBe("Kikou");
    expect(evaluateCell("A1", { A1: "=TRIM(A2)", A2: '" Kikou  "' })).toBe('" Kikou "');
    expect(evaluateCell("A1", { A1: "=TRIM(A2)", A2: '=" Kikou  "' })).toBe("Kikou");
  });
});

describe("UPPER formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=UPPER()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=UPPER(0)" })).toBe("0");
    expect(evaluateCell("A1", { A1: "=UPPER(42)" })).toBe("42");
    expect(evaluateCell("A1", { A1: '=UPPER("grrrr !")' })).toBe("GRRRR !");
    expect(evaluateCell("A1", { A1: '=UPPER("true")' })).toBe("TRUE");
    expect(evaluateCell("A1", { A1: '=UPPER("false")' })).toBe("FALSE");
    expect(evaluateCell("A1", { A1: '=UPPER("オドゥ")' })).toBe("オドゥ");
    expect(evaluateCell("A1", { A1: '=UPPER("オaドb")' })).toBe("オAドB");
    expect(evaluateCell("A1", { A1: '=UPPER("")' })).toBe("");
    expect(evaluateCell("A1", { A1: '=UPPER(" ")' })).toBe(" ");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=UPPER(A2)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=UPPER(A2)", A2: " " })).toBe(" ");
    expect(evaluateCell("A1", { A1: "=UPPER(A2)", A2: "0" })).toBe("0");
    expect(evaluateCell("A1", { A1: "=UPPER(A2)", A2: '""' })).toBe('""');
    expect(evaluateCell("A1", { A1: "=UPPER(A2)", A2: '" "' })).toBe('" "');
    expect(evaluateCell("A1", { A1: "=UPPER(A2)", A2: '"true"' })).toBe('"TRUE"');
    expect(evaluateCell("A1", { A1: "=UPPER(A2)", A2: '=""' })).toBe("");
    expect(evaluateCell("A1", { A1: "=UPPER(A2)", A2: '=" "' })).toBe(" ");
    expect(evaluateCell("A1", { A1: "=UPPER(A2)", A2: '="test"' })).toBe("TEST");
    expect(evaluateCell("A1", { A1: "=UPPER(A2)", A2: '="true"' })).toBe("TRUE");
  });
});

test("TEXT formula", () => {
  expect(evaluateCell("A1", { A1: '=TEXT(5, "#,##0.00")' })).toBe("5.00");
  expect(evaluateCell("A1", { A1: '=TEXT(.05, "000%")' })).toBe("005%");
  expect(evaluateCell("A1", { A1: "=TEXT(5, 0)" })).toBe("5");
});

test("VALUE formula", () => {
  expect(evaluateCell("A1", { A1: "=VALUE(5)" })).toBe(5);
  expect(evaluateCell("A1", { A1: '=VALUE("")' })).toBe(0);
  expect(evaluateCell("A1", { A1: '=VALUE("$10")' })).toBe(10);
  expect(evaluateCell("A1", { A1: '=VALUE("12:00")' })).toBe(0.5);
  expect(evaluateCell("A1", { A1: '=VALUE("01/19/1900")' })).toBe(20);
  expect(evaluateCell("A1", { A1: '=VALUE("ABC")' })).toBe("#ERROR");
  expect(evaluateCell("A1", { A1: "=VALUE(1/0)" })).toBe("#DIV/0!");
  expect(evaluateCell("A1", { A1: "=VALUE(A2)", A2: "12.5" })).toBe(12.5);
  expect(evaluateCell("A1", { A1: "=VALUE(A2)" })).toBe(0);
});
