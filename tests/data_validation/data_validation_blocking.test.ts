import { Model } from "../../src";
import { CommandResult, UID } from "../../src/types";
import { addDataValidation, setCellContent, updateLocale } from "../test_helpers/commands_helpers";
import { keyDown } from "../test_helpers/dom_helper";
import { getCellContent } from "../test_helpers/getters_helpers";
import { makeTestEnv, mountSpreadsheet, typeInComposerGrid } from "../test_helpers/helpers";
import { FR_LOCALE } from "./../test_helpers/constants";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("../components/__mocks__/content_editable_helper")
);

describe("Data validation with blocking rule", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(async () => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
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

    model.dispatch("START_EDITION", { text: "hey" });
    const result = model.dispatch("STOP_EDITION");

    expect(result).toBeSuccessfullyDispatched();
    expect(getCellContent(model, "A1")).toBe("hey");
    expect(model.getters.isDataValidationInvalid({ col: 0, row: 0, sheetId })).toEqual(true);
  });

  test("User can input correct number value in blocking DV rule", async () => {
    addDataValidation(model, "A1", "id", { type: "isEqual", values: ["3"] }, "blocking");

    model.dispatch("START_EDITION", { text: "3" });
    const result = model.dispatch("STOP_EDITION");

    expect(result).toBeSuccessfullyDispatched();
    expect(getCellContent(model, "A1")).toBe("3");
    expect(model.getters.isDataValidationInvalid({ col: 0, row: 0, sheetId })).toEqual(false);
  });

  test("User can input correct localized number value in blocking DV rule", async () => {
    updateLocale(model, FR_LOCALE);
    addDataValidation(model, "A1", "id", { type: "isEqual", values: ["3.5"] }, "blocking");

    model.dispatch("START_EDITION", { text: "3,5" });
    const result = model.dispatch("STOP_EDITION");

    expect(result).toBeSuccessfullyDispatched();
    expect(model.getters.getCell({ sheetId, col: 0, row: 0 })?.content).toBe("3.5");
    expect(model.getters.isDataValidationInvalid({ col: 0, row: 0, sheetId })).toEqual(false);
  });

  test("User cannot input wrong number value in blocking DV rule", async () => {
    addDataValidation(model, "A1", "id", { type: "isBetween", values: ["5", "8"] }, "blocking");
    model.dispatch("START_EDITION", { text: "9" });
    const result = model.dispatch("STOP_EDITION");

    expect(result).toBeCancelledBecause(CommandResult.BlockingValidationRule);
    expect(getCellContent(model, "A1")).toBe("");
  });

  test("User cannot input formula with wrong result in blocking DV rule", async () => {
    setCellContent(model, "B1", "5");
    addDataValidation(model, "A1", "id", { type: "isBetween", values: ["5", "8"] }, "blocking");
    model.dispatch("START_EDITION", { text: "=SUM(B1, 10)" });
    const result = model.dispatch("STOP_EDITION");

    expect(result).toBeCancelledBecause(CommandResult.BlockingValidationRule);
    expect(getCellContent(model, "A1")).toBe("");
  });

  test("User can input formula with correct result in blocking DV rule", async () => {
    setCellContent(model, "B1", "i");
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["hi"] }, "blocking");
    model.dispatch("START_EDITION", { text: '=CONCAT("h", B1)' });
    const result = model.dispatch("STOP_EDITION");

    expect(result).toBeSuccessfullyDispatched();
    expect(getCellContent(model, "A1")).toBe("hi");
  });

  test("User can input localized formula with correct result in blocking DV rule", async () => {
    setCellContent(model, "B1", "5.5");
    updateLocale(model, FR_LOCALE);
    addDataValidation(model, "A1", "id", { type: "isEqual", values: ["10"] }, "blocking");
    model.dispatch("START_EDITION", { text: "=SUM(4,5; B1)" });
    const result = model.dispatch("STOP_EDITION");

    expect(result).toBeSuccessfullyDispatched();
    expect(getCellContent(model, "A1")).toBe("10");
  });

  test("User cannot input formula in error in blocking DV rule", async () => {
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["hi"] }, "blocking");
    model.dispatch("START_EDITION", { text: "=0/0" });
    const result = model.dispatch("STOP_EDITION");

    expect(result).toBeCancelledBecause(CommandResult.BlockingValidationRule);
    expect(getCellContent(model, "A1")).toBe("");
  });
});
