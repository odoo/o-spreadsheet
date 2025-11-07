import { ZoneSet } from "@odoo/o-spreadsheet-engine/plugins/ui_core_views/cell_evaluation/zone_set";
import { toUnboundedZone, toZone } from "../../src/helpers";

describe("ZoneSet", () => {
  test("empty ZoneSet has nothing", () => {
    const set = new ZoneSet();
    expect(set.has(toZone("A1"))).toBe(false);
    expect(Array.from(set)).toEqual([]);
  });

  test("add and remove single cell zone", () => {
    const set = new ZoneSet();
    set.add(toZone("B2"));
    expect(set.has(toZone("B2"))).toBe(true);
    set.delete(toZone("B2"));
    expect(set.has(toZone("B2"))).toBe(false);
    expect(Array.from(set)).toEqual([]);
  });

  test("add and remove single zone", () => {
    const set = new ZoneSet();
    set.add(toZone("B2:C3"));
    expect(set.has(toZone("B2"))).toBe(true);
    expect(set.has(toZone("C3"))).toBe(true);
    expect(set.has(toZone("B2:B3"))).toBe(true);
    expect(set.has(toZone("C2:C3"))).toBe(true);
    set.delete(toZone("B2:C3"));
    expect(set.has(toZone("B2"))).toBe(false);
    expect(set.has(toZone("C3"))).toBe(false);
    expect(set.has(toZone("B2:B3"))).toBe(false);
    expect(set.has(toZone("C2:C3"))).toBe(false);
    expect(Array.from(set)).toEqual([]);
  });

  test("add and remove single unbounded zone: B2:3", () => {
    const set = new ZoneSet();
    set.add(toUnboundedZone("B2:3"));
    expect(set.has(toUnboundedZone("B2"))).toBeTruthy();
    expect(set.has(toUnboundedZone("Z3"))).toBeTruthy();
    expect(set.has(toUnboundedZone("B2:Z3"))).toBeTruthy();
    expect(set.has(toUnboundedZone("Z2:3"))).toBeTruthy();
    set.delete(toUnboundedZone("B2:3"));
    expect(set.has(toUnboundedZone("B2"))).toBeFalsy();
    expect(set.has(toUnboundedZone("Z3"))).toBeFalsy();
    expect(set.has(toUnboundedZone("B2:Z3"))).toBeFalsy();
    expect(set.has(toUnboundedZone("Z2:3"))).toBeFalsy();
    expect(Array.from(set)).toEqual([]);
  });

  test("add and remove single unbounded zone: B2:C", () => {
    const set = new ZoneSet();
    set.add(toUnboundedZone("B2:C"));
    expect(set.has(toUnboundedZone("B2"))).toBeTruthy();
    expect(set.has(toUnboundedZone("C100"))).toBeTruthy();
    expect(set.has(toUnboundedZone("B2:C100"))).toBeTruthy();
    expect(set.has(toUnboundedZone("B100:C"))).toBeTruthy();
    set.delete(toUnboundedZone("B2:C"));
    expect(set.has(toUnboundedZone("B2"))).toBeFalsy();
    expect(set.has(toUnboundedZone("C100"))).toBeFalsy();
    expect(set.has(toUnboundedZone("B2:C100"))).toBeFalsy();
    expect(set.has(toUnboundedZone("B100:C"))).toBeFalsy();
    expect(Array.from(set)).toEqual([]);
  });

  test("add and remove single unbounded zone: B:C", () => {
    const set = new ZoneSet();
    set.add(toUnboundedZone("B:C"));
    expect(set.has(toUnboundedZone("B2"))).toBeTruthy();
    expect(set.has(toUnboundedZone("C3"))).toBeTruthy();
    expect(set.has(toUnboundedZone("B2:B3"))).toBeTruthy();
    expect(set.has(toUnboundedZone("C2:C"))).toBeTruthy();
    expect(set.has(toUnboundedZone("C:C"))).toBeTruthy();
    set.delete(toUnboundedZone("B:C"));
    expect(set.has(toUnboundedZone("B2"))).toBeFalsy();
    expect(set.has(toUnboundedZone("C3"))).toBeFalsy();
    expect(set.has(toUnboundedZone("B2:B3"))).toBeFalsy();
    expect(set.has(toUnboundedZone("C2:C"))).toBeFalsy();
    expect(set.has(toUnboundedZone("C:C"))).toBeFalsy();
    expect(Array.from(set)).toEqual([]);
  });

  test("add and remove single unbounded zone: 2:3", () => {
    const set = new ZoneSet();
    set.add(toUnboundedZone("2:3"));
    expect(set.has(toUnboundedZone("B2"))).toBeTruthy();
    expect(set.has(toUnboundedZone("C3"))).toBeTruthy();
    expect(set.has(toUnboundedZone("B2:B3"))).toBeTruthy();
    expect(set.has(toUnboundedZone("C2:3"))).toBeTruthy();
    expect(set.has(toUnboundedZone("3:3"))).toBeTruthy();
    set.delete(toUnboundedZone("2:3"));
    expect(set.has(toUnboundedZone("B2"))).toBeFalsy();
    expect(set.has(toUnboundedZone("C3"))).toBeFalsy();
    expect(set.has(toUnboundedZone("B2:B3"))).toBeFalsy();
    expect(set.has(toUnboundedZone("C2:3"))).toBeFalsy();
    expect(set.has(toUnboundedZone("3:3"))).toBeFalsy();
    expect(Array.from(set)).toEqual([]);
  });

  test("zone equality: same zone added twice", () => {
    const set = new ZoneSet();
    set.add(toZone("A1:A5"));
    set.add(toZone("A1:A5"));
    expect(Array.from(set)).toEqual([toZone("A1:A5")]);
    set.delete(toZone("A1:A5"));
    expect(Array.from(set)).toEqual([]);
  });

  test("removing a part of a zone", () => {
    const set = new ZoneSet();
    set.add(toZone("B2:B4"));
    set.delete(toZone("B3"));
    expect(set.has(toZone("B2"))).toBe(true);
    expect(set.has(toZone("B3"))).toBe(false);
    expect(set.has(toZone("B4"))).toBe(true);
    expect(Array.from(set)).toEqual([toZone("B2"), toZone("B4")]);
  });

  test("removing a part of a unbounded zone", () => {
    const set = new ZoneSet();
    set.add(toUnboundedZone("B2:4"));
    set.delete(toUnboundedZone("D2:D4"));
    expect(set.has(toUnboundedZone("C2"))).toBeTruthy();
    expect(set.has(toUnboundedZone("D3"))).toBeFalsy();
    expect(set.has(toUnboundedZone("E4"))).toBeTruthy();
    expect(Array.from(set)).toEqual([toUnboundedZone("B2:C4"), toUnboundedZone("E2:4")]);
  });

  test("remove a bigger zone", () => {
    const set = new ZoneSet();
    set.add(toZone("B2:B4"));
    set.delete(toZone("B1:B5"));
    expect(set.has(toZone("B2:B4"))).toBe(false);
    expect(Array.from(set)).toEqual([]);
  });

  test("difference between two sets", () => {
    const setA = new ZoneSet();
    setA.add(toZone("A1:A5"));
    setA.add(toZone("B1:B5"));
    const setB = new ZoneSet();
    setB.add(toZone("A3:A7"));
    setB.add(toZone("C1:C5"));
    const difference = setA.difference(setB);
    expect(Array.from(difference)).toEqual([toZone("A1:A2"), toZone("B1:B5")]);
  });

  test("difference between two sets with unbounded zones", () => {
    const setA = new ZoneSet();
    setA.add(toUnboundedZone("A1:A"));
    setA.add(toUnboundedZone("B1:B"));
    const setB = new ZoneSet();
    setB.add(toUnboundedZone("A3:A"));
    setB.add(toUnboundedZone("B1:B3"));
    const difference = setA.difference(setB);
    expect(Array.from(difference)).toEqual([toUnboundedZone("A1:A2"), toUnboundedZone("B4:B")]);
  });

  test("difference with an empty set", () => {
    const setA = new ZoneSet();
    setA.add(toZone("A1:A5"));
    setA.add(toZone("B1:B5"));
    const difference = setA.difference(new ZoneSet());
    expect(Array.from(difference)).toEqual([toZone("A1:B5")]);
  });

  test("difference creates a new set", () => {
    const setA = new ZoneSet();
    setA.add(toZone("A1:A5"));
    const difference = setA.difference(new ZoneSet());
    setA.delete(toZone("A1:A5"));
    expect(Array.from(difference)).toEqual([toZone("A1:A5")]);
  });

  test("A1: add, has, delete", () => {
    const set = new ZoneSet();
    set.add(toZone("A1"));
    expect(set.has(toZone("A1"))).toBe(true);
    set.delete(toZone("A1"));
    expect(set.has(toZone("A1"))).toBe(false);
  });

  test("first column: add and check", () => {
    const set = new ZoneSet();
    set.add(toZone("A1:A5"));
    expect(set.has(toZone("A1"))).toBe(true);
    expect(set.has(toZone("A5"))).toBe(true);
    expect(set.has(toZone("A6"))).toBe(false);
    expect(set.has(toZone("B1"))).toBe(false);
  });

  test("first row: add and check", () => {
    const set = new ZoneSet();
    set.add(toZone("A1:E1"));
    expect(set.has(toZone("A1"))).toBe(true);
    expect(set.has(toZone("E1"))).toBe(true);
    expect(set.has(toZone("F1"))).toBe(false);
  });

  test("adjacent to A1 are not contained", () => {
    const set = new ZoneSet();
    set.add(toZone("A1"));
    expect(set.has(toZone("B1"))).toBe(false);
    expect(set.has(toZone("A2"))).toBe(false);
    expect(set.has(toZone("B2"))).toBe(false);
  });

  test("mixing two adjacent zones on first row", () => {
    const set = new ZoneSet();
    set.add(toZone("C1"));
    set.add(toZone("D1"));
    expect(set.has(toZone("C1"))).toBe(true);
    expect(set.has(toZone("D1"))).toBe(true);
    expect(Array.from(set)).toEqual([toZone("C1:D1")]);
  });

  test("iterator groups adjacent zones", () => {
    const set = new ZoneSet();
    set.add(toZone("B2:B3"));
    set.add(toZone("C2:C3"));
    expect(Array.from(set)).toEqual([toZone("B2:C3")]);
  });

  test("adjacent zones are not contained", () => {
    const set = new ZoneSet();
    set.add(toZone("B2"));
    expect(set.has(toZone("B1"))).toBe(false);
    expect(set.has(toZone("A2"))).toBe(false);
    expect(set.has(toZone("C2"))).toBe(false);
    expect(set.has(toZone("B3"))).toBe(false);
  });

  test("contained cell zone", () => {
    const set = new ZoneSet();
    set.add(toZone("A1:A3"));
    expect(set.has(toZone("A1"))).toBe(true);
    expect(set.has(toZone("A2"))).toBe(true);
    expect(set.has(toZone("A3"))).toBe(true);
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

  test("removing a full zone", () => {
    const set = new ZoneSet();
    set.add(toZone("B2:B3"));
    set.delete(toZone("B2:B3"));
    expect(set.has(toZone("B2:B3"))).toBe(false);
    expect(Array.from(set)).toEqual([]);
  });

  test("empty set is empty", () => {
    const set = new ZoneSet();
    expect(set.isEmpty()).toBe(true);
    set.add(toZone("A1"));
    expect(set.isEmpty()).toBe(false);
    set.delete(toZone("A1"));
    expect(set.isEmpty()).toBe(true);
  });

  test("empty when multiple zones", () => {
    const set = new ZoneSet();
    set.add(toZone("A1"));
    set.add(toZone("B2"));
    expect(set.isEmpty()).toBe(false);
    set.delete(toZone("A1"));
    expect(set.isEmpty()).toBe(false);
    set.delete(toZone("B2"));
    expect(set.isEmpty()).toBe(true);
  });

  test("overlap two zones but not contained", () => {
    const set = new ZoneSet();
    set.add(toZone("A1:A3"));
    set.add(toZone("A5:A7"));
    expect(set.has(toZone("A2:A6"))).toBeFalsy();
  });
});
