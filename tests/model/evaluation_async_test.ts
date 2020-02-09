import { GridModel } from "../../src/model/index";
import { patchWaitFunction, nextTick } from "../helpers";

const patch = patchWaitFunction();

describe("evaluateCells, async formulas", () => {
  test("async formula", async () => {
    const model = new GridModel();
    model.setValue("A1", "=3");
    model.setValue("A2", "=WAIT(3)");
    model.setValue("A3", "=B2 + WAIT(1) + 1");

    expect(model.state.cells["A1"].async).toBeUndefined();
    expect(model.state.cells["A2"].async).toBe(true);
    expect(model.state.cells["A3"].async).toBe(true);
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(2);
    patch.resolveAll();
    await nextTick();
    expect(model.state.cells["A2"].value).toEqual(3);
    expect(model.state.cells["A3"].value).toEqual(2);
  });

  test("async formula, on update", async () => {
    const model = new GridModel();
    model.setValue("A1", "=3");
    model.setValue("A2", "=WAIT(33)");
    expect(model.state.cells["A2"].async).toBe(true);
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(1);

    patch.resolveAll();
    await nextTick();
    expect(model.state.cells["A2"].value).toEqual(33);
  });

  test("async formula (async function inside async function)", async () => {
    const model = new GridModel();
    model.setValue("A2", "=WAIT(WAIT(3))");
    expect(model.state.cells["A2"].async).toBe(true);
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(1);
    // Inner wait is resolved
    patch.resolveAll();
    await nextTick();
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(1);

    // outer wait is resolved
    patch.resolveAll();
    await nextTick();

    expect(model.state.cells["A2"].value).toEqual(3);
  });

  test("async formula, and value depending on it", async () => {
    const model = new GridModel();
    model.setValue("A1", "=WAIT(3)");
    model.setValue("A2", "=1 + A1");
    expect(model.state.cells["A2"].async).toBeUndefined();
    expect(model.state.cells["A1"].value).toEqual("#LOADING");
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(1);

    patch.resolveAll();
    await nextTick();
    expect(model.state.cells["A1"].value).toEqual(3);
    expect(model.state.cells["A2"].value).toEqual(4);
    expect(patch.calls.length).toBe(0);
  });

  test("async formula, and multiple values depending on it", async () => {
    const model = new GridModel();
    model.setValue("A1", "=WAIT(3)");
    model.setValue("A2", "=WAIT(1)");
    model.setValue("A3", "=A1 + A2");

    expect(model.state.cells["A3"].async).toBeUndefined();
    expect(model.state.cells["A1"].value).toEqual("#LOADING");
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(model.state.cells["A3"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(2);
    patch.resolveAll();
    await nextTick();
    expect(model.state.cells["A1"].value).toEqual(3);
    expect(model.state.cells["A2"].value).toEqual(1);
    expect(model.state.cells["A3"].value).toEqual(4);
    expect(patch.calls.length).toBe(0);
  });

  test("async formula, another configuration", async () => {
    const model = new GridModel();
    model.setValue("A1", "=1");
    model.setValue("A2", "=WAIT(A1 + 3)");
    model.setValue("A3", "=2 + Wait(3 + Wait(A2))");

    expect(model.state.cells["A1"].value).toEqual(1);
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(model.state.cells["A3"].value).toEqual("#LOADING");

    patch.resolveAll();
    await nextTick();
    expect(model.state.cells["A2"].value).toEqual(4);
    expect(model.state.cells["A3"].value).toEqual("#LOADING");
    // We need two resolveAll, one for Wait(A2) and the second for (Wait(3 + 4))
    patch.resolveAll();
    await nextTick();
    patch.resolveAll();
    await nextTick();

    expect(model.state.cells["A2"].value).toEqual(4);
    expect(model.state.cells["A3"].value).toEqual(9);
  });

  test("async formula, multi levels", async () => {
    const model = new GridModel();
    model.setValue("A1", "=WAIT(1)");
    model.setValue("A2", "=SUM(A1)");
    model.setValue("A3", "=SUM(A2)");

    expect(model.state.cells["A1"].value).toEqual("#LOADING");
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(model.state.cells["A3"].value).toEqual("#LOADING");

    patch.resolveAll();
    await nextTick();
    expect(model.state.cells["A1"].value).toEqual(1);
    expect(model.state.cells["A2"].value).toEqual(1);
    expect(model.state.cells["A3"].value).toEqual(1);
  });
});
