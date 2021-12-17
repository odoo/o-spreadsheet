import { loopThroughReferenceType } from "../../src/helpers/reference_type";
import { Token } from "./../../src/formulas/tokenizer";

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
