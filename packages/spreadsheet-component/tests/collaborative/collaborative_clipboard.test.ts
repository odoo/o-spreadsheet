import { Model } from "../../src";
import { LineChartDefinition } from "../../src/types/chart";
import { MockTransportService } from "../__mocks__/transport_service";
import {
  addColumns,
  copy,
  createChart,
  createSheet,
  cut,
  deleteSheet,
  paste,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { getCell } from "../test_helpers/getters_helpers";
import { setupCollaborativeEnv } from "./collaborative_helpers";

describe("Collaborative range manipulation", () => {
  let network: MockTransportService;
  let alice: Model;
  let bob: Model;
  let charlie: Model;

  beforeEach(() => {
    ({ network, alice, bob, charlie } = setupCollaborativeEnv());
  });

  test("Copy - Paste of references are correctly updated", () => {
    setCellContent(bob, "A1", "=SUM(B1:C1)");
    copy(bob, "A1");
    network.concurrent(() => {
      paste(bob, "C1");
      addColumns(alice, "after", "D", 1);
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "C1")?.content,
      "=SUM(D1:F1)"
    );
  });

  test("cut and paste a range in the same sheet", () => {
    setCellContent(alice, "A2", "=A1");
    cut(alice, "A1");
    paste(alice, "B1");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "A2")?.content,
      "=B1"
    );
  });

  test("cut and paste a range in another sheet", () => {
    setCellContent(alice, "A2", "=A1");
    cut(alice, "A1");
    createSheet(alice, { activate: true });
    paste(alice, "B1");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "A2", "Sheet1")?.content,
      "=Sheet2!B1"
    );
  });

  test("cut and paste and delete origin sheet concurrently", () => {
    setCellContent(alice, "A2", "hello");
    cut(alice, "A2");
    createSheet(alice, { sheetId: "Sheet2", activate: true });
    setCellContent(alice, "A1", "=Sheet1!A2");
    network.concurrent(() => {
      deleteSheet(bob, "Sheet1");
      paste(alice, "D4");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "D4", "Sheet2")?.content,
      "hello"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "A1", "Sheet2")?.content,
      "=#REF"
    );
  });

  test("cut and paste and delete target sheet concurrently (delete first)", () => {
    setCellContent(alice, "A2", "=A1");
    cut(alice, "A1");
    createSheet(alice, { sheetId: "Sheet2", activate: true });
    network.concurrent(() => {
      deleteSheet(bob, "Sheet2");
      paste(alice, "D4");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "A2", "Sheet1")?.content,
      "=A1"
    );
  });

  test("cut and paste and delete target sheet concurrently (paste first)", () => {
    setCellContent(alice, "A2", "=A1");
    cut(alice, "A1");
    createSheet(alice, { sheetId: "Sheet2", activate: true });
    network.concurrent(() => {
      paste(alice, "D4");
      deleteSheet(bob, "Sheet2");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "A2", "Sheet1")?.content,
      "=#REF"
    );
  });

  test("cut and paste zone adapts chart range", () => {
    createChart(
      alice,
      {
        dataSets: [{ dataRange: "A2" }],
        labelRange: "A1",
        dataSetsHaveTitle: false,
        type: "line",
      },
      "1"
    );
    cut(alice, "A2");
    paste(alice, "D4");
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => (user.getters.getChartDefinition("1") as LineChartDefinition).dataSets[0].dataRange,
      "D4"
    );
  });
});
