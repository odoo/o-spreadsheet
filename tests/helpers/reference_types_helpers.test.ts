import { Token } from "../../src/formulas";

function refToken(referenceString: string): Token {
  return { type: "REFERENCE", value: referenceString };
}

describe("loopThroughReferenceType", () => {
  test("on cell", () => {
    expect(loopThroughReferenceType(refToken("A1"))).toEqual(refToken("$A$1"));
    expect(loopThroughReferenceType(refToken("$A$1"))).toEqual(refToken("A$1"));
    expect(loopThroughReferenceType(refToken("A$1"))).toEqual(refToken("$A1"));
    expect(loopThroughReferenceType(refToken("$A1"))).toEqual(refToken("A1"));
  });

  test("on range", () => {
    expect(loopThroughReferenceType(refToken("A1:B1"))).toEqual(refToken("$A$1:$B$1"));
    expect(loopThroughReferenceType(refToken("$A$1:$B$1"))).toEqual(refToken("A$1:B$1"));
    expect(loopThroughReferenceType(refToken("A$1:B$1"))).toEqual(refToken("$A1:$B1"));
    expect(loopThroughReferenceType(refToken("$A1:$B1"))).toEqual(refToken("A1:B1"));
  });

  test("reference type loop separately on cells of range", () => {
    expect(loopThroughReferenceType(refToken("$A1:B1"))).toEqual(refToken("A1:$B$1"));
    expect(loopThroughReferenceType(refToken("A1:$B$1"))).toEqual(refToken("$A$1:B$1"));
    expect(loopThroughReferenceType(refToken("$A$1:B$1"))).toEqual(refToken("A$1:$B1"));
    expect(loopThroughReferenceType(refToken("A$1:$B1"))).toEqual(refToken("$A1:B1"));
  });

  test("can have sheet reference on cell", () => {
    expect(loopThroughReferenceType(refToken("Sheet2!A1"))).toEqual(refToken("Sheet2!$A$1"));
    expect(loopThroughReferenceType(refToken("Sheet2!$A$1"))).toEqual(refToken("Sheet2!A$1"));
    expect(loopThroughReferenceType(refToken("Sheet2!A$1"))).toEqual(refToken("Sheet2!$A1"));
    expect(loopThroughReferenceType(refToken("Sheet2!$A1"))).toEqual(refToken("Sheet2!A1"));
  });

  test("on full rows", () => {
    expect(loopThroughReferenceType(refToken("1:5"))).toEqual(refToken("$1:$5"));
    expect(loopThroughReferenceType(refToken("$1:$5"))).toEqual(refToken("1:5"));
    expect(loopThroughReferenceType(refToken("$1:5"))).toEqual(refToken("1:$5"));
    expect(loopThroughReferenceType(refToken("1:$5"))).toEqual(refToken("$1:5"));
    expect(loopThroughReferenceType(refToken("B1:3"))).toEqual(refToken("$B$1:$3"));
    expect(loopThroughReferenceType(refToken("$B$1:$3"))).toEqual(refToken("B$1:3"));
    expect(loopThroughReferenceType(refToken("B$1:3"))).toEqual(refToken("$B1:$3"));
    expect(loopThroughReferenceType(refToken("$B1:$3"))).toEqual(refToken("B1:3"));
  });

  test("on full columns", () => {
    expect(loopThroughReferenceType(refToken("A:B"))).toEqual(refToken("$A:$B"));
    expect(loopThroughReferenceType(refToken("$A:$B"))).toEqual(refToken("A:B"));
    expect(loopThroughReferenceType(refToken("$A:B"))).toEqual(refToken("A:$B"));
    expect(loopThroughReferenceType(refToken("A:$B"))).toEqual(refToken("$A:B"));
    expect(loopThroughReferenceType(refToken("B2:C"))).toEqual(refToken("$B$2:$C"));
    expect(loopThroughReferenceType(refToken("$B$2:$C"))).toEqual(refToken("B$2:C"));
    expect(loopThroughReferenceType(refToken("B$2:C"))).toEqual(refToken("$B2:$C"));
    expect(loopThroughReferenceType(refToken("$B2:$C"))).toEqual(refToken("B2:C"));
  });

  test("can have sheet reference on range", () => {
    expect(loopThroughReferenceType(refToken("Sheet2!A1:B1"))).toEqual(
      refToken("Sheet2!$A$1:$B$1")
    );
    expect(loopThroughReferenceType(refToken("Sheet2!$A$1:$B$1"))).toEqual(
      refToken("Sheet2!A$1:B$1")
    );
    expect(loopThroughReferenceType(refToken("Sheet2!A$1:B$1"))).toEqual(
      refToken("Sheet2!$A1:$B1")
    );
    expect(loopThroughReferenceType(refToken("Sheet2!$A1:$B1"))).toEqual(refToken("Sheet2!A1:B1"));
  });

  describe("setXcToFixedReferenceType", () => {
    test.each(["A1", "$A1", "A$1", "$A$1"])("simple ref", (ref) => {
      expect(setXcToFixedReferenceType(ref, "none")).toBe("A1");
      expect(setXcToFixedReferenceType(ref, "col")).toBe("$A1");
      expect(setXcToFixedReferenceType(ref, "row")).toBe("A$1");
      expect(setXcToFixedReferenceType(ref, "colrow")).toBe("$A$1");
    });

    test.each(["Sheet!A1", "Sheet!$A1", "Sheet!A$1", "Sheet!$A$1"])("with sheetName", (ref) => {
      expect(setXcToFixedReferenceType(ref, "none")).toBe("Sheet!A1");
      expect(setXcToFixedReferenceType(ref, "col")).toBe("Sheet!$A1");
      expect(setXcToFixedReferenceType(ref, "row")).toBe("Sheet!A$1");
      expect(setXcToFixedReferenceType(ref, "colrow")).toBe("Sheet!$A$1");
    });

    // ranges = [A1:C3, $A1:C3 ... A1:$C3 ... $A$1:$C$3]
    const ranges = ["A1", "$A1", "A$1", "$A$1"].flatMap((topLeft) =>
      ["C3", "$C3", "C$3", "$C$3"].map((bottomRight) => `${topLeft}:${bottomRight}`)
    );
    test.each(ranges)("ranges", (ref) => {
      expect(setXcToFixedReferenceType(ref, "none")).toBe("A1:C3");
      expect(setXcToFixedReferenceType(ref, "col")).toBe("$A1:$C3");
      expect(setXcToFixedReferenceType(ref, "row")).toBe("A$1:C$3");
      expect(setXcToFixedReferenceType(ref, "colrow")).toBe("$A$1:$C$3");
    });
  });
});
