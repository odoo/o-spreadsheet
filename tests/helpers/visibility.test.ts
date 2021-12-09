import { Model } from "../../src";
import { reduceZoneToVisibleHeaders, toZone } from "../../src/helpers";
import { hideColumns, hideRows } from "../test_helpers/commands_helpers";

describe("Visibility helpers", () => {
  test("reduceZoneToVisibleHeaders", () => {
    const model = new Model();
    hideColumns(model, ["B", "C"]);
    hideRows(model, [1]);

    const sheet = model.getters.getActiveSheet();
    expect(reduceZoneToVisibleHeaders(sheet, toZone("A1:D4"))).toEqual(toZone("A1:D4"));
    expect(reduceZoneToVisibleHeaders(sheet, toZone("B2:C2"))).toBeUndefined();
    expect(reduceZoneToVisibleHeaders(sheet, toZone("A2:D4"))).toEqual(toZone("A3:D4"));
    expect(reduceZoneToVisibleHeaders(sheet, toZone("B1:D4"))).toEqual(toZone("D1:D4"));
  });
});
