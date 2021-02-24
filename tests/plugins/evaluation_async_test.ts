import { args, functionRegistry } from "../../src/functions";
import { Model } from "../../src/model";
import { LOADING } from "../../src/plugins/evaluation";
import { asyncComputations, patch, waitForRecompute } from "../helpers";

describe("evaluateCells, async formulas", () => {
  test("async formula", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=3" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=WAIT(3)" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "= WAIT(1) + 1" });

    expect(model["workbook"].activeSheet.cells["A1"].async).toBe(false);
    expect(model["workbook"].activeSheet.cells["A2"].async).toBe(true);
    expect(model["workbook"].activeSheet.cells["A3"].async).toBe(true);
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(LOADING);
    expect(patch.calls.length).toBe(2);
    await waitForRecompute();
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(3);
    expect(model["workbook"].activeSheet.cells["A3"].value).toEqual(2);
  });

  test("async formulas in base data", async () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "=WAIT(3)" } },
        },
      ],
    });

    expect(model["workbook"].activeSheet.cells["B2"].async).toBe(true);
    expect(model["workbook"].activeSheet.cells["B2"].value).toEqual(LOADING);
    let updates = 0;
    model.on("update", null, () => updates++);
    expect(updates).toBe(0);
    await waitForRecompute();
    expect(updates).toBe(1);
    expect(model["workbook"].activeSheet.cells["B2"].value).toEqual(3);
  });

  test("async formula, on update", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=3" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=WAIT(33)" });
    expect(model["workbook"].activeSheet.cells["A2"].async).toBe(true);
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(LOADING);
    expect(patch.calls.length).toBe(1);

    await waitForRecompute();
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(33);
  });

  test("async formula (async function inside async function)", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A2", text: "=WAIT(WAIT(3))" });
    expect(model["workbook"].activeSheet.cells["A2"].async).toBe(true);
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(LOADING);
    expect(patch.calls.length).toBe(1);
    // Inner wait is resolved
    await waitForRecompute();
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(LOADING);
    expect(patch.calls.length).toBe(1);

    // outer wait is resolved
    await waitForRecompute();

    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(3);
  });

  test("async formula, and value depending on it", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=WAIT(3)" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=1 + A1" });
    expect(model["workbook"].activeSheet.cells["A2"].async).toBe(false);
    expect(model["workbook"].activeSheet.cells["A1"].value).toEqual(LOADING);
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(LOADING);
    expect(patch.calls.length).toBe(1);

    await waitForRecompute();
    expect(model["workbook"].activeSheet.cells["A1"].value).toEqual(3);
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(4);
    expect(patch.calls.length).toBe(0);
  });

  test("async formula, and multiple values depending on it", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=WAIT(3)" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=WAIT(1)" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "=A1 + A2" });

    expect(model["workbook"].activeSheet.cells["A3"].async).toBe(false);
    expect(model["workbook"].activeSheet.cells["A1"].value).toEqual(LOADING);
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(LOADING);
    expect(model["workbook"].activeSheet.cells["A3"].value).toEqual(LOADING);
    expect(patch.calls.length).toBe(2);
    await waitForRecompute();
    expect(model["workbook"].activeSheet.cells["A1"].value).toEqual(3);
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(1);
    expect(model["workbook"].activeSheet.cells["A3"].value).toEqual(4);
    expect(patch.calls.length).toBe(0);
  });

  test("async formula, another configuration", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=WAIT(A1 + 3)" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "=2 + Wait(3 + Wait(A2))" });

    expect(model["workbook"].activeSheet.cells["A1"].value).toEqual(1);
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(LOADING);
    expect(model["workbook"].activeSheet.cells["A3"].value).toEqual(LOADING);

    await waitForRecompute();
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(4);
    expect(model["workbook"].activeSheet.cells["A3"].value).toEqual(LOADING);
    // We need two resolveAll, one for Wait(A2) and the second for (Wait(3 + 4))
    await waitForRecompute();
    await waitForRecompute();

    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(4);
    expect(model["workbook"].activeSheet.cells["A3"].value).toEqual(9);
  });

  test("async formula, multi levels", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=WAIT(1)" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=SUM(A1)" });
    model.dispatch("SET_VALUE", { xc: "A3", text: "=SUM(A2)" });

    expect(model["workbook"].activeSheet.cells["A1"].value).toEqual(LOADING);
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(LOADING);
    expect(model["workbook"].activeSheet.cells["A3"].value).toEqual(LOADING);

    await waitForRecompute();

    expect(model["workbook"].activeSheet.cells["A1"].value).toEqual(1);
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(1);
    expect(model["workbook"].activeSheet.cells["A3"].value).toEqual(1);
  });

  test("async formula, with another cell in sync error", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=A1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=WAIT(3)" });
    let updateNbr = 0;
    model.on("update", null, () => updateNbr++);

    expect(model["workbook"].activeSheet.cells["A2"].async).toBe(true);
    expect(model["workbook"].activeSheet.cells["A1"].value).toEqual("#CYCLE");
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(LOADING);
    expect(patch.calls.length).toBe(1);
    updateNbr = 0;
    await waitForRecompute();
    // next assertion checks that the interface has properly been
    // notified that the state did change
    expect(updateNbr).toBe(1);
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(3);
  });

  test("async formula and errors, scenario 1", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=WAIT(3)" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=A1 + 1/0" });

    expect(model["workbook"].activeSheet.cells["A2"].async).toBe(false);
    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(LOADING);

    await waitForRecompute();

    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual("#ERROR");

    model.dispatch("SET_VALUE", { xc: "A1", text: "=WAIT(4)" });

    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual(LOADING);

    await waitForRecompute();

    expect(model["workbook"].activeSheet.cells["A2"].value).toEqual("#ERROR");
  });

  test("sync formula depending on error async cell", async () => {
    functionRegistry.add("CRASHING", {
      async: true,
      description: "This async formula crashes",
      args: args(``),
      compute: () => {
        throw new Error("I crashed");
      },
      returns: ["ANY"],
    });
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=CRASHING()" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=SUM(A1)" });
    await asyncComputations();
    expect(model.getters.getCell(0, 0)!.value).toEqual("#ERROR");
    expect(model.getters.getCell(0, 1)!.value).toEqual(LOADING);
    await asyncComputations();
    expect(model.getters.getCell(0, 0)!.value).toEqual("#ERROR");
    expect(model.getters.getCell(0, 1)!.value).toEqual("#ERROR");
  });

  test("async formulas in errors are re-evaluated", async () => {
    functionRegistry.add("ONLYPOSITIVE", {
      async: true,
      description: "This async formula crashes for negative numbers",
      args: args(`value (number)`),
      compute: (value) => {
        if (value < 0) {
          throw new Error("I only like positive numbers");
        }
        return value;
      },
      returns: ["ANY"],
    });
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A2", text: "-1" });
    model.dispatch("SET_VALUE", { xc: "A1", text: "=ONLYPOSITIVE(A2)" });
    await asyncComputations();
    expect(model.getters.getCell(0, 0)!.value).toEqual("#ERROR");
    model.dispatch("SET_VALUE", { xc: "A2", text: "1" });
    await asyncComputations();
    expect(model.getters.getCell(0, 0)!.value).toEqual(1);
  });

  test("async formulas rejected with a reason", async () => {
    functionRegistry.add("REJECT", {
      async: true,
      description: "This async formula is rejected",
      args: args(`value (any, optional)`),
      compute: (value: string | undefined) => {
        return new Promise((resolve, reject) => reject(value || undefined));
      },
      returns: ["ANY"],
    });
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: `=REJECT("This is an error")` });
    model.dispatch("SET_VALUE", { xc: "A2", text: `=REJECT()` });
    model.dispatch("SET_VALUE", { xc: "A3", text: `=REJECT(4)` });
    await asyncComputations();
    expect(model.getters.getCell(0, 0)!.value).toBe("#ERROR");
    expect(model.getters.getCell(0, 1)!.value).toBe("#ERROR");
    expect(model.getters.getCell(0, 2)!.value).toBe("#ERROR");
    expect(model.getters.getCell(0, 0)!.error).toBe("This is an error");
    expect(model.getters.getCell(0, 1)!.error).toBe("");
    expect(model.getters.getCell(0, 2)!.error).toBe("4");
  });
});
