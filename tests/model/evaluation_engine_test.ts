import { GridModel } from "../../src/model/index";
import { patchWaitFunction, nextTick } from "../helpers";
import { fromNumber } from "../../src/decimal";

const patch = patchWaitFunction();

describe("evaluateCells", () => {
  test("Simple Evaluation", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("B1", "2");
    model.setValue("C1", "=SUM(A1,B1)");
    expect(model.state.cells["C1"].value).toEqual(fromNumber(3));
  });

  test("With empty content", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("B1", "");
    model.setValue("C1", "=SUM(A1,B1)");
    expect(model.state.cells["C1"].value).toEqual(fromNumber(1));
  });

  test("With empty cell", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("C1", "=SUM(A1,B1)");
    expect(model.state.cells["C1"].value).toEqual(fromNumber(1));
  });

  test("handling some errors", () => {
    const model = new GridModel();
    model.setValue("A1", "=A1");
    model.setValue("A2", "=A1");
    model.setValue("A3", "=+");
    model.setValue("A4", "=1 + A3");
    expect(model.state.cells["A1"].value).toEqual("#CYCLE");
    expect(model.state.cells["A2"].value).toEqual("#ERROR");
    expect(model.state.cells["A3"].value).toEqual("#BAD_EXPR");
    expect(model.state.cells["A4"].value).toEqual("#ERROR");
  });

  test("error in an addition", () => {
    const model = new GridModel();
    model.setValue("A1", "1");
    model.setValue("A2", "2");
    model.setValue("A3", "=A1+A2");

    expect(model.state.cells.A3.value.toNumber()).toBe(3);
    model.setValue("A2", "asdf");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A1", "33");
    expect(model.state.cells.A3.value).toBe("#ERROR");
    model.setValue("A2", "10");
    expect(model.state.cells.A3.value.toNumber()).toBe(43);
  });

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
    expect(model.state.cells["A2"].value).toEqual(fromNumber(3));
    expect(model.state.cells["A3"].value).toEqual(fromNumber(2));
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
    expect(model.state.cells["A2"].value).toEqual(fromNumber(33));
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

    expect(model.state.cells["A2"].value).toEqual(fromNumber(3));
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
    expect(model.state.cells["A1"].value).toEqual(fromNumber(3));
    expect(model.state.cells["A2"].value).toEqual(fromNumber(4));
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
    expect(model.state.cells["A1"].value).toEqual(fromNumber(3));
    expect(model.state.cells["A2"].value).toEqual(fromNumber(1));
    expect(model.state.cells["A3"].value).toEqual(fromNumber(4));
    expect(patch.calls.length).toBe(0);
  });

  test("async formula, another configuration", async () => {
    const model = new GridModel();
    model.setValue("A1", "=1");
    model.setValue("A2", "=WAIT(A1 + 3)");
    model.setValue("A3", "=2 + Wait(3 + Wait(A2))");

    expect(model.state.cells["A1"].value).toEqual(fromNumber(1));
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(model.state.cells["A3"].value).toEqual("#LOADING");

    patch.resolveAll();
    await nextTick();
    expect(model.state.cells["A2"].value).toEqual(fromNumber(4));
    expect(model.state.cells["A3"].value).toEqual("#LOADING");
    // We need two resolveAll, one for Wait(A2) and the second for (Wait(3 + 4))
    patch.resolveAll();
    await nextTick();
    patch.resolveAll();
    await nextTick();

    expect(model.state.cells["A2"].value).toEqual(fromNumber(4));
    expect(model.state.cells["A3"].value).toEqual(fromNumber(9));
  });
});
