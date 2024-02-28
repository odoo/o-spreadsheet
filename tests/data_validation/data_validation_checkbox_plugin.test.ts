import { Model, UID } from "../../src";
import {
  addDataValidation,
  deleteContent,
  setCellContent,
  setStyle,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent, getStyle } from "../test_helpers/getters_helpers";
import { getDataValidationRules } from "../test_helpers/helpers";

describe("Checkbox in model", () => {
  let model: Model;
  let sheetId: UID;

  beforeEach(async () => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  test("Adding a checkbox rule will make its cells align middle/center", () => {
    addDataValidation(model, "A1:A2", "id", { type: "isBoolean", values: [] });
    expect(getStyle(model, "A1")).toMatchObject({ align: "center", verticalAlign: "middle" });
    expect(getStyle(model, "A2")).toMatchObject({ align: "center", verticalAlign: "middle" });
  });

  test("Adding a checkbox rule no not overwrite the style of the cell", () => {
    setStyle(model, "A1", { align: "left", verticalAlign: "top" });
    setStyle(model, "A2", { fillColor: "#FF0000" });
    addDataValidation(model, "A1:A2", "id", { type: "isBoolean", values: [] });
    expect(getStyle(model, "A1")).toMatchObject({ align: "left", verticalAlign: "top" });
    expect(getStyle(model, "A2")).toMatchObject({
      fillColor: "#FF0000",
      align: "center",
      verticalAlign: "middle",
    });
  });

  test("Checkbox are removed when clearing the content of the cell", () => {
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { criterion: { type: "isBoolean" }, ranges: ["A1"] },
    ]);
    deleteContent(model, ["A1"]);
    expect(getDataValidationRules(model, sheetId)).toEqual([]);
  });

  test("Checkbox are kept when emptying the content of the cell", () => {
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { criterion: { type: "isBoolean" }, ranges: ["A1"] },
    ]);
    setCellContent(model, "A1", "");
    expect(getDataValidationRules(model, sheetId)).toMatchObject([
      { criterion: { type: "isBoolean" }, ranges: ["A1"] },
    ]);
  });

  test("Insert checkbox in an empty cell set the content to FALSE", () => {
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    expect(getCellContent(model, "A1")).toEqual("FALSE");
  });

  test.each([
    ["=1=1", "TRUE"],
    ["=NOT(TRUE)", "FALSE"],
  ])(
    "Insert checkbox in an cell evaluating as boolean keep the content",
    (formula: string, content: string) => {
      setCellContent(model, "A1", formula);
      addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
      expect(getCellContent(model, "A1")).toEqual(content);
      expect(getCell(model, "A1")?.content).toEqual(formula);
    }
  );

  test.each([["=1+1", "=CONCAT('Tr','ue')"]])(
    "Insert checkbox in an cell evaluating as something else than a boolean set the content to FALSE",
    (formula: string) => {
      setCellContent(model, "A1", formula);
      addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
      expect(getCellContent(model, "A1")).toEqual("FALSE");
      expect(getCell(model, "A1")?.content).toEqual("FALSE");
    }
  );

  test.each([
    ["TRUE", "TRUE"],
    ["FALSE", "FALSE"],
    ["Something else", "FALSE"],
  ])(
    "Insert checkbox in an text cell keep the content only if similar to a boolean",
    (initialContent: string, finalContent: string) => {
      setCellContent(model, "A1", initialContent);
      addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
      expect(getCellContent(model, "A1")).toEqual(finalContent);
    }
  );
});
