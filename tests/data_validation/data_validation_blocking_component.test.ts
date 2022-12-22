import { Model } from "../../src";
import { ComposerStore } from "../../src/components/composer/composer/composer_store";
import { Store } from "../../src/store_engine";
import { UID } from "../../src/types";
import { addDataValidation, setCellContent, updateLocale } from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import { keyDown } from "../test_helpers/dom_helper";
import { getCellContent } from "../test_helpers/getters_helpers";
import {
  makeTestComposerStore,
  makeTestEnv,
  mountSpreadsheet,
  typeInComposerGrid,
} from "../test_helpers/helpers";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("../__mocks__/content_editable_helper")
);

describe("Data validation with blocking rule", () => {
  let model: Model;
  let sheetId: UID;
  let composerStore: Store<ComposerStore>;

  beforeEach(async () => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    composerStore = makeTestComposerStore(model);
  });

  test("Interactive raiseError on inputting invalid value", async () => {
    const raiseError = jest.fn();
    const env = makeTestEnv({ raiseError });
    await mountSpreadsheet({ model }, env);
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["ok"] }, "blocking");

    await typeInComposerGrid("hey");
    await keyDown({ key: "Enter" });

    expect(raiseError).toHaveBeenCalled();
    expect(getCellContent(model, "A1")).toBe("");
  });

  test("User can input wrong value in non-blocking DV rule", async () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["ok"] });

    composerStore.startEdition("hey");
    composerStore.stopEdition();

    expect(getCellContent(model, "A1")).toBe("hey");
    expect(model.getters.isDataValidationInvalid({ col: 0, row: 0, sheetId })).toEqual(true);
  });

  test("User can input correct number value in blocking DV rule", async () => {
    addDataValidation(model, "A1", "id", { type: "isEqual", values: ["3"] }, "blocking");

    composerStore.startEdition("3");
    composerStore.stopEdition();

    expect(getCellContent(model, "A1")).toBe("3");
    expect(model.getters.isDataValidationInvalid({ col: 0, row: 0, sheetId })).toEqual(false);
  });

  test("User can input correct localized number value in blocking DV rule", async () => {
    updateLocale(model, FR_LOCALE);
    addDataValidation(model, "A1", "id", { type: "isEqual", values: ["3.5"] }, "blocking");

    composerStore.startEdition("3,5");
    composerStore.stopEdition();

    expect(model.getters.getCell({ sheetId, col: 0, row: 0 })?.content).toBe("3.5");
    expect(model.getters.isDataValidationInvalid({ col: 0, row: 0, sheetId })).toEqual(false);
  });

  test("User cannot input wrong number value in blocking DV rule", async () => {
    addDataValidation(model, "A1", "id", { type: "isBetween", values: ["5", "8"] }, "blocking");
    composerStore.startEdition("9");
    composerStore.stopEdition();

    expect(getCellContent(model, "A1")).toBe("");
  });

  test("User cannot input formula with wrong result in blocking DV rule", async () => {
    setCellContent(model, "B1", "5");
    addDataValidation(model, "A1", "id", { type: "isBetween", values: ["5", "8"] }, "blocking");
    composerStore.startEdition("=SUM(B1, 10)");
    composerStore.stopEdition();

    expect(getCellContent(model, "A1")).toBe("");
  });

  test("User can input formula with correct result in blocking DV rule", async () => {
    setCellContent(model, "B1", "i");
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["hi"] }, "blocking");
    composerStore.startEdition('=CONCAT("h", B1)');
    composerStore.stopEdition();

    expect(getCellContent(model, "A1")).toBe("hi");
  });

  test("User can input localized formula with correct result in blocking DV rule", async () => {
    setCellContent(model, "B1", "5.5");
    updateLocale(model, FR_LOCALE);
    addDataValidation(model, "A1", "id", { type: "isEqual", values: ["10"] }, "blocking");
    composerStore.startEdition("=SUM(4,5; B1)");
    composerStore.stopEdition();

    expect(getCellContent(model, "A1")).toBe("10");
  });

  test("User cannot input formula in error in blocking DV rule", async () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["hi"] }, "blocking");
    composerStore.startEdition("=0/0");
    composerStore.stopEdition();

    expect(getCellContent(model, "A1")).toBe("");
  });

  test("User can input spreading formula in blocking DV rule", async () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["hi"] }, "blocking");
    composerStore.startEdition("=MUNIT(6)");
    composerStore.stopEdition();

    expect(getCellContent(model, "A1")).toBe("1");
  });
});
