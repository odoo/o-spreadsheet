import { LineChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart";
import { Model } from "../../src";
import { MockTransportService } from "../__mocks__/transport_service";
import {
  addColumns,
  addDataValidation,
  copy,
  createChart,
  createSheet,
  cut,
  deleteSheet,
  paste,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { getCellRawContent } from "../test_helpers/getters_helpers";
import { setupCollaborativeEnv } from "./collaborative_helpers";

describe("Collaborative range manipulation", () => {
  let network: MockTransportService;
  let alice: Model;
  let bob: Model;
  let charlie: Model;

  beforeEach(async () => {
    ({ network, alice, bob, charlie } = await setupCollaborativeEnv());
  });

  test("Copy - Paste of references are correctly updated", async () => {
    await setCellContent(bob, "A1", "=SUM(B1:C1)");
    await copy(bob, "A1");
    await network.concurrent(async () => {
      await paste(bob, "C1");
      await addColumns(alice, "after", "D", 1);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "C1"),
      "=SUM(D1:F1)"
    );
  });

  test("cut and paste a range in the same sheet", async () => {
    await setCellContent(alice, "A2", "=A1");
    await cut(alice, "A1");
    await paste(alice, "B1");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "A2"),
      "=B1"
    );
  });

  test("cut and paste a range in another sheet", async () => {
    await setCellContent(alice, "A2", "=A1");
    await cut(alice, "A1");
    await createSheet(alice, { activate: true });
    await paste(alice, "B1");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "A2", "Sheet1"),
      "=Sheet2!B1"
    );
  });

  test("cut and paste and delete origin sheet concurrently", async () => {
    await setCellContent(alice, "A2", "hello");
    await cut(alice, "A2");
    await createSheet(alice, { sheetId: "Sheet2", activate: true });
    await setCellContent(alice, "A1", "=Sheet1!A2");
    await network.concurrent(async () => {
      await deleteSheet(bob, "Sheet1");
      await paste(alice, "D4");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "D4", "Sheet2"),
      "hello"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "A1", "Sheet2"),
      "=#REF"
    );
  });

  test("cut and paste and delete target sheet concurrently (delete first)", async () => {
    await setCellContent(alice, "A2", "=A1");
    await cut(alice, "A1");
    await createSheet(alice, { sheetId: "Sheet2", activate: true });
    await network.concurrent(async () => {
      await deleteSheet(bob, "Sheet2");
      await paste(alice, "D4");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "A2", "Sheet1"),
      "=A1"
    );
  });

  test("cut and paste and delete target sheet concurrently (paste first)", async () => {
    await setCellContent(alice, "A2", "=A1");
    await cut(alice, "A1");
    await createSheet(alice, { sheetId: "Sheet2", activate: true });
    await network.concurrent(async () => {
      await paste(alice, "D4");
      await deleteSheet(bob, "Sheet2");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "A2", "Sheet1"),
      "=#REF"
    );
  });

  test("cut and paste zone adapts chart range", async () => {
    await createChart(
      alice,
      {
        dataSets: [{ dataRange: "A2" }],
        labelRange: "A1",
        dataSetsHaveTitle: false,
        type: "line",
      },
      "1"
    );
    await cut(alice, "A2");
    await paste(alice, "D4");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => (user.getters.getChartDefinition("1") as LineChartDefinition).dataSets[0].dataRange,
      "D4"
    );
  });

  test("Can copy boolean datavalidation while preserving the cell values", async () => {
    await setCellContent(alice, "A1", "TRUE");
    await setCellContent(alice, "A3", "not a boolean");
    await setCellContent(alice, "A4", "=TRANSPOSE(A1)");
    await setCellContent(alice, "A5", "=TEXT(5)");
    await setCellContent(alice, "A6", "=NOT(A1)");
    await setCellContent(alice, "A7", "7");
    await addDataValidation(alice, "A1:A7", "id", { type: "isBoolean", values: [] });

    await copy(alice, "A1:A7");
    await paste(alice, "B1");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "B1"),
      "TRUE"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "B2"),
      "FALSE" // A2 was empty, which is falsy
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "B3"),
      "FALSE" // text is not a boolean -> falsy
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "B4"),
      "=TRANSPOSE(B1)" // is truthy
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "B5"),
      "FALSE" // text is not a boolean -> falsy
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "B6"),
      "=NOT(B1)"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCellRawContent(user, "B7"),
      "FALSE" // a number which does not represent a boolean is falsy
    );
  });
});
