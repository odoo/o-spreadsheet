import { evaluateCell, evaluateGrid } from "../helpers";

describe("text", () => {
  //----------------------------------------------------------------------------
  // CHAR
  //----------------------------------------------------------------------------

  test("CHAR: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=CHAR()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CHAR(65)" })).toBe("A");
    expect(evaluateCell("A1", { A1: "=CHAR(122)" })).toBe("z");
    expect(evaluateCell("A1", { A1: "=CHAR(57)" })).toBe("9");
    expect(evaluateCell("A1", { A1: "=CHAR(-1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CHAR(65.9)" })).toBe("A");
  });

  test("CHAR: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=CHAR("65")' })).toBe("A");
  });

  test("CHAR: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=CHAR(A2)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: "66" })).toBe("B");
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: "121" })).toBe("y");
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: "56" })).toBe("8");
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: "-1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #NUM!
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: "66.9" })).toBe("B");
  });

  test("CHAR: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: '"68"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=CHAR(A2)", A2: '="68"' })).toBe("D");
  });

  //----------------------------------------------------------------------------
  // CONCATENATE
  //----------------------------------------------------------------------------

  test("CONCATENATE: functional tests on simple arguments", () => {
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

  test("CONCATENATE: functional tests on cell arguments", () => {
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
  test("CONCATENATE: functional tests on range arguments", () => {
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

  //----------------------------------------------------------------------------
  // JOIN
  //----------------------------------------------------------------------------

  test("JOIN: functional tests on simple arguments", () => {
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

  test("JOIN: functional tests on cell arguments", () => {
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
        A5: '="3"'
      })
    ).toBe("19293");
    expect(
      evaluateCell("A1", { A1: "=JOIN(A2, A3, A4, A5)", A2: "TRUE", A3: "1", A4: "2", A5: "3" })
    ).toBe("1TRUE2TRUE3");
  });

  // prettier-ignore
  test("JOIN: functional tests on range arguments", () => {
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

  //----------------------------------------------------------------------------
  // LEFT
  //----------------------------------------------------------------------------

  test("LEFT: functional tests on simple arguments", () => {
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

  test("LEFT: functional tests on cell arguments", () => {
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

  //----------------------------------------------------------------------------
  // LEN
  //----------------------------------------------------------------------------

  test("LEN: functional tests on simple arguments", () => {
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

  test("LEN: functional tests on cell arguments", () => {
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

  //----------------------------------------------------------------------------
  // LOWER
  //----------------------------------------------------------------------------

  test("LOWER: functional tests on simple arguments", () => {
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

  test("LOWER: functional tests on cell arguments", () => {
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

  //----------------------------------------------------------------------------
  // RIGHT
  //----------------------------------------------------------------------------

  test("RIGHT: functional tests on simple arguments", () => {
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

  test("RIGHT: functional tests on cell arguments", () => {
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

  //----------------------------------------------------------------------------
  // SEARCH
  //----------------------------------------------------------------------------

  test("SEARCH: functional tests on simple arguments", () => {
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

  test("SEARCH: functional tests on cell arguments", () => {
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

  test("SEARCH: casting tests on cell arguments", () => {
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

  //----------------------------------------------------------------------------
  // SUBSTITUTE
  //----------------------------------------------------------------------------

  test("SUBSTITUTE: functional tests on simple arguments", () => {
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

  test("SUBSTITUTE: functional tests on cell arguments", () => {
    expect(
      evaluateCell("A1", {
        A1: "=SUBSTITUTE(A2, A3, A4)",
        A2: "Coquille",
        A3: "e",
        A4: 'e sans "q"'
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
        A5: "0"
      })
    ).toBe("HEllo thErE");
    expect(
      evaluateCell("A1", {
        A1: "=SUBSTITUTE(A2, A3, A4, A5)",
        A2: "Hello there",
        A3: "e",
        A4: "E",
        A5: "1"
      })
    ).toBe("HEllo there");
    expect(
      evaluateCell("A1", {
        A1: "=SUBSTITUTE(A2, A3, A4, A5)",
        A2: "Hello there",
        A3: "e",
        A4: "E",
        A5: "2"
      })
    ).toBe("Hello thEre");
    expect(
      evaluateCell("A1", {
        A1: "=SUBSTITUTE(A2, A3, A4, A5)",
        A2: "Hello there",
        A3: "e",
        A4: "E",
        A5: "-1"
      })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("SUBSTITUTE: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=SUBSTITUTE(A2, A3, A4)", A2: "22", A3: "2", A4: "99" })).toBe(
      "9999"
    );
    expect(
      evaluateCell("A1", {
        A1: "=SUBSTITUTE(A2, A3, A4, A5)",
        A2: "2222",
        A3: "2",
        A4: "99",
        A5: "3"
      })
    ).toBe("22992");
    expect(
      evaluateCell("A1", { A1: "=SUBSTITUTE(A2, A3, A4)", A2: "TRUE", A3: "E", A4: "QUE" })
    ).toBe("TRUQUE");
  });

  //----------------------------------------------------------------------------
  // TEXTJOIN
  //----------------------------------------------------------------------------

  test("TEXTJOIN: functional tests on simple arguments", () => {
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

  test("TEXTJOIN: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=TEXTJOIN(" ", TRUE, 1, 2, 3,  , 4)' })).toBe("1 2 3 4");
    expect(evaluateCell("A1", { A1: '=TEXTJOIN(" ", FALSE, 1, 2, 3,  , 4)' })).toBe("1 2 3  4");
    expect(evaluateCell("A1", { A1: '=TEXTJOIN(" ", 1, "1", "2", "3", "", "4")' })).toBe("1 2 3 4");
    expect(evaluateCell("A1", { A1: '=TEXTJOIN(" ", 0, "1", "2", "3", "", "4")' })).toBe(
      "1 2 3  4"
    );
  });

  test("TEXTJOIN: functional tests on cell arguments", () => {
    expect(
      evaluateCell("A1", {
        A1: "=TEXTJOIN(A2, A3, A4:A6)",
        A2: "PINCE",
        A3: "FALSE",
        A5: "MI et ",
        A6: "MOI sont dans un bateau"
      })
    ).toBe("PINCEMI et PINCEMOI sont dans un bateau");
    expect(
      evaluateCell("A1", {
        A1: "=TEXTJOIN(A2, A3, A4:A6)",
        A2: "PINCE",
        A3: "TRUE",
        A5: "MI et ",
        A6: "MOI sont dans un bateau"
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

  //----------------------------------------------------------------------------
  // TRIM
  //----------------------------------------------------------------------------

  test("TRIM: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=TRIM()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=TRIM("")' })).toBe("");
    expect(evaluateCell("A1", { A1: '=TRIM(" ")' })).toBe("");
    expect(evaluateCell("A1", { A1: '=TRIM(" Jean Ticonstitutionnalise ")' })).toBe(
      "Jean Ticonstitutionnalise"
    );
    expect(evaluateCell("A1", { A1: '=TRIM(" A ")' })).toBe("A");
    expect(evaluateCell("A1", { A1: '=TRIM("  A     ")' })).toBe("A");
  });

  test("TRIM: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=TRIM(123)" })).toBe("123");
    expect(evaluateCell("A1", { A1: "=TRIM(TRUE)" })).toBe("TRUE");
  });

  test("TRIM: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=TRIM(A2)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=TRIM(A2)", A2: " Kikou  " })).toBe("Kikou");
    expect(evaluateCell("A1", { A1: "=TRIM(A2)", A2: '" Kikou  "' })).toBe('" Kikou  "');
    expect(evaluateCell("A1", { A1: "=TRIM(A2)", A2: '=" Kikou  "' })).toBe("Kikou");
  });

  //----------------------------------------------------------------------------
  // UPPER
  //----------------------------------------------------------------------------

  test("UPPER: functional tests on simple arguments", () => {
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

  test("UPPER: functional tests on cell arguments", () => {
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
