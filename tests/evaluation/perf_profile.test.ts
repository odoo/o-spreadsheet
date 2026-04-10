import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import { setCellContent } from "../test_helpers/commands_helpers";
import { createModelFromGrid } from "../test_helpers/helpers";

let now = 0;

beforeEach(() => {
  now = 0;
  jest.spyOn(performance, "now").mockImplementation(() => {
    now += 10;
    return now;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Performance profiling", () => {
  test("getPerfProfile is undefined after a regular evaluation", () => {
    const model = new Model();
    setCellContent(model, "A1", "=SUM(B1:B3)");
    expect(model.getters.getPerfProfile()).toBeUndefined();
    model.dispatch("EVALUATE_CELLS");
    expect(model.getters.getPerfProfile()).toBeUndefined();
  });

  test("getPerfProfile returns a profile after profiling evaluation", () => {
    const model = createModelFromGrid({ A1: "=SUM(B1:B3)", B1: "1", B2: "2", B3: "3" });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile = model.getters.getPerfProfile();
    expect(profile).toBeDefined();
    expect(profile?.totalTime).toBe(10);
    expect(profile?.totalCells).toBe(4);
    expect(profile?.totalFunctionCalls).toBe(1);
    expect(profile?.entries).toEqual([
      {
        functionName: "SUM",
        time: 10,
        range: expect.objectContaining({ zone: toZone("A1") }),
      },
    ]);
  });

  test("the same function called multiple times in a single formula is counted correctly", () => {
    const model = createModelFromGrid({ A1: "=SUM(1,2) + SUM(3,4)" });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile = model.getters.getPerfProfile()!;
    expect(profile.totalFunctionCalls).toBe(3); // 2x SUM + 1x +
    expect(profile.totalTime).toBe(30); // 10ms per function call
    expect(profile.entries).toEqual([
      { functionName: "SUM", time: 20, range: expect.objectContaining({ zone: toZone("A1") }) },
      { functionName: "+", time: 10, range: expect.objectContaining({ zone: toZone("A1") }) },
    ]);
  });

  test("profile counts function calls", () => {
    const model = createModelFromGrid({
      A1: "=SUM(1, 2)",
      A2: "=SUM(3, 4)",
    });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile = model.getters.getPerfProfile()!;
    expect(profile.totalFunctionCalls).toBe(2);
  });

  test("profile entries are sorted by time descending", () => {
    const model = createModelFromGrid({
      A1: "=SUM(1, 2)",
      A2: "=ABS(-5)",
    });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile = model.getters.getPerfProfile()!;
    for (let i = 1; i < profile.entries.length; i++) {
      expect(profile.entries[i - 1].time).toBeGreaterThanOrEqual(profile.entries[i].time);
    }
  });

  test("cells with the same fingerprint are grouped", () => {
    const model = createModelFromGrid({
      A1: "=SUM(B1, 1)",
      A2: "=SUM(B2, 1)",
    });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile = model.getters.getPerfProfile()!;
    expect(profile.entries).toEqual([
      {
        functionName: "SUM",
        time: 20,
        range: expect.objectContaining({ zone: toZone("A1:A2") }),
      },
    ]);
  });

  test("cells with different fingerprints are not grouped", () => {
    const model = createModelFromGrid({
      A1: "=SUM(B1, 1)",
      A2: "=SUM(B2, B3)",
    });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile = model.getters.getPerfProfile()!;
    expect(profile.entries).toEqual([
      {
        functionName: "SUM",
        time: 10,
        range: expect.objectContaining({ zone: toZone("A1") }),
      },
      {
        functionName: "SUM",
        time: 10,
        range: expect.objectContaining({ zone: toZone("A2") }),
      },
    ]);
  });

  test("operators are displayed as symbols, not internal names", () => {
    const model = createModelFromGrid({ A1: "=1+2" });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile = model.getters.getPerfProfile()!;
    const addEntry = profile.entries.find((e) => e.functionName === "+");
    expect(addEntry).toBeDefined();
  });

  test("profile totalCells counts all evaluated cells", () => {
    const model = createModelFromGrid({
      A1: "=SUM(1, 2)",
      A2: "hello",
      A3: "42",
    });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile = model.getters.getPerfProfile()!;
    expect(profile.totalCells).toBe(3);
  });

  test("re-profiling replaces the previous profile", () => {
    const model = createModelFromGrid({ A1: "=SUM(1, 2)" });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile1 = model.getters.getPerfProfile()!;
    expect(profile1).toBeDefined();

    setCellContent(model, "A2", "=ABS(-1)");
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile2 = model.getters.getPerfProfile()!;
    expect(profile2).toBeDefined();
    expect(profile2.totalFunctionCalls).toBeGreaterThan(profile1.totalFunctionCalls);
  });

  test("non-profiling evaluation does not clear the profile", () => {
    const model = createModelFromGrid({ A1: "=SUM(1, 2)" });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile = model.getters.getPerfProfile();
    expect(profile).toBeDefined();

    model.dispatch("EVALUATE_CELLS");
    expect(model.getters.getPerfProfile()).toBe(profile);
  });

  test("array formula spreading time is included in the function timing", () => {
    const model = createModelFromGrid({ A1: "=MUNIT(2)" });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile = model.getters.getPerfProfile();
    // MUNIT returns a 2x2 matrix. The post-processing (spreading) time
    // should be folded into MUNIT's entry, not shown as a separate entry.
    // 10ms for MUNIT compute + 10ms for post-processing (spreading the 2x2 matrix)
    expect(profile?.entries).toEqual([
      { functionName: "MUNIT", time: 20, range: expect.objectContaining({ zone: toZone("A1") }) },
    ]);
  });

  test("array formula spreading time is included in the function timing with nested functions", () => {
    const model = createModelFromGrid({ A1: "=MUNIT(SUM(A10))", A10: "=MAX(2,3)" });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile = model.getters.getPerfProfile();
    expect(profile?.entries).toEqual([
      { functionName: "MUNIT", time: 20, range: expect.objectContaining({ zone: toZone("A1") }) },
      { functionName: "MAX", time: 10, range: expect.objectContaining({ zone: toZone("A10") }) },
      { functionName: "SUM", time: 10, range: expect.objectContaining({ zone: toZone("A1") }) },
    ]);
  });

  test("spreading time of a range formula is not attributed to a different cell's function", () => {
    const model = createModelFromGrid({
      A1: "1",
      A2: "2",
      B1: "3",
      B2: "4",
      C1: "=SUM(1,2)",
      D1: "=A1:B2", // do not appear in the profile as a function call (limitation for now)
    });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile = model.getters.getPerfProfile();
    expect(profile?.entries).toEqual([
      { functionName: "SUM", time: 10, range: expect.objectContaining({ zone: toZone("C1") }) },
    ]);
  });

  test("nested function calls are counted separately", () => {
    const model = createModelFromGrid({ A1: "=SUM(ABS(1), ABS(2))" });
    model.dispatch("EVALUATE_CELLS", { profiling: true });
    const profile = model.getters.getPerfProfile()!;
    expect(profile.entries).toEqual([
      {
        functionName: "ABS",
        time: 20,
        range: expect.objectContaining({ zone: toZone("A1") }),
      },
      {
        functionName: "SUM",
        time: 10,
        range: expect.objectContaining({ zone: toZone("A1") }),
      },
    ]);
    expect(profile.totalFunctionCalls).toBe(3); // SUM + 2x ABS
  });
});
