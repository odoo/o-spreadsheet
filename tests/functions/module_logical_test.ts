import { evaluateCell } from "../helpers";

describe("bool", () => {
  //----------------------------------------------------------------------------
  // AND
  //----------------------------------------------------------------------------

  test("AND: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=AND( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=AND(TRUE, TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=AND(FALSE, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=AND(FALSE, TRUE)" })).toBe(false);
  });

  test("AND: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=AND("" , TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=AND("true" , TRUE)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=AND("false" , TRUE)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=AND("test" , TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=AND("test" , FALSE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=AND(TRUE , "test")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=AND(FALSE , "test")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=AND(TRUE , "1")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=AND(0 , TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=AND(42 , TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=AND(-42 , TRUE)" })).toBe(true);
  });

  test("AND: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A2: "test", A3: "TRUE", A4: "FALSE" })).toBe(
      false
    );
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A2: "test", A3: "TRUE", A4: "TRUE" })).toBe(
      true
    );
  });

  test("AND: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A2: "test", A3: "TRUE", A4: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A2: "test", A3: "TRUE", A4: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A3: '="TRUE"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A3: "42" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=AND(A2:A5)", A3: '="42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  //----------------------------------------------------------------------------
  // IF
  //----------------------------------------------------------------------------

  test("IF: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=IF( ,  ,  )" })).toBe("");
    expect(evaluateCell("A1", { A1: "=IF( , 1, 2)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=IF(FALSE , 1, 2)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=IF(TRUE , 1, 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: '=IF(TRUE , "1", 2)' })).toBe("1");
    expect(evaluateCell("A1", { A1: "=IF(TRUE , FALSE, 2)" })).toBe(false);
  });

  test("IF: functional tests on simple arguments with errors", () => {
    expect(evaluateCell("A1", { A1: "=IF(TRUE,42,1/0)" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=IF(TRUE,1/0,42)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
  });

  test("IF: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=IF(42, 1, 2)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IF(0, 1, 2)" })).toBe(2);
    expect(evaluateCell("A1", { A1: '=IF("test", 1, 2)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("IF: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A2: "TRUE", A3: "1", A4: "2" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A2: "FALSE", A3: "1", A4: "2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A2: " ", A3: "1", A4: "2" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("IF: functional tests on cell arguments with errors", () => {
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A2: "TRUE", A3: "42", A4: "=1/0" })).toBe(
      42
    );
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A2: "TRUE", A3: "=1/0", A4: "42" })).toBe(
      "#ERROR"
    ); // @compatibility: on google sheets, return #DIV/0!
  });

  test("IF: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A2: "0", A3: "1", A4: "2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=IF(A2, A3, A4)", A3: "1", A4: "2" })).toBe(2);
  });

  //----------------------------------------------------------------------------
  // IFERROR
  //----------------------------------------------------------------------------

  test("IFERROR: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFERROR( )" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=IFERROR( ,  )" })).toBe("");
    expect(evaluateCell("A1", { A1: "=IFERROR(FALSE , 42)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=IFERROR(TRUE , 42)" })).toBe(true);
    expect(evaluateCell("A1", { A1: '=IFERROR("" , 42)' })).toBe("");
    expect(evaluateCell("A1", { A1: "=IFERROR(3% , 42)" })).toBe(0.03);
  });

  test("IFERROR: functional tests on simple arguments with errors", () => {
    expect(evaluateCell("A1", { A1: "=IFERROR(FALSE, 42/0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=IFERROR(42/0, FALSE)" })).toBe(false);
  });

  test("IFERROR: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "=A2" })).toBe(42); // corespond to #CYCLE error
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "=(+" })).toBe(42); // corespond to #BAD_EXPR error
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "=SQRT(-1)" })).toBe(42); // corespond to #ERROR error

    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "3" })).toBe(3);
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, 42)", A2: "test" })).toBe("test");
  });

  test("IFERROR: functional tests on cell arguments with errors", () => {
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, A3)", A2: "TRUE", A3: "=1/0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=IFERROR(A2, A3)", A2: "=1/0", A3: "=1/0" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
  });

  //----------------------------------------------------------------------------
  // IFS
  //----------------------------------------------------------------------------

  test("IFS: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFS( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IFS( , 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IFS(FALSE, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IFS(TRUE, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: '=IFS(TRUE, "1")' })).toBe("1");
    expect(evaluateCell("A1", { A1: "=IFS(TRUE, FALSE)" })).toBe(false);
  });

  test("IFS: functional tests on simple arguments with errors", () => {
    expect(evaluateCell("A1", { A1: '=IFS(TRUE, "ok1", 1/0, 1/0)' })).toBe("ok1");
    expect(evaluateCell("A1", { A1: '=IFS(1/0, "ok1", TRUE, 42)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=IFS(TRUE, 1/0, TRUE, 42)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
  });

  test("IFS: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFS(42, 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IFS(0, 1)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: '=IFS("test", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("IFS: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFS(A2, A3)", A3: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IFS(A2, A3)", A2: "TRUE", A3: "1" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=IFS(A2, A3)", A2: "FALSE", A3: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=IFS(A2, A3)", A2: "test", A3: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(
      evaluateCell("A1", {
        A1: "=IFS(A2, A3, A4, A5)",
        A2: "False",
        A3: "ok1",
        A4: "TRUE",
        A5: "ok2",
      })
    ).toBe("ok2");
    expect(
      evaluateCell("A1", {
        A1: "=IFS(A2, A3, A4, A5)",
        A2: "TRUE",
        A3: "ok1",
        A4: "TRUE",
        A5: "ok2",
      })
    ).toBe("ok1");
  });

  test("IFS: functional tests on cell arguments with errors", () => {
    expect(
      evaluateCell("A1", {
        A1: "=IFS(A2, A3, A4, A5)",
        A2: "TRUE",
        A3: "ok1",
        A4: "=1/0",
        A5: "=1/0",
      })
    ).toBe("ok1");
    expect(
      evaluateCell("A1", {
        A1: "=IFS(A2, A3, A4, A5)",
        A2: "=1/0",
        A3: "ok1",
        A4: "TRUE",
        A5: "42",
      })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(
      evaluateCell("A1", {
        A1: "=IFS(A2, A3, A4, A5)",
        A2: "TRUE",
        A3: "=1/0",
        A4: "TRUE",
        A5: "42",
      })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
  });

  test("IFS: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=IFS(A2, A3)", A2: "test", A3: "1" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=IFS(A2, A3)", A2: "1", A3: "2" })).toBe(2);
    expect(
      evaluateCell("A1", { A1: "=IFS(A2, A3, A4, A5)", A2: "42", A3: "ok1", A4: "TRUE", A5: "ok2" })
    ).toBe("ok1");
    expect(
      evaluateCell("A1", { A1: "=IFS(A2, A3, A4, A5)", A2: "0", A3: "ok1", A4: "TRUE", A5: "ok2" })
    ).toBe("ok2");
    expect(
      evaluateCell("A1", {
        A1: "=IFS(A2, A3, A4, A5)",
        A2: "test",
        A3: "ok1",
        A4: "TRUE",
        A5: "ok2",
      })
    ).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  //----------------------------------------------------------------------------
  // NOT
  //----------------------------------------------------------------------------

  test("NOT: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=NOT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A// @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=NOT(TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(FALSE)" })).toBe(true);
  });

  test("NOT: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=NOT(0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NOT(1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(42)" })).toBe(false);
    expect(evaluateCell("A1", { A1: '=NOT("test")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=NOT("true")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=NOT("false")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=NOT("1")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("NOT: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=NOT(A2)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "=TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "=FALSE" })).toBe(true);
  });

  test("NOT: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "42" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: "test" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: '"true"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: '"false"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: '="true"' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: '="false"' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NOT(A2)", A2: '"0"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  //----------------------------------------------------------------------------
  // OR
  //----------------------------------------------------------------------------

  test("OR: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=OR( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=OR(TRUE, TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=OR(FALSE, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=OR(FALSE, TRUE)" })).toBe(true);
  });

  test("OR: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=OR("" , TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=OR("true" , TRUE)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=OR("false" , TRUE)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=OR("false" , FALSE)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=OR("test" , TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=OR("test" , FALSE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=OR(FALSE , "test")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=OR(TRUE , "test")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=OR(TRUE , "1")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=OR("1", TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=OR(0 , TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=OR(42 , FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=OR(-42 , FALSE)" })).toBe(true);
  });

  test("OR: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A2: "test", A3: "TRUE", A4: "FALSE" })).toBe(
      true
    );
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A2: "test", A3: "TRUE", A4: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A2: "test", A3: "FALSE", A4: "FALSE" })).toBe(
      false
    );
  });

  test("OR: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A2: "test", A3: "TRUE", A4: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A2: "test", A3: "FALSE", A4: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A3: '="TRUE"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A3: "42" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=OR(A2:A5)", A3: '="42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  //----------------------------------------------------------------------------
  // XOR
  //----------------------------------------------------------------------------

  test("XOR: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=XOR( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=XOR(TRUE, TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=XOR(FALSE, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=XOR(FALSE, TRUE)" })).toBe(true);
  });

  test("XOR: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=XOR("" , TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=XOR("true" , TRUE)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=XOR("false" , TRUE)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=XOR("false" , FALSE)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=XOR("test" , TRUE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=XOR("test" , FALSE)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=XOR(TRUE , "test" )' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=XOR(FALSE , "test" )' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=XOR(TRUE , "1")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=XOR(0 , TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=XOR(42 , FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=XOR(-42 , FALSE)" })).toBe(true);
  });

  test("XOR: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "test", A3: "TRUE", A4: "FALSE" })).toBe(
      true
    );
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "test", A3: "TRUE", A4: "TRUE" })).toBe(
      false
    );
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "TRUE", A3: "TRUE", A4: "TRUE" })).toBe(
      true
    );
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "FALSE", A3: "FALSE", A4: "FALSE" })).toBe(
      false
    );
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "FALSE", A3: "TRUE", A4: "TRUE" })).toBe(
      false
    );
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "test", A3: "FALSE", A4: "FALSE" })).toBe(
      false
    );
  });

  test("XOR: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "test", A3: "TRUE", A4: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A2: "test", A3: "FALSE", A4: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A3: '="TRUE"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A3: "42" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=XOR(A2:A5)", A3: '="42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });
});
