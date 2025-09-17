import { toZone } from "../../src/helpers";
import { ZoneSet } from "../../src/helpers/recompute_zones";

describe("ZoneSet", () => {
  test("single cell zone", () => {
    const set = new ZoneSet();
    const A1 = toZone("A1");
    expect(set.has(A1)).toBe(false);
    set.add(A1);
    expect(set.has(A1)).toBe(true);
  });

  test("contained cell zone", () => {
    const set = new ZoneSet();
    set.add(toZone("A1:A3"));
    expect(set.has(toZone("A1"))).toBe(true);
    expect(set.has(toZone("A2"))).toBe(true);
    expect(set.has(toZone("A3"))).toBe(true);
  });

  test("adjacent zones are not contained", () => {
    const set = new ZoneSet();
    set.add(toZone("B2"));
    // expect(set.has(toZone("B1"))).toBe(false);
    // expect(set.has(toZone("A2"))).toBe(false);
    expect(set.has(toZone("C2"))).toBe(false);
    // expect(set.has(toZone("B3"))).toBe(false);
  });

  test("two zones on the same column", () => {
    const set = new ZoneSet();
    set.add(toZone("A2:A3"));
    set.add(toZone("A10:A15"));
    expect(set.has(toZone("A2"))).toBe(true);
    expect(set.has(toZone("A13"))).toBe(true);
    expect(set.has(toZone("A1"))).toBe(false);
    expect(set.has(toZone("A5"))).toBe(false);
    expect(set.has(toZone("A16"))).toBe(false);
  });

  test("mixing two adjacent zones", () => {
    const set = new ZoneSet();
    set.add(toZone("B2:B3"));
    set.add(toZone("C2:C3"));
    expect(set.has(toZone("B2:C3"))).toBe(true);
    expect(set.has(toZone("B2:C2"))).toBe(true);
    expect(set.has(toZone("B3:C3"))).toBe(true);

    expect(set.has(toZone("B1:C3"))).toBe(false);
    expect(set.has(toZone("A2:C2"))).toBe(false);
    expect(set.has(toZone("B2:D2"))).toBe(false);
  });
});
