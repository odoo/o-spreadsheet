import { Model } from "../../src";
import {
  addDataValidation,
  deleteContent,
  setCellContent,
  setStyle,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent, getStyle } from "../test_helpers/getters_helpers";
import { drawGrid } from "../test_helpers/helpers";
import { MockGridRenderingContext } from "../test_helpers/renderer_helpers";

describe("Checkbox in model", () => {
  let model: Model;

  beforeEach(async () => {
    model = new Model();
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
    expect(model.getters.getDataValidationCheckBoxCellPositions()).toEqual([
      { sheetId: model.getters.getActiveSheetId(), col: 0, row: 0 },
    ]);
    deleteContent(model, ["A1"]);
    expect(model.getters.getDataValidationCheckBoxCellPositions()).toHaveLength(0);
  });

  test("Checkbox are kept when emptying the content of the cell", () => {
    addDataValidation(model, "A1", "id", { type: "isBoolean", values: [] });
    expect(model.getters.getDataValidationCheckBoxCellPositions()).toEqual([
      { sheetId: model.getters.getActiveSheetId(), col: 0, row: 0 },
    ]);
    setCellContent(model, "A1", "");
    expect(model.getters.getDataValidationCheckBoxCellPositions()).toHaveLength(1);
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

  describe("renderer", () => {
    let renderedTexts: string[];
    let ctx: MockGridRenderingContext;

    beforeEach(() => {
      renderedTexts = [];
      ctx = new MockGridRenderingContext(model, 1000, 1000, {
        onFunctionCall: (fn, args) => {
          if (fn === "fillText") {
            renderedTexts.push(args[0]);
          }
        },
      });
    });

    test("Valid checkbox value is not rendered", () => {
      addDataValidation(model, "B2", "id", { type: "isBoolean", values: [] });
      setCellContent(model, "B2", "TRUE");
      drawGrid(model, ctx);
      expect(renderedTexts).not.toContain("TRUE");
    });

    test("Invalid checkbox value is rendered", () => {
      addDataValidation(model, "B2", "id", { type: "isBoolean", values: [] });
      setCellContent(model, "B2", "hello");
      drawGrid(model, ctx);
      expect(renderedTexts).toContain("hello");
    });
  });
});
