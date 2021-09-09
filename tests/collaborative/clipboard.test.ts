import { Model } from "../../src";
import { toZone } from "../../src/helpers";
import {
  createChart,
  createSheet,
  deleteSheet,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { getCell } from "../test_helpers/getters_helpers";
import { target } from "../test_helpers/helpers";
import { MockTransportService } from "../__mocks__/transport_service";
import { setupCollaborativeEnv } from "./collaborative_helpers";

describe("Collaborative range manipulation", () => {
  let network: MockTransportService;
  let alice: Model;
  let bob: Model;
  let charlie: Model;

  beforeEach(() => {
    ({ network, alice, bob, charlie } = setupCollaborativeEnv());
  });

  test("cut and paste a range in the same sheet", () => {
    setCellContent(alice, "A2", "=A1");
    alice.dispatch("CUT", { target: target("A1") });
    alice.dispatch("PASTE", { target: target("B1") });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "A2")?.content,
      "=B1"
    );
  });

  test("cut and paste a range in another sheet", () => {
    setCellContent(alice, "A2", "=A1");
    alice.dispatch("CUT", { target: target("A1") });
    createSheet(alice, { activate: true });
    alice.dispatch("PASTE", { target: target("B1") });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "A2", "Sheet1")?.content,
      "=Sheet2!B1"
    );
  });

  test("cut and paste and delete origin sheet concurrently", () => {
    setCellContent(alice, "A2", "hello");
    alice.dispatch("CUT", { target: target("A2") });
    createSheet(alice, { sheetId: "Sheet2", activate: true });
    setCellContent(alice, "A1", "=Sheet1!A2");
    network.concurrent(() => {
      deleteSheet(bob, "Sheet1");
      alice.dispatch("PASTE", { target: target("D4") });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "D4", "Sheet2")?.content,
      "hello"
    );
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "A1", "Sheet2")?.content,
      "=Sheet1!A2"
    );
  });

  test("cut and paste and delete target sheet concurrently", () => {
    setCellContent(alice, "A2", "=A1");
    alice.dispatch("CUT", { target: target("A1") });
    createSheet(alice, { sheetId: "Sheet2", activate: true });
    network.concurrent(() => {
      deleteSheet(bob, "Sheet2");
      alice.dispatch("PASTE", { target: target("D4") });
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "A2", "Sheet1")?.content,
      "=A1"
    );
  });

  test("cut and paste and delete target sheet concurrently", () => {
    setCellContent(alice, "A2", "=A1");
    alice.dispatch("CUT", { target: target("A1") });
    createSheet(alice, { sheetId: "Sheet2", activate: true });
    network.concurrent(() => {
      alice.dispatch("PASTE", { target: target("D4") });
      deleteSheet(bob, "Sheet2");
    });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => getCell(user, "A2", "Sheet1")?.content,
      "=Sheet2!D4"
    );
  });

  test("cut and paste zone adapts chart range", () => {
    createChart(
      alice,
      {
        dataSets: ["A2"],
        labelRange: "A1",
        dataSetsHaveTitle: false,
        type: "line",
      },
      "1"
    );
    alice.dispatch("CUT", { target: target("A2") });
    alice.dispatch("PASTE", { target: target("D4") });
    expect([alice, bob, charlie]).toHaveSynchronizedValue(
      (user) => user.getters.getChartDefinition("1")?.dataSets[0].dataRange.zone,
      toZone("D4")
    );
  });
});
