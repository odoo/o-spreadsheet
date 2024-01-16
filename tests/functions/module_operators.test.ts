import { evaluateCell, evaluateCellFormat } from "../test_helpers/helpers";

describe("ADD formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ADD()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ADD( ,  )" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ADD( , 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ADD(42, 24)" })).toBe(66);
    expect(evaluateCell("A1", { A1: "=ADD(42, -24)" })).toBe(18);
    expect(evaluateCell("A1", { A1: "=ADD(42, 0.42)" })).toBe(42.42);
    expect(evaluateCell("A1", { A1: "=ADD(42, 42%)" })).toBe(42.42);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=ADD(1, "")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=ADD(1, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=ADD(1, "3")' })).toBe(4);
    expect(evaluateCell("A1", { A1: '=ADD(1, "-3")' })).toBe(-2);
    expect(evaluateCell("A1", { A1: "=ADD(1, TRUE)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=ADD(1, FALSE)" })).toBe(1);
    expect(evaluateCell("A1", { A1: '=ADD(1, "3%")' })).toBe(1.03);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "1" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "1", A3: "42" })).toBe(43);
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "-1", A3: "4.2" })).toBe(3.2);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: '"3"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: "TRUE" })).toBe(43);
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: "FALSE" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: '=""' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: '="42"' })).toBe(84);
  });

  test("result format depends on 1st argument and 2nd argument", () => {
    expect(evaluateCellFormat("A3", { A1: "0.42", A2: "1", A3: "=A1+A2" })).toBe("");
    expect(evaluateCellFormat("A3", { A1: "42%", A2: "1", A3: "=A1+A2" })).toBe("0%");
    expect(evaluateCellFormat("A3", { A1: "1", A2: "42%", A3: "=A1+A2" })).toBe("0%");
  });
});

describe("CONCAT formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=CONCAT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CONCAT( ,  )" })).toBe("");
    expect(evaluateCell("A1", { A1: "=CONCAT( , 1)" })).toBe("1");
    expect(evaluateCell("A1", { A1: "=CONCAT(42, 24)" })).toBe("4224");
    expect(evaluateCell("A1", { A1: "=CONCAT(42, -24)" })).toBe("42-24");
    expect(evaluateCell("A1", { A1: "=CONCAT(42, 0.42)" })).toBe("420.42");
    expect(evaluateCell("A1", { A1: "=CONCAT(42, 42%)" })).toBe("420.42");
    expect(evaluateCell("A1", { A1: '=CONCAT(1, "")' })).toBe("1");
    expect(evaluateCell("A1", { A1: '=CONCAT(1, " ")' })).toBe("1 ");
    expect(evaluateCell("A1", { A1: '=CONCAT(1, "3")' })).toBe("13");
    expect(evaluateCell("A1", { A1: '=CONCAT(1, "-3")' })).toBe("1-3");
    expect(evaluateCell("A1", { A1: "=CONCAT(1, TRUE)" })).toBe("1TRUE");
    expect(evaluateCell("A1", { A1: "=CONCAT(1, FALSE)" })).toBe("1FALSE");
    expect(evaluateCell("A1", { A1: '=CONCAT(1, "3%")' })).toBe("13%");
    expect(evaluateCell("A1", { A1: '=CONCAT("ki", "kou")' })).toBe("kikou");
    expect(evaluateCell("A1", { A1: '=CONCAT("TRUE", TRUE)' })).toBe("TRUETRUE");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "1" })).toBe("1");
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "1", A3: "42" })).toBe("142");
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "42", A3: '""' })).toBe('42""');
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "42", A3: '"42"' })).toBe('42"42"');
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "42", A3: "TRUE" })).toBe("42TRUE");
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: '"TRUE"', A3: "TRUE" })).toBe(
      '"TRUE"TRUE'
    );
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "42", A3: '=""' })).toBe("42");
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "42", A3: '=" "' })).toBe("42 ");
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "42", A3: '="24"' })).toBe("4224");
  });
});

describe("DIVIDE formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=DIVIDE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DIVIDE( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=DIVIDE( , 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DIVIDE(84, 42)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=DIVIDE(48, -24)" })).toBe(-2);
    expect(evaluateCell("A1", { A1: "=DIVIDE(1, 0.5)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=DIVIDE(1, 5%)" })).toBe(20);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=DIVIDE("", 1)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=DIVIDE(" ", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=DIVIDE("4", 2)' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=DIVIDE("-4", 2)' })).toBe(-2);
    expect(evaluateCell("A1", { A1: "=DIVIDE(TRUE, 0.5)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=DIVIDE(FALSE, 42)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=DIVIDE(1, "50%")' })).toBe(2);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: "42", A3: "2" })).toBe(21);
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: "4.2", A3: "-1" })).toBe(-4.2);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: '""', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: '" "', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: '"3"', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: "TRUE", A3: "2" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: '=""', A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: '=" "', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: "42", A3: '="42"' })).toBe(1);
  });

  test("result format depends on 1st argument and 2nd argument", () => {
    expect(evaluateCellFormat("A3", { A1: "0.42", A2: "1", A3: "=A1/A2" })).toBe("");
    expect(evaluateCellFormat("A3", { A1: "42%", A2: "1", A3: "=A1/A2" })).toBe("0%");
    expect(evaluateCellFormat("A3", { A1: "1", A2: "42%", A3: "=A1/A2" })).toBe("0%");
  });
});

describe("EQ formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=EQ()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=EQ( ,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ( , 0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(42, 42)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(42, -42)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(42, 42%)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(0.42, 42%)" })).toBe(true);
    expect(evaluateCell("A1", { A1: '=EQ("",  )' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=EQ("", 0)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=EQ("", " ")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=EQ("", "kikou")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=EQ("KIKOU", "kikou")' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(TRUE, 1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(TRUE, )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(FALSE, 0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(FALSE, )" })).toBe(true);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "42", A3: "42" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "42", A3: "-42" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "0.42", A3: "42%" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A3: "test" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "TEST", A3: "test" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "TRUE", A3: "1" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: '=""' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: '=""', A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "=TRUE", A3: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: '="42"', A3: "42" })).toBe(false);
  });

  test("EQ doesn't accept error values", () => {
    expect(evaluateCell("A1", { A1: "=EQ(A2, 42)", A2: "=KABOUM" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=EQ(KABOUM, KABOUM)" })).toBe("#BAD_EXPR");
  });
});

describe("GT formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=GT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=GT( ,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT( , 1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(1,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(42, 42)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(42, 24)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(24, -22)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(42, 42%)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(0.42, 0.41)" })).toBe(true);

    expect(evaluateCell("A1", { A1: '=GT("", )' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT( , "")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(0, )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT( , 0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT("", 0)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT(0, "")' })).toBe(false);

    expect(evaluateCell("A1", { A1: '=GT("", " ")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT(" ", "")' })).toBe(true);

    expect(evaluateCell("A1", { A1: '=GT("b", "a")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT("a", "b")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT("KIKOU", "kikou")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT("kikou", "KIKOU")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT("5", "100")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT("100", "5")' })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GT(TRUE, 0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(0, TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(FALSE, 1)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(1, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(TRUE,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT( , TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(FALSE,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT( , FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(TRUE, FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(FALSE, TRUE)" })).toBe(false);

    expect(evaluateCell("A1", { A1: '=GT(32, "32")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT(32, "31")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT("32", 31)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT("32", 99)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT("32", 1)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT("1", 99999)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT("1", "99999")' })).toBe(false);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A3: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "42", A3: "42" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "42", A3: "24" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: '=""' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A3: '=""' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: '=""', A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "0", A3: '=""' })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "b", A3: "a" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "a", A3: "b" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "A", A3: "a" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "a", A3: "A" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "TRUE", A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "0", A3: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "FALSE", A3: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "1", A3: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A3: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A3: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "TRUE", A3: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "FALSE", A3: "TRUE" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: '="1"', A3: "99999" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: '="1"', A3: '="99999"' })).toBe(false);
  });
});

describe("GTE formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=GTE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=GTE( ,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE( , 1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(1,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(42, 42)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(42, 24)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(24, -22)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(42, 42%)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(0.42, 0.41)" })).toBe(true);

    expect(evaluateCell("A1", { A1: '=GTE("", )' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE( , "")' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(0, )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE( , 0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("", 0)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE(0, "")' })).toBe(false);

    expect(evaluateCell("A1", { A1: '=GTE("", " ")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GTE(" ", "")' })).toBe(true);

    expect(evaluateCell("A1", { A1: '=GTE("b", "a")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("a", "b")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GTE("KIKOU", "kikou")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("kikou", "KIKOU")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("5", "100")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("100", "5")' })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GTE(TRUE, 0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(0, TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(FALSE, 1)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(1, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(TRUE,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE( , TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(FALSE,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE( , FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(TRUE, FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(FALSE, TRUE)" })).toBe(false);

    expect(evaluateCell("A1", { A1: '=GTE(32, "32")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GTE(32, "31")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GTE("32", 31)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("32", 99)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("32", 1)' })).toBe(true);

    expect(evaluateCell("A1", { A1: '=GTE("1", 99999)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("1", "99999")' })).toBe(false);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A3: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "42", A3: "42" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "42", A3: "24" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: '=""' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A3: '=""' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: '=""', A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "0", A3: '=""' })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "b", A3: "a" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "a", A3: "b" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "A", A3: "a" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "a", A3: "A" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "TRUE", A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "0", A3: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "FALSE", A3: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "1", A3: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A3: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A3: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "TRUE", A3: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "FALSE", A3: "TRUE" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: '="1"', A3: "99999" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: '="1"', A3: '="99999"' })).toBe(false);
  });

  test("GTE doesnt accept error values", () => {
    expect(evaluateCell("A1", { A1: "=?GTE(A2, 42)", A2: "=KABOUM" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=GTE(KABOUM, KABOUM)" })).toBe("#BAD_EXPR");
  });
});

describe("LT formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=LT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=LT( ,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT( , 1)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(1,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(42, 42)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(42, 24)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(24, -22)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(42, 42%)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(0.42, 0.41)" })).toBe(false);

    expect(evaluateCell("A1", { A1: '=LT("", )' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT( , "")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(0, )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT( , 0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("", 0)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT(0, "")' })).toBe(true);

    expect(evaluateCell("A1", { A1: '=LT("", " ")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LT(" ", "")' })).toBe(false);

    expect(evaluateCell("A1", { A1: '=LT("b", "a")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("a", "b")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LT("KIKOU", "kikou")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("kikou", "KIKOU")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("5", "100")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("100", "5")' })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LT(TRUE, 0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(0, TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(FALSE, 1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(1, FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(TRUE,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT( , TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(FALSE,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT( , FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(TRUE, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(FALSE, TRUE)" })).toBe(true);

    expect(evaluateCell("A1", { A1: '=LT(32, "32")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LT(32, "31")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LT("32", 31)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("32", 99)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("32", 1)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("1", 99999)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("1", "99999")' })).toBe(true);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A3: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "42", A3: "42" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "42", A3: "24" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: '=""' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A3: '=""' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: '=""', A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "0", A3: '=""' })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "b", A3: "a" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "a", A3: "b" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "A", A3: "a" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "a", A3: "A" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "TRUE", A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "0", A3: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "FALSE", A3: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "1", A3: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A3: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A3: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "TRUE", A3: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "FALSE", A3: "TRUE" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: '="1"', A3: "99999" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: '="1"', A3: '="99999"' })).toBe(true);
  });

  test("LT doesn't accept error values", () => {
    expect(evaluateCell("A1", { A1: "=LT(A2, 42)", A2: "=KABOUM" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=LT(KABOUM, KABOUM)" })).toBe("#BAD_EXPR");
  });
});

describe("LTE formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=LTE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=LTE( ,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE( , 1)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(1,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(42, 42)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(42, 24)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(24, -22)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(42, 42%)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(0.42, 0.41)" })).toBe(false);

    expect(evaluateCell("A1", { A1: '=LTE("", )' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE( , "")' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(0, )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE( , 0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE("", 0)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LTE(0, "")' })).toBe(true);

    expect(evaluateCell("A1", { A1: '=LTE("", " ")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE(" ", "")' })).toBe(false);

    expect(evaluateCell("A1", { A1: '=LTE("b", "a")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LTE("a", "b")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE("KIKOU", "kikou")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE("kikou", "KIKOU")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE("5", "100")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LTE("100", "5")' })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LTE(TRUE, 0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(0, TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(FALSE, 1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(1, FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(TRUE,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE( , TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(FALSE,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE( , FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(TRUE, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(FALSE, TRUE)" })).toBe(true);

    expect(evaluateCell("A1", { A1: '=LTE(32, "32")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE(32, "31")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE("32", 31)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LTE("32", 99)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LTE("32", 1)' })).toBe(false);

    expect(evaluateCell("A1", { A1: '=LTE("1", 99999)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LTE("1", "99999")' })).toBe(true);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A3: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "42", A3: "42" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "42", A3: "24" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: '=""' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A3: '=""' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: '=""', A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "0", A3: '=""' })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "b", A3: "a" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "a", A3: "b" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "A", A3: "a" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "a", A3: "A" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "TRUE", A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "0", A3: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "FALSE", A3: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "1", A3: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A3: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A3: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "TRUE", A3: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "FALSE", A3: "TRUE" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: '="1"', A3: "99999" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: '="1"', A3: '="99999"' })).toBe(true);
  });

  test("LTE doesn't accept error values", () => {
    expect(evaluateCell("A1", { A1: "=LTE(A2, 42)", A2: "=KABOUM" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=LTE(KABOUM, KABOUM)" })).toBe("#BAD_EXPR");
  });
});

describe("MINUS formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=MINUS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MINUS( ,  )" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINUS( , 1)" })).toBe(-1);
    expect(evaluateCell("A1", { A1: "=MINUS(42, 24)" })).toBe(18);
    expect(evaluateCell("A1", { A1: "=MINUS(42, -24)" })).toBe(66);
    expect(evaluateCell("A1", { A1: "=MINUS(42, 0.42)" })).toBe(41.58);
    expect(evaluateCell("A1", { A1: "=MINUS(42, 42%)" })).toBe(41.58);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=MINUS(1, "")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=MINUS(1, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MINUS(1, "3")' })).toBe(-2);
    expect(evaluateCell("A1", { A1: '=MINUS(1, "-3")' })).toBe(4);
    expect(evaluateCell("A1", { A1: "=MINUS(1, TRUE)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINUS(1, FALSE)" })).toBe(1);
    expect(evaluateCell("A1", { A1: '=MINUS(1, "3%")' })).toBe(0.97);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "1" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A3: "1" })).toBe(-1);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "1", A3: "42" })).toBe(-41);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "-1", A3: "4.2" })).toBe(-5.2);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: '"3"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: "TRUE" })).toBe(41);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: "FALSE" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: '=""' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: '="42"' })).toBe(0);
  });

  test("result format depends on 1st argument and 2nd argument", () => {
    expect(evaluateCellFormat("A3", { A1: "0.42", A2: "1", A3: "=A1-A2" })).toBe("");
    expect(evaluateCellFormat("A3", { A1: "42%", A2: "1", A3: "=A1-A2" })).toBe("0%");
    expect(evaluateCellFormat("A3", { A1: "1", A2: "42%", A3: "=A1-A2" })).toBe("0%");
  });
});

describe("MULTIPLY formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=MULTIPLY()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MULTIPLY( ,  )" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MULTIPLY( , 2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(2, 4)" })).toBe(8);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(2, -3)" })).toBe(-6);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(3, 0.5)" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(2, 5%)" })).toBe(0.1);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=MULTIPLY("", 1)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MULTIPLY(" ", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MULTIPLY("4", 2)' })).toBe(8);
    expect(evaluateCell("A1", { A1: '=MULTIPLY("-3", 2)' })).toBe(-6);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(TRUE, 0.5)" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(FALSE, 42)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MULTIPLY(2, "50%")' })).toBe(1);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: "42", A3: "2" })).toBe(84);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: "4.2", A3: "-2" })).toBe(-8.4);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: '""', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: '" "', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: '"3"', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: "TRUE", A3: "2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: '=""', A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: '=" "', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: "42", A3: '="42"' })).toBe(1764);
  });

  test("result format depends on 1st argument and 2nd argument", () => {
    expect(evaluateCellFormat("A3", { A1: "0.42", A2: "1", A3: "=A1*A2" })).toBe("");
    expect(evaluateCellFormat("A3", { A1: "42%", A2: "1", A3: "=A1*A2" })).toBe("0%");
    expect(evaluateCellFormat("A3", { A1: "1", A2: "42%", A3: "=A1*A2" })).toBe("0%");
  });
});

describe("NE formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=NE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=NE( ,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE( , 0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(42, 42)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(42, -42)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(42, 42%)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(0.42, 42%)" })).toBe(false);
    expect(evaluateCell("A1", { A1: '=NE("",  )' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=NE("", 0)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=NE("", " ")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=NE("", "kikou")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=NE("KIKOU", "kikou")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(TRUE, 1)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(TRUE, )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(FALSE, 0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(FALSE, )" })).toBe(false);
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: "42", A3: "42" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: "42", A3: "-42" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: "0.42", A3: "42%" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A3: "test" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: "TEST", A3: "test" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: "TRUE", A3: "1" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: '=""' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: '=""', A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: "=TRUE", A3: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: '="42"', A3: "42" })).toBe(true);
  });

  test("NE doesn't accept error values", () => {
    expect(evaluateCell("A1", { A1: "=NE(A2, 42)", A2: "=KABOUM" })).toBe("#BAD_EXPR");
    expect(evaluateCell("A1", { A1: "=NE(KABOUM, KABOUM)" })).toBe("#BAD_EXPR");
  });
});

describe("POW formula", () => {
  test.each([
    ["0", "0", 1],
    ["0", "0.5", 0],
    ["4", "0", 1],
    ["0", "4", 0],
    ["4", "2", 16],
    ["-4", "2", 16],
    ["4", "3", 64],
    ["-4", "3", -64],
    ["4", "0.5", 2],
    ["4", "-0.5", 0.5],
    ["4", "-2", 0.0625],
  ])("take 2 parameters, return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test.each([
    ["-4", "0.5"],
    ["-4", "1.5"],
    ["-4", "0.2"],
  ])("take 2 parameters, return an error on parameter 2", (a, b) => {
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: a, A3: b })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("special value testing", () => {
    expect(evaluateCell("A1", { A1: "=POW()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=POW( , )" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(42, 2)" })).toBe(1764);
    expect(evaluateCell("A1", { A1: "=POW( , 12)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=POW(42, )" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(42.42, TRUE)" })).toBe(42.42);
    expect(evaluateCell("A1", { A1: "=POW(42.42, FALSE)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(TRUE, 10)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(FALSE, 10)" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=POW("" , "")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=POW("" , 12)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=POW(" " , 12)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=POW("42", 2)' })).toBe(1764);
    expect(evaluateCell("A1", { A1: '=POW("42", "2")' })).toBe(1764);
    expect(evaluateCell("A1", { A1: '=POW("42", "")' })).toBe(1);

    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "", A3: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "42", A3: "2" })).toBe(1764);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "", A3: "12" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "42", A3: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "42.42", A3: "TRUE" })).toBe(42.42);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "42.42", A3: "FALSE" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "TRUE", A3: "10" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "FALSE", A3: "10" })).toBe(0);

    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: '"42"', A3: '"12"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: '=""', A3: '="2"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: '="42"', A3: '="2"' })).toBe(1764);
  });
});

describe("UMINUS formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=UMINUS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=UMINUS(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UMINUS(2)" })).toBe(-2);
    expect(evaluateCell("A1", { A1: "=UMINUS(-3)" })).toBe(3);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=UMINUS("")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=UMINUS(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=UMINUS("4")' })).toBe(-4);
    expect(evaluateCell("A1", { A1: '=UMINUS("-3")' })).toBe(3);
    expect(evaluateCell("A1", { A1: "=UMINUS(TRUE)" })).toBe(-1);
    expect(evaluateCell("A1", { A1: "=UMINUS(FALSE)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=UMINUS("test")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: "-2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: "3" })).toBe(-3);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: "TRUE" })).toBe(-1);
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: "FALSE" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: '="42"' })).toBe(-42);
  });

  test("format tests on linked operator", () => {
    expect(evaluateCellFormat("A3", { A1: "0.25", A3: "=-A1" })).toBe("");
    expect(evaluateCellFormat("A3", { A1: "25%", A3: "=-A1" })).toBe("0%");
  });
});

describe("UNARY.PERCENT formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(2)" })).toBe(0.02);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(-3)" })).toBe(-0.03);
  });

  test("casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=UNARY.PERCENT("")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=UNARY.PERCENT(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=UNARY.PERCENT("4")' })).toBe(0.04);
    expect(evaluateCell("A1", { A1: '=UNARY.PERCENT("-3")' })).toBe(-0.03);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(3%)" })).toBe(0.0003);
    expect(evaluateCell("A1", { A1: '=UNARY.PERCENT("3%")' })).toBe(0.0003);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(TRUE)" })).toBe(0.01);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(FALSE)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=UNARY.PERCENT("test")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: "-2" })).toBe(-0.02);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: "3" })).toBe(0.03);
  });

  test("casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: "TRUE" })).toBe(0.01);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: "FALSE" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: '="42"' })).toBe(0.42);
  });
});

describe("UPLUS formula", () => {
  test("functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=UPLUS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=UPLUS(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UPLUS(2)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=UPLUS(-3)" })).toBe(-3);
    expect(evaluateCell("A1", { A1: '=UPLUS("")' })).toBe("");
    expect(evaluateCell("A1", { A1: '=UPLUS(" ")' })).toBe(" ");
    expect(evaluateCell("A1", { A1: '=UPLUS("4")' })).toBe("4");
    expect(evaluateCell("A1", { A1: '=UPLUS("-3")' })).toBe("-3");
    expect(evaluateCell("A1", { A1: "=UPLUS(TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=UPLUS(FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: '=UPLUS("test")' })).toBe("test");
  });

  test("functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=UPLUS(A2)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=UPLUS(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UPLUS(A2)", A2: "-2" })).toBe(-2);
    expect(evaluateCell("A1", { A1: "=UPLUS(A2)", A2: "3" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=UPLUS(A2)", A2: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=UPLUS(A2)", A2: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=UPLUS(A2)", A2: '""' })).toBe('""');
    expect(evaluateCell("A1", { A1: "=UPLUS(A2)", A2: '" "' })).toBe('" "');
    expect(evaluateCell("A1", { A1: "=UPLUS(A2)", A2: '"42"' })).toBe('"42"');
    expect(evaluateCell("A1", { A1: "=UPLUS(A2)", A2: '=""' })).toBe("");
    expect(evaluateCell("A1", { A1: "=UPLUS(A2)", A2: '="42"' })).toBe("42");
  });

  test("format tests on linked operator", () => {
    expect(evaluateCellFormat("A3", { A1: "0.25", A3: "=+A1" })).toBe("");
    expect(evaluateCellFormat("A3", { A1: "25%", A3: "=+A1" })).toBe("0%");
  });
});
