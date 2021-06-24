import { LOADING } from "../../src/constants";
import { args, functionRegistry } from "../../src/functions";
import { FormulaCell } from "../../src/helpers/cells";
import { Model } from "../../src/model";
import { setCellContent } from "../test_helpers/commands_helpers";
import { getCell, getCellContent, getCellError } from "../test_helpers/getters_helpers";
import { initPatcher, target } from "../test_helpers/helpers";

let asyncComputations: () => Promise<void>;
let waitForRecompute: () => Promise<void>;
let patchCalls: any[];

beforeEach(() => {
  ({ asyncComputations, waitForRecompute, calls: patchCalls } = initPatcher());
});

describe("evaluateCells, async formulas", () => {
  test("async formula", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=3");
    setCellContent(model, "A2", "=WAIT(3)");
    setCellContent(model, "A3", "= WAIT(1) + 1");

    expect((getCell(model, "A1") as FormulaCell).compiledFormula.async).toBe(false);
    expect((getCell(model, "A2") as FormulaCell).compiledFormula.async).toBe(true);
    expect((getCell(model, "A3") as FormulaCell).compiledFormula.async).toBe(true);
    expect(getCell(model, "A2")!.evaluated.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(2);
    await waitForRecompute();
    expect(getCell(model, "A2")!.evaluated.value).toEqual(3);
    expect(getCell(model, "A3")!.evaluated.value).toEqual(2);
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

    expect((getCell(model, "B2") as FormulaCell).compiledFormula.async).toBe(true);
    expect(getCell(model, "B2")!.evaluated.value).toEqual(LOADING);
    let updates = 0;
    model.on("update", null, () => updates++);
    expect(updates).toBe(0);
    await waitForRecompute();
    expect(updates).toBe(1);
    expect(getCell(model, "B2")!.evaluated.value).toEqual(3);
  });

  test("async formula, on update", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=3");
    setCellContent(model, "A2", "=WAIT(33)");
    expect((getCell(model, "A2") as FormulaCell).compiledFormula.async).toBe(true);
    expect(getCell(model, "A2")!.evaluated.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(1);

    await waitForRecompute();
    expect(getCell(model, "A2")!.evaluated.value).toEqual(33);
  });

  test("async formula (async function inside async function)", async () => {
    const model = new Model();
    setCellContent(model, "A2", "=WAIT(WAIT(3))");
    expect((getCell(model, "A2") as FormulaCell).compiledFormula.async).toBe(true);
    expect(getCell(model, "A2")!.evaluated.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(1);
    // Inner wait is resolved
    await waitForRecompute();
    expect(getCell(model, "A2")!.evaluated.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(1);

    // outer wait is resolved
    await waitForRecompute();

    expect(getCell(model, "A2")!.evaluated.value).toEqual(3);
  });

  test("async formula, and value depending on it", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=WAIT(3)");
    setCellContent(model, "A2", "=1 + A1");
    expect((getCell(model, "A2") as FormulaCell).compiledFormula.async).toBe(false);
    expect(getCell(model, "A1")!.evaluated.value).toEqual(LOADING);
    expect(getCell(model, "A2")!.evaluated.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(1);

    await waitForRecompute();
    expect(getCell(model, "A1")!.evaluated.value).toEqual(3);
    expect(getCell(model, "A2")!.evaluated.value).toEqual(4);
    expect(patchCalls.length).toBe(0);
  });

  test("async formula, and multiple values depending on it", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=WAIT(3)");
    setCellContent(model, "A2", "=WAIT(1)");
    setCellContent(model, "A3", "=A1 + A2");

    expect((getCell(model, "A3") as FormulaCell).compiledFormula.async).toBe(false);
    expect(getCell(model, "A1")!.evaluated.value).toEqual(LOADING);
    expect(getCell(model, "A2")!.evaluated.value).toEqual(LOADING);
    expect(getCell(model, "A3")!.evaluated.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(2);
    await waitForRecompute();
    expect(getCell(model, "A1")!.evaluated.value).toEqual(3);
    expect(getCell(model, "A2")!.evaluated.value).toEqual(1);
    expect(getCell(model, "A3")!.evaluated.value).toEqual(4);
    expect(patchCalls.length).toBe(0);
  });

  test("async formula, another configuration", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=1");
    setCellContent(model, "A2", "=WAIT(A1 + 3)");
    setCellContent(model, "A3", "=2 + Wait(3 + Wait(A2))");

    expect(getCell(model, "A1")!.evaluated.value).toEqual(1);
    expect(getCell(model, "A2")!.evaluated.value).toEqual(LOADING);
    expect(getCell(model, "A3")!.evaluated.value).toEqual(LOADING);

    await waitForRecompute();
    expect(getCell(model, "A2")!.evaluated.value).toEqual(4);
    expect(getCell(model, "A3")!.evaluated.value).toEqual(LOADING);
    // We need two resolveAll, one for Wait(A2) and the second for (Wait(3 + 4))
    await waitForRecompute();
    await waitForRecompute();

    expect(getCell(model, "A2")!.evaluated.value).toEqual(4);
    expect(getCell(model, "A3")!.evaluated.value).toEqual(9);
  });

  test("async formula, multi levels", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=WAIT(1)");
    setCellContent(model, "A2", "=SUM(A1)");
    setCellContent(model, "A3", "=SUM(A2)");

    expect(getCell(model, "A1")!.evaluated.value).toEqual(LOADING);
    expect(getCell(model, "A2")!.evaluated.value).toEqual(LOADING);
    expect(getCell(model, "A3")!.evaluated.value).toEqual(LOADING);

    await waitForRecompute();

    expect(getCell(model, "A1")!.evaluated.value).toEqual(1);
    expect(getCell(model, "A2")!.evaluated.value).toEqual(1);
    expect(getCell(model, "A3")!.evaluated.value).toEqual(1);
  });

  test("async formula, with another cell in sync error", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=A1");
    setCellContent(model, "A2", "=WAIT(3)");
    let updateNbr = 0;
    model.on("update", null, () => updateNbr++);

    expect((getCell(model, "A2") as FormulaCell).compiledFormula.async).toBe(true);
    expect(getCell(model, "A1")!.evaluated.value).toEqual("#CYCLE");
    expect(getCell(model, "A2")!.evaluated.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(1);
    updateNbr = 0;
    await waitForRecompute();
    // next assertion checks that the interface has properly been
    // notified that the state did change
    expect(updateNbr).toBe(1);
    expect(getCell(model, "A2")!.evaluated.value).toEqual(3);
  });

  test("async formula and errors, scenario 1", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=WAIT(3)");
    setCellContent(model, "A2", "=A1 + 1/0");

    expect((getCell(model, "A2") as FormulaCell).compiledFormula.async).toBe(false);
    expect(getCell(model, "A2")!.evaluated.value).toEqual(LOADING);

    await waitForRecompute();

    expect(getCell(model, "A2")!.evaluated.value).toEqual("#ERROR");

    setCellContent(model, "A1", "=WAIT(4)");

    expect(getCell(model, "A2")!.evaluated.value).toEqual(LOADING);

    await waitForRecompute();

    expect(getCell(model, "A2")!.evaluated.value).toEqual("#ERROR");
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
    setCellContent(model, "A1", "=CRASHING()");
    setCellContent(model, "A2", "=SUM(A1)");
    await asyncComputations();
    expect(getCell(model, "A1")!.evaluated.value).toEqual("#ERROR");
    expect(getCell(model, "A2")!.evaluated.value).toEqual(LOADING);
    await asyncComputations();
    expect(getCell(model, "A1")!.evaluated.value).toEqual("#ERROR");
    expect(getCell(model, "A2")!.evaluated.value).toEqual("#ERROR");
  });

  test("async formulas in errors are re-evaluated", async () => {
    functionRegistry.add("ONLYPOSITIVE", {
      async: true,
      description: "This async formula crashes for negative numbers",
      args: args(`value (number)`),
      compute: (value: number) => {
        if (value < 0) {
          throw new Error("I only like positive numbers");
        }
        return value;
      },
      returns: ["ANY"],
    });
    const model = new Model();
    setCellContent(model, "A2", "-1");
    setCellContent(model, "A1", "=ONLYPOSITIVE(A2)");
    await asyncComputations();
    expect(getCell(model, "A1")!.evaluated.value).toEqual("#ERROR");
    setCellContent(model, "A2", "1");
    await asyncComputations();
    expect(getCell(model, "A1")!.evaluated.value).toEqual(1);
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
    setCellContent(model, "A1", `=REJECT("This is an error")`);
    setCellContent(model, "A2", `=REJECT()`);
    setCellContent(model, "A3", `=REJECT(4)`);
    await asyncComputations();
    expect(getCell(model, "A1")!.evaluated.value).toBe("#ERROR");
    expect(getCell(model, "A2")!.evaluated.value).toBe("#ERROR");
    expect(getCell(model, "A3")!.evaluated.value).toBe("#ERROR");
    expect(getCellError(model, "A1")).toBe("This is an error");
    expect(getCellError(model, "A2")).toBe("");
    expect(getCellError(model, "A3")).toBe("4");
  });

  test("change style while evaluating async formula", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=WAIT(300)");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: target("A1"),
      style: {
        strikethrough: true,
      },
    });
    await waitForRecompute();
    expect(getCellContent(model, "A1")).toBe("300");
  });

  test("set new cell content while its being evaluated", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=WAIT(300)");
    setCellContent(model, "A1", "Hi");
    expect(model.getters.isIdle()).toBe(false);
    await waitForRecompute();
    expect(model.getters.isIdle()).toBe(true);
    expect(getCellContent(model, "A1")).toBe("Hi");
  });
});
