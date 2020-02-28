import { CURRENT_VERSION, GridModel } from "../../src/model/index";
import { nextTick, patchWaitFunction } from "../helpers";

const patch = patchWaitFunction();

let timeHandlers: Function[] = [];
GridModel.setTimeout = cb => {
  timeHandlers.push(cb);
};

function clearTimers() {
  let handlers = timeHandlers.slice();
  timeHandlers = [];
  for (let cb of handlers) {
    cb();
  }
}

async function waitForRecompute() {
  patch.resolveAll();
  await nextTick();
  clearTimers();
}

describe("evaluateCells, async formulas", () => {
  test("async formula", async () => {
    const model = new GridModel();
    model.setValue("A1", "=3");
    model.setValue("A2", "=WAIT(3)");
    model.setValue("A3", "= WAIT(1) + 1");

    expect(model.state.cells["A1"].async).toBeUndefined();
    expect(model.state.cells["A2"].async).toBe(true);
    expect(model.state.cells["A3"].async).toBe(true);
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(2);
    await waitForRecompute();
    expect(model.state.cells["A2"].value).toEqual(3);
    expect(model.state.cells["A3"].value).toEqual(2);
  });

  test("async formulas in base data", async () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "=WAIT(3)" } }
        }
      ]
    });

    expect(model.state.cells["B2"].async).toBe(true);
    expect(model.state.cells["B2"].value).toEqual("#LOADING");
    let updates = 0;
    model.on("update", null, () => updates++);
    expect(updates).toBe(0);
    await waitForRecompute();
    expect(updates).toBe(1);
    expect(model.state.cells["B2"].value).toEqual(3);
  });

  test("async formula, on update", async () => {
    const model = new GridModel();
    model.setValue("A1", "=3");
    model.setValue("A2", "=WAIT(33)");
    expect(model.state.cells["A2"].async).toBe(true);
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(1);

    await waitForRecompute();
    expect(model.state.cells["A2"].value).toEqual(33);
  });

  test("async formula (async function inside async function)", async () => {
    const model = new GridModel();
    model.setValue("A2", "=WAIT(WAIT(3))");
    expect(model.state.cells["A2"].async).toBe(true);
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(1);
    // Inner wait is resolved
    await waitForRecompute();
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(1);

    // outer wait is resolved
    await waitForRecompute();

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

    await waitForRecompute();
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
    await waitForRecompute();
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

    await waitForRecompute();
    expect(model.state.cells["A2"].value).toEqual(4);
    expect(model.state.cells["A3"].value).toEqual("#LOADING");
    // We need two resolveAll, one for Wait(A2) and the second for (Wait(3 + 4))
    await waitForRecompute();
    await waitForRecompute();

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

    await waitForRecompute();

    expect(model.state.cells["A1"].value).toEqual(1);
    expect(model.state.cells["A2"].value).toEqual(1);
    expect(model.state.cells["A3"].value).toEqual(1);
  });

  test("async formula, with another cell in sync error", async () => {
    const model = new GridModel();
    model.setValue("A1", "=A1");
    model.setValue("A2", "=WAIT(3)");
    let updateNbr = 0;
    model.on("update", null, () => updateNbr++);

    expect(model.state.cells["A2"].async).toBe(true);
    expect(model.state.cells["A1"].value).toEqual("#CYCLE");
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(1);
    updateNbr = 0;
    await waitForRecompute();
    // next assertion checks that the interface has properly been
    // notified that the state did change
    expect(updateNbr).toBe(1);
    expect(model.state.cells["A2"].value).toEqual(3);
  });

  test("async formula and errors, scenario 1", async () => {
    const model = new GridModel();
    model.setValue("A1", "=WAIT(3)");
    model.setValue("A2", "=A1 + 1/0");

    expect(model.state.cells["A2"].async).toBe(undefined);
    expect(model.state.cells["A2"].value).toEqual("#LOADING");

    await waitForRecompute();

    expect(model.state.cells["A2"].value).toEqual("#ERROR");

    model.setValue("A1", "=WAIT(4)");

    expect(model.state.cells["A2"].value).toEqual("#LOADING");

    await waitForRecompute();

    expect(model.state.cells["A2"].value).toEqual("#ERROR");
  });
});
