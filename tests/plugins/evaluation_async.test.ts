import {args, functionRegistry} from "../../src/functions";
import {Model} from "../../src/model";
import {LOADING} from "../../src/plugins/ui/evaluation";
import {FormulaCell} from "../../src/types";
import {setCellContent} from "../test_helpers/commands_helpers";
import {getCell, getCellContent} from "../test_helpers/getters_helpers";
import {initPatcher, target} from "../test_helpers/helpers";
import {StateUpdateMessage} from "../../src/types/collaborative/transport_service";
import * as owl from "@odoo/owl";

let asyncComputations: () => Promise<void>;
let waitForRecompute: () => Promise<void>;
let patchCalls: any[];

beforeEach(() => {
  ({asyncComputations, waitForRecompute, calls: patchCalls} = initPatcher());
});

describe("evaluateCells, async formulas", () => {
  test("async formula", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=3");
    setCellContent(model, "A2", "=WAIT(3)");
    setCellContent(model, "A3", "= WAIT(1) + 1");

    expect((getCell(model, "A1") as FormulaCell).formula!.compiledFormula.async).toBe(false);
    expect((getCell(model, "A2") as FormulaCell).formula!.compiledFormula.async).toBe(true);
    expect((getCell(model, "A3") as FormulaCell).formula!.compiledFormula.async).toBe(true);
    expect(getCell(model, "A2")!.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(2);
    await waitForRecompute();
    expect(getCell(model, "A2")!.value).toEqual(3);
    expect(getCell(model, "A3")!.value).toEqual(2);
  });

  test("async formulas in base data", async () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: {B2: {content: "=WAIT(3)"}},
        },
      ],
    });

    expect((getCell(model, "B2") as FormulaCell).formula!.compiledFormula.async).toBe(true);
    expect(getCell(model, "B2")!.value).toEqual(LOADING);
    let updates = 0;
    model.on("update", null, () => updates++);
    expect(updates).toBe(0);
    await waitForRecompute();
    expect(updates).toBe(1);
    expect(getCell(model, "B2")!.value).toEqual(3);
  });

  test("async formula, on update", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=3");
    setCellContent(model, "A2", "=WAIT(33)");
    expect((getCell(model, "A2") as FormulaCell).formula!.compiledFormula.async).toBe(true);
    expect(getCell(model, "A2")!.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(1);

    await waitForRecompute();
    expect(getCell(model, "A2")!.value).toEqual(33);
  });

  test("async formula (async function inside async function)", async () => {
    const model = new Model();
    setCellContent(model, "A2", "=WAIT(WAIT(3))");
    expect((getCell(model, "A2") as FormulaCell).formula!.compiledFormula.async).toBe(true);
    expect(getCell(model, "A2")!.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(1);
    // Inner wait is resolved
    await waitForRecompute();
    expect(getCell(model, "A2")!.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(1);

    // outer wait is resolved
    await waitForRecompute();

    expect(getCell(model, "A2")!.value).toEqual(3);
  });

  test("async formula, and value depending on it", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=WAIT(3)");
    setCellContent(model, "A2", "=1 + A1");
    expect((getCell(model, "A2") as FormulaCell).formula!.compiledFormula.async).toBe(false);
    expect(getCell(model, "A1")!.value).toEqual(LOADING);
    expect(getCell(model, "A2")!.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(1);

    await waitForRecompute();
    expect(getCell(model, "A1")!.value).toEqual(3);
    expect(getCell(model, "A2")!.value).toEqual(4);
    expect(patchCalls.length).toBe(0);
  });

  test("async formula, and multiple values depending on it", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=WAIT(3)");
    setCellContent(model, "A2", "=WAIT(1)");
    setCellContent(model, "A3", "=A1 + A2");

    expect((getCell(model, "A3") as FormulaCell).formula!.compiledFormula.async).toBe(false);
    expect(getCell(model, "A1")!.value).toEqual(LOADING);
    expect(getCell(model, "A2")!.value).toEqual(LOADING);
    expect(getCell(model, "A3")!.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(2);
    await waitForRecompute();
    expect(getCell(model, "A1")!.value).toEqual(3);
    expect(getCell(model, "A2")!.value).toEqual(1);
    expect(getCell(model, "A3")!.value).toEqual(4);
    expect(patchCalls.length).toBe(0);
  });

  test("async formula, another configuration", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=1");
    setCellContent(model, "A2", "=WAIT(A1 + 3)");
    setCellContent(model, "A3", "=2 + Wait(3 + Wait(A2))");

    expect(getCell(model, "A1")!.value).toEqual(1);
    expect(getCell(model, "A2")!.value).toEqual(LOADING);
    expect(getCell(model, "A3")!.value).toEqual(LOADING);

    await waitForRecompute();
    expect(getCell(model, "A2")!.value).toEqual(4);
    expect(getCell(model, "A3")!.value).toEqual(LOADING);
    // We need two resolveAll, one for Wait(A2) and the second for (Wait(3 + 4))
    await waitForRecompute();
    await waitForRecompute();

    expect(getCell(model, "A2")!.value).toEqual(4);
    expect(getCell(model, "A3")!.value).toEqual(9);
  });

  test("async formula, multi levels", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=WAIT(1)");
    setCellContent(model, "A2", "=SUM(A1)");
    setCellContent(model, "A3", "=SUM(A2)");

    expect(getCell(model, "A1")!.value).toEqual(LOADING);
    expect(getCell(model, "A2")!.value).toEqual(LOADING);
    expect(getCell(model, "A3")!.value).toEqual(LOADING);

    await waitForRecompute();

    expect(getCell(model, "A1")!.value).toEqual(1);
    expect(getCell(model, "A2")!.value).toEqual(1);
    expect(getCell(model, "A3")!.value).toEqual(1);
  });

  test("async formula, with another cell in sync error", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=A1");
    setCellContent(model, "A2", "=WAIT(3)");
    let updateNbr = 0;
    model.on("update", null, () => updateNbr++);

    expect((getCell(model, "A2") as FormulaCell).formula!.compiledFormula.async).toBe(true);
    expect(getCell(model, "A1")!.value).toEqual("#CYCLE");
    expect(getCell(model, "A2")!.value).toEqual(LOADING);
    expect(patchCalls.length).toBe(1);
    updateNbr = 0;
    await waitForRecompute();
    // next assertion checks that the interface has properly been
    // notified that the state did change
    expect(updateNbr).toBe(1);
    expect(getCell(model, "A2")!.value).toEqual(3);
  });

  test("async formula and errors, scenario 1", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=WAIT(3)");
    setCellContent(model, "A2", "=A1 + 1/0");

    expect((getCell(model, "A2") as FormulaCell).formula!.compiledFormula.async).toBe(false);
    expect(getCell(model, "A2")!.value).toEqual(LOADING);

    await waitForRecompute();

    expect(getCell(model, "A2")!.value).toEqual("#ERROR");

    setCellContent(model, "A1", "=WAIT(4)");

    expect(getCell(model, "A2")!.value).toEqual(LOADING);

    await waitForRecompute();

    expect(getCell(model, "A2")!.value).toEqual("#ERROR");
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
    expect(getCell(model, "A1")!.value).toEqual("#ERROR");
    expect(getCell(model, "A2")!.value).toEqual(LOADING);
    await asyncComputations();
    expect(getCell(model, "A1")!.value).toEqual("#ERROR");
    expect(getCell(model, "A2")!.value).toEqual("#ERROR");
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
    setCellContent(model, "A2", "-1");
    setCellContent(model, "A1", "=ONLYPOSITIVE(A2)");
    await asyncComputations();
    expect(getCell(model, "A1")!.value).toEqual("#ERROR");
    setCellContent(model, "A2", "1");
    await asyncComputations();
    expect(getCell(model, "A1")!.value).toEqual(1);
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
    expect(getCell(model, "A1")!.value).toBe("#ERROR");
    expect(getCell(model, "A2")!.value).toBe("#ERROR");
    expect(getCell(model, "A3")!.value).toBe("#ERROR");
    expect(getCell(model, "A1")!.error).toBe("This is an error");
    expect(getCell(model, "A2")!.error).toBe("");
    expect(getCell(model, "A3")!.error).toBe("4");
  });

  test("change style while evaluating async formula", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=WAIT(300)");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: target("A1"),
      style: {
        strikethrough: true,
      }
    })
    await waitForRecompute();
    expect(getCellContent(model, "A1")).toBe("300");
  });

  test("loading a save with extra commands moving cells that depends on async failed", async () => {
    const data = {
      version: 7,
      sheets: [
        {
          name: "Sheet1",
          colNumber: 26,
          rowNumber: 120,
          cols: {1: {}, 3: {}},
          rows: {},
          cells: {
            A1: {content: "=wait(10)"},
            C12: {content: "=A1+A1"},
          },
          conditionalFormats: [
            {
              id: "1",
              ranges: ["C12:C12"],
              rule: {
                values: ["10"],
                operator: "Equal",
                type: "CellIsRule",
                style: {fillColor: "#FFA500"},
              },
            },
          ],
        },
      ],
    };

    const stateUpdateMessages: StateUpdateMessage[] = [{
      "type": "REMOTE_REVISION",
      "version": 1,
      "serverRevisionId": "START_REVISION",
      "nextRevisionId": "d8135fad-3f59-47fb-a529-775031e8efc3",
      "clientId": "784b2823-440c-4f54-affb-7c3ea542b70b",
      "commands": [{"type": "CLEAR_CELL", "col": 2, "row": 11, "sheetId": "Sheet1"}, {
        "type": "CLEAR_FORMATTING",
        "sheetId": "Sheet1",
        "target": [{"left": 2, "right": 2, "top": 11, "bottom": 11}]
      }, {
        "type": "UPDATE_CELL",
        "col": 10,
        "row": 12,
        "sheetId": "Sheet1",
        "content": "=A1+A1",
        "style": null
      }, {
        "type": "ADD_CONDITIONAL_FORMAT",
        "cf": {
          "id": "1",
          "rule": {"values": ["42"], "operator": "Equal", "type": "CellIsRule", "style": {"fillColor": "#FFA500"}}
        },
        "target": [{"top": 0, "bottom": 10, "left": 2, "right": 2}, {
          "top": 12,
          "bottom": 99,
          "left": 2,
          "right": 2
        }, {"top": 12, "bottom": 12, "left": 10, "right": 10}],
        "sheetId": "Sheet1"
      }]
    }];

    jest.useFakeTimers();
    jest.spyOn(owl.browser, "setTimeout").mockImplementation(window.setTimeout.bind(window));
    jest.spyOn(owl.browser, "clearTimeout").mockImplementation(window.clearTimeout.bind(window));

    const model = new Model(data, {}, stateUpdateMessages);

    jest.advanceTimersByTime(100);

    expect(getCellContent(model, "K13")).toBe(20);
  })
});



