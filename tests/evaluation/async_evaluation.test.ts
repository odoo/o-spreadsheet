import { Model } from "@odoo/o-spreadsheet-engine/model";
import { MockTransportService } from "../__mocks__/transport_service";
import { addEqualCf, setCellContent, undo } from "../test_helpers/commands_helpers";
import { getEvaluatedCell, getStyle } from "../test_helpers/getters_helpers";
import { createModel } from "../test_helpers/helpers";

async function createAsyncModel(data: object = {}): Promise<Model> {
  const model = new Model(data, { asyncEvaluation: true });
  await model.startModel();
  await model.waitForEvaluation();
  return model;
}

/**
 * Build model data with enough cells to guarantee async evaluation
 * yields at least once (ASYNC_YIELD_INTERVAL = 500).
 */
function buildLargeSheetData(cellCount: number = 600): object {
  const cells: Record<string, { content: string }> = {};
  for (let i = 1; i <= cellCount; i++) {
    cells[`A${i}`] = { content: `=${i}` };
  }
  return { sheets: [{ id: "sh1", colNumber: 1, rowNumber: cellCount, cells }] };
}

describe("async evaluation", () => {
  describe("basic evaluation", () => {
    test("formula value is computed after waitForEvaluation", async () => {
      const model = await createAsyncModel();
      await setCellContent(model, "A1", "=1+1");
      await model.waitForEvaluation();
      expect(getEvaluatedCell(model, "A1").value).toBe(2);
    });

    test("cell referencing another cell evaluates correctly", async () => {
      const model = await createAsyncModel();
      await setCellContent(model, "A1", "42");
      await model.waitForEvaluation();
      await setCellContent(model, "B1", "=A1*2");
      await model.waitForEvaluation();
      expect(getEvaluatedCell(model, "B1").value).toBe(84);
    });

    test("waitForEvaluation resolves immediately when no async eval running", async () => {
      const model = await createAsyncModel();
      await expect(model.waitForEvaluation()).resolves.toBeUndefined();
    });
  });

  describe("progress events", () => {
    test("evaluation-progress event is triggered with 0 then 1", async () => {
      const model = await createAsyncModel();
      const progressValues: number[] = [];
      model.on("evaluation-progress", null, ({ progress }: { progress: number }) => {
        progressValues.push(progress);
      });

      await setCellContent(model, "A1", "=1+2");
      await model.waitForEvaluation();

      expect(progressValues[0]).toBe(0);
      expect(progressValues[progressValues.length - 1]).toBe(1);
    });

    test("progress values are between 0 and 1", async () => {
      const model = await createAsyncModel();
      const progressValues: number[] = [];
      model.on("evaluation-progress", null, ({ progress }: { progress: number }) => {
        progressValues.push(progress);
      });

      await setCellContent(model, "A1", "=42");
      await model.waitForEvaluation();

      for (const p of progressValues) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("cancellation", () => {
    test("two successive dispatches: only the last value is kept", async () => {
      const model = await createAsyncModel();
      setCellContent(model, "A1", "=1");
      setCellContent(model, "A1", "=99");
      await model.waitForEvaluation();
      expect(getEvaluatedCell(model, "A1").value).toBe(99);
    });

    test("state is not corrupted when a dispatch cancels the current evaluation", async () => {
      const model = await createAsyncModel();
      setCellContent(model, "A1", "10");
      setCellContent(model, "B1", "=A1*3");
      setCellContent(model, "A1", "5");
      await model.waitForEvaluation();
      expect(getEvaluatedCell(model, "A1").value).toBe(5);
      expect(getEvaluatedCell(model, "B1").value).toBe(15);
    });

    test("dispatching during evaluation produces correct final state", async () => {
      const model = await createAsyncModel();
      setCellContent(model, "A1", "first");
      const firstEval = model.waitForEvaluation();
      setCellContent(model, "A1", "second");
      await firstEval;
      await model.waitForEvaluation();
      expect(getEvaluatedCell(model, "A1").value).toBe("second");
    });
  });

  describe("dependent plugins (EVALUATION_COMPLETED)", () => {
    test("conditional format is applied after async evaluation", async () => {
      const model = await createAsyncModel();
      await addEqualCf(model, "A1", { bold: true }, "42");
      await model.waitForEvaluation();
      await setCellContent(model, "A1", "42");
      await model.waitForEvaluation();
      expect(getStyle(model, "A1").bold).toBe(true);
    });

    test("conditional format is not applied to non-matching cell", async () => {
      const model = await createAsyncModel();
      await addEqualCf(model, "A1", { bold: true }, "42");
      await model.waitForEvaluation();
      await setCellContent(model, "A1", "99");
      await model.waitForEvaluation();
      expect(getStyle(model, "A1").bold).toBeFalsy();
    });

    test("conditional format updates when cell value changes", async () => {
      const model = await createAsyncModel();
      await addEqualCf(model, "A1", { bold: true }, "1");
      await model.waitForEvaluation();

      await setCellContent(model, "A1", "1");
      await model.waitForEvaluation();
      expect(getStyle(model, "A1").bold).toBe(true);

      await setCellContent(model, "A1", "2");
      await model.waitForEvaluation();
      expect(getStyle(model, "A1").bold).toBeFalsy();
    });
  });

  describe("undo/redo", () => {
    test("undo restores previous evaluation", async () => {
      const model = await createAsyncModel();

      await setCellContent(model, "A1", "10");
      await model.waitForEvaluation();
      expect(getEvaluatedCell(model, "A1").value).toBe(10);

      await setCellContent(model, "A1", "20");
      await model.waitForEvaluation();
      expect(getEvaluatedCell(model, "A1").value).toBe(20);

      undo(model);
      await model.waitForEvaluation();
      expect(getEvaluatedCell(model, "A1").value).toBe(10);
    });
  });

  describe("initialization from data", () => {
    test("cells set before start are evaluated after waitForEvaluation", async () => {
      // Create a sync model, set cells, then export and reload as async
      const syncModel = await createModel();
      await setCellContent(syncModel, "A1", "5");
      await setCellContent(syncModel, "B1", "=A1*2");
      const data = syncModel.exportData();

      const model = new Model(data, { asyncEvaluation: true });
      await model.startModel();
      await model.waitForEvaluation();

      expect(getEvaluatedCell(model, "B1").value).toBe(10);
    });
  });

  describe("mid-evaluation cancellation", () => {
    test("dispatch during a yielded async evaluation produces correct state", async () => {
      // Use enough cells to force at least one yield point
      const data = buildLargeSheetData(600);
      const model = await createAsyncModel(data);

      // Start an evaluation that will yield
      setCellContent(model, "A1", "=999");
      // Allow at least one yield to happen
      await new Promise<void>((r) => setTimeout(r, 0));
      // Dispatch while the first evaluation is in-flight
      setCellContent(model, "A1", "=42");
      await model.waitForEvaluation();

      expect(getEvaluatedCell(model, "A1").value).toBe(42);
    });

    test("cancelled evaluation does not corrupt live state", async () => {
      const data = buildLargeSheetData(600);
      const model = await createAsyncModel(data);

      // Trigger a large evaluation
      setCellContent(model, "A1", "=100");
      // Let it start and yield
      await new Promise<void>((r) => setTimeout(r, 0));
      // Cancel by dispatching again
      setCellContent(model, "A1", "=200");
      setCellContent(model, "A2", "=A1+1");
      await model.waitForEvaluation();

      expect(getEvaluatedCell(model, "A1").value).toBe(200);
      expect(getEvaluatedCell(model, "A2").value).toBe(201);
    });
  });

  describe("remote revision with async evaluation", () => {
    test("remote revision during async evaluation produces correct state", async () => {
      const network = new MockTransportService();
      const aliceModel = new Model(
        {},
        { asyncEvaluation: true, transportService: network, client: { id: "alice", name: "Alice" } }
      );
      await aliceModel.startModel();
      await aliceModel.waitForEvaluation();
      const bobModel = new Model(aliceModel.exportData(), {
        transportService: network,
        client: { id: "bob", name: "Bob" },
      });
      await bobModel.startModel();

      // Alice sets a cell, triggering async evaluation
      setCellContent(aliceModel, "A1", "=10");
      await aliceModel.waitForEvaluation();

      expect(getEvaluatedCell(aliceModel, "A1").value).toBe(10);
    });
  });

  describe("sync mode (default)", () => {
    test("evaluation is synchronous and waitForEvaluation resolves immediately", async () => {
      const model = await createModel();
      await setCellContent(model, "A1", "=1+1");
      // In sync mode, evaluation is already done synchronously
      await model.waitForEvaluation();
      expect(getEvaluatedCell(model, "A1").value).toBe(2);
    });
  });
});
