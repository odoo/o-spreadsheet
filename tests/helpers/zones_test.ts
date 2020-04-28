import { recomputeZones } from "../../src/helpers/index";

describe("recomputeZones", () => {
  test("add a cell to zone(1)", () => {
    const toKeep = ["A1:C3", "A4"];
    const expectedZone = ["A1:A4", "B1:C3"];
    expect(recomputeZones(toKeep, [])).toEqual(expectedZone);
  });

  test("add a cell to zone(2)", () => {
    const toKeep = ["A1:C3", "D1"];
    const expectedZone = ["A1:C3", "D1"];
    expect(recomputeZones(toKeep, [])).toEqual(expectedZone);
  });

  test("add a row to a zone", () => {
    const toKeep = ["A1:C3", "A4:C4"];
    const expectedZone = ["A1:C4"];
    expect(recomputeZones(toKeep, [])).toEqual(expectedZone);
  });

  test("add a col to a zone", () => {
    const toKeep = ["A1:C3", "D1:D3"];
    const expectedZone = ["A1:D3"];
    expect(recomputeZones(toKeep, [])).toEqual(expectedZone);
  });
  test("merge zones", () => {
    const toKeep = ["A1:B3", "B2:C5", "C1:C5"];
    const expectedZone = ["A1:A3", "B1:C5"];
    expect(recomputeZones(toKeep, [])).toEqual(expectedZone);
  });
  test("zones included", () => {
    const toKeep = ["A1:D6", "A2:C3"];
    const expectedZone = ["A1:D6"];
    expect(recomputeZones(toKeep, [])).toEqual(expectedZone);
  });
  test("remove a cell (1)", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["A1"];
    const expectedZone = ["A2:A6", "B1:D6"];
    expect(recomputeZones(toKeep, toRemove)).toEqual(expectedZone);
  });
  test("remove a cell (2)", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["D6"];
    const expectedZone = ["A1:C6", "D1:D5"];
    expect(recomputeZones(toKeep, toRemove)).toEqual(expectedZone);
  });
  test("remove a cell (3)", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["B3"];
    const expectedZone = ["A1:A6", "B1:B2", "B4:B6", "C1:D6"];
    expect(recomputeZones(toKeep, toRemove)).toEqual(expectedZone);
  });
  test("remove a zone", () => {
    const toKeep = ["A1:D6"];
    const toRemove = ["B1:C6"];
    const expectedZone = ["A1:A6", "D1:D6"];
    expect(recomputeZones(toKeep, toRemove)).toEqual(expectedZone);
  });
});
