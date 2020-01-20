import { GridModel } from "../../src/model/index";
import { patchWaitFunction, nextTick } from "../helpers";

const patch = patchWaitFunction();

let n = 0;
function observeModel(model: GridModel) {
  n = 0;
  model.on("update", null, () => n++);
}

describe("evaluateCells", () => {
  test("Simple Evaluation", () => {
    const data = {
      sheets: [
        {
          colNumber: 3,
          rowNumber: 3,
          cells: {
            A1: { content: "1" },
            B1: { content: "2" },
            C1: { content: "=SUM(A1,B1)" }
          }
        }
      ]
    };
    const grid = new GridModel(data);
    expect(grid.state.cells["C1"].value).toEqual(3);
  });

  test("With empty content", () => {
    const data = {
      sheets: [
        {
          colNumber: 3,
          rowNumber: 3,
          cells: {
            A1: { content: "1" },
            B1: { content: "" },
            C1: { content: "=SUM(A1,B1)" }
          }
        }
      ]
    };
    const grid = new GridModel(data);
    expect(grid.state.cells["C1"].value).toEqual(1);
  });

  test("With empty cell", () => {
    const data = {
      sheets: [
        {
          colNumber: 3,
          rowNumber: 3,
          cells: {
            A1: { content: "1" },
            C1: { content: "=SUM(A1,B1)" }
          }
        }
      ]
    };
    const grid = new GridModel(data);
    expect(grid.state.cells["C1"].value).toEqual(1);
  });

  test("handling some errors", () => {
    const data = {
      sheets: [
        {
          colNumber: 3,
          rowNumber: 5,
          cells: {
            A1: { content: "=A1" },
            A2: { content: "=A1" },
            A3: { content: "=+" },
            A4: { content: "=1 + A3" }
          }
        }
      ]
    };
    const grid = new GridModel(data);
    expect(grid.state.cells["A1"].value).toEqual("#CYCLE");
    expect(grid.state.cells["A2"].value).toEqual("#ERROR");
    expect(grid.state.cells["A3"].value).toEqual("#BAD_EXPR");
    expect(grid.state.cells["A4"].value).toEqual("#ERROR");
  });

  test("async formula", async () => {
    const data = {
      sheets: [
        {
          colNumber: 3,
          rowNumber: 5,
          cells: {
            A1: { content: "=3" },
            A2: { content: "=WAIT(3)" },
            A3: { content: "=B2 + WAIT(1) + 1" }
          }
        }
      ]
    };
    const model = new GridModel(data);
    observeModel(model);
    expect(model.state.cells["A1"].async).toBeUndefined();
    expect(model.state.cells["A2"].async).toBe(true);
    expect(model.state.cells["A3"].async).toBe(true);
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(2);
    expect(n).toBe(0);
    patch.resolveAll();
    expect(n).toBe(0);
    await nextTick();
    expect(model.state.cells["A2"].value).toEqual(3);
    expect(model.state.cells["A3"].value).toEqual(2);
    expect(n).toBe(2);
  });

  test("async formula, on update", async () => {
    const data = {
      sheets: [
        {
          colNumber: 3,
          rowNumber: 5,
          cells: {
            A1: { content: "=3" }
          }
        }
      ]
    };
    const model = new GridModel(data);
    observeModel(model);
    model.setValue("A2", "=WAIT(33)");
    expect(model.state.cells["A2"].async).toBe(true);
    expect(n).toBe(1);
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(1);

    patch.resolveAll();
    expect(n).toBe(1);
    await nextTick();
    expect(model.state.cells["A2"].value).toEqual(33);
    expect(n).toBe(2);
  });

  test("async formula (async function inside async function)", async () => {
    const data = {
      sheets: [
        {
          colNumber: 3,
          rowNumber: 5,
          cells: {
            A2: { content: "=WAIT(WAIT(3))" }
          }
        }
      ]
    };
    const model = new GridModel(data);
    observeModel(model);
    expect(model.state.cells["A2"].async).toBe(true);
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(1);
    expect(n).toBe(0);
    // Inner wait is resolved
    patch.resolveAll();
    expect(n).toBe(0);
    await nextTick();
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(1);

    // outer wait is resolved
    patch.resolveAll();
    await nextTick();
    expect(n).toBe(1);

    expect(model.state.cells["A2"].value).toEqual(3);
  });

  test("async formula, and value depending on it", async () => {
    const data = {
      sheets: [
        {
          colNumber: 3,
          rowNumber: 5,
          cells: {
            A1: { content: "=WAIT(3)" },
            A2: { content: "=1 + A1" }
          }
        }
      ]
    };
    const model = new GridModel(data);
    observeModel(model);
    expect(model.state.cells["A2"].async).toBeUndefined();
    expect(model.state.cells["A1"].value).toEqual("#LOADING");
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(1);

    expect(n).toBe(0);
    patch.resolveAll();
    await nextTick();
    expect(n).toBe(1);
    expect(model.state.cells["A1"].value).toEqual(3);
    expect(model.state.cells["A2"].value).toEqual(4);
    expect(patch.calls.length).toBe(0);
  });

  test("async formula, and multiple values depending on it", async () => {
    const data = {
      sheets: [
        {
          colNumber: 3,
          rowNumber: 5,
          cells: {
            A1: { content: "=WAIT(3)" },
            A2: { content: "=WAIT(1)" },
            A3: { content: "=A1 + A2"}
          }
        }
      ]
    };
    const model = new GridModel(data);
    observeModel(model);
    expect(model.state.cells["A3"].async).toBeUndefined();
    expect(model.state.cells["A1"].value).toEqual("#LOADING");
    expect(model.state.cells["A2"].value).toEqual("#LOADING");
    expect(model.state.cells["A3"].value).toEqual("#LOADING");
    expect(patch.calls.length).toBe(2);
    expect(n).toBe(0);
    patch.resolveAll();
    await nextTick();
    expect(n).toBe(2);
    expect(model.state.cells["A1"].value).toEqual(3);
    expect(model.state.cells["A2"].value).toEqual(1);
    expect(model.state.cells["A3"].value).toEqual(4);
    expect(patch.calls.length).toBe(0);
  });

  test("async formula, another configuration", async () => {
    const data = {
      sheets: [
        {
          colNumber: 3,
          rowNumber: 5,
          cells: {
            A1: { content: "=1" },
            A2: { content: "=WAIT(A1 + 3)" },
            A3: { content: "=2 + Wait(3 + Wait(A2))" }
          }
        }
      ]
    };
    const model = new GridModel(data);
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
});
