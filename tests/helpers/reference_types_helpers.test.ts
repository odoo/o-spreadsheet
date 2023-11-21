import { Token } from "../../src/formulas";
import { loopThroughReferenceType } from "../../src/helpers/reference_type";

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
});
