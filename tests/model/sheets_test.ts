import { Model } from "../../src/model";
import "../helpers"; // to have getcontext mocks
import { getCell } from "../helpers";
import { toCartesian } from "../../src/helpers";

describe("sheets", () => {
  test("can create a new sheet, then undo, then redo", () => {
    const model = new Model();
    expect(model["workbook"].sheets.length).toBe(1);
    expect(model["workbook"].activeSheet.name).toBe("Sheet1");

    model.dispatch("CREATE_SHEET");
    expect(model["workbook"].sheets.length).toBe(2);
    expect(model["workbook"].activeSheet.name).toBe("Sheet2");

    model.dispatch("UNDO");
    expect(model["workbook"].sheets.length).toBe(1);
    expect(model["workbook"].activeSheet.name).toBe("Sheet1");

    model.dispatch("REDO");
    expect(model["workbook"].sheets.length).toBe(2);
    expect(model["workbook"].activeSheet.name).toBe("Sheet2");
  });

  test("Can create a new sheet with given size and name", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { rows: 2, cols: 4, name: "SheetTest" });
    expect(model["workbook"].activeSheet.colNumber).toBe(4);
    expect(model["workbook"].activeSheet.cols.length).toBe(4);
    expect(model["workbook"].activeSheet.rowNumber).toBe(2);
    expect(model["workbook"].activeSheet.rows.length).toBe(2);
    expect(model["workbook"].activeSheet.name).toBe("SheetTest");
  });

  test("Cannot create a sheet with a name already existent", () => {
    const model = new Model();
    const name = model["workbook"].activeSheet.name;
    expect(model.dispatch("CREATE_SHEET", { name })).toBe("CANCELLED");
  });

  test("can read a value in same sheet", () => {
    const model = new Model();
    expect(model["workbook"].activeSheet.name).toBe("Sheet1");

    model.dispatch("SET_VALUE", { xc: "A1", text: "3" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=Sheet1!A1" });

    expect(getCell(model, "A2")!.value).toBe(3);
  });

  test("can read a value in another sheet", () => {
    const model = new Model();
    expect(model["workbook"].activeSheet.name).toBe("Sheet1");

    model.dispatch("SET_VALUE", { xc: "A1", text: "3" });
    model.dispatch("CREATE_SHEET");
    expect(model["workbook"].activeSheet.name).toBe("Sheet2");
    model.dispatch("SET_VALUE", { xc: "A1", text: "=Sheet1!A1" });
    expect(getCell(model, "A1")!.value).toBe(3);
  });

  test("throw if invalid sheet name", () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "A1", text: "=Sheet133!A1" });

    expect(getCell(model, "A1")!.value).toBe("#ERROR");
  });

  test("evaluating multiple sheets", () => {
    const model = new Model({
      sheets: [
        {
          name: "ABC",
          colNumber: 10,
          rowNumber: 10,
          cells: { B1: { content: "=DEF!B2" } },
        },
        {
          name: "DEF",
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "3" } },
        },
      ],
    });

    expect(model["workbook"].activeSheet.name).toBe("ABC");
    expect(getCell(model, "B1")!.value).toBe(3);
  });

  test("evaluating multiple sheets, 2", () => {
    const model = new Model({
      sheets: [
        {
          name: "ABC",
          colNumber: 10,
          rowNumber: 10,
          cells: { B1: { content: "=DEF!B2" } },
        },
        {
          name: "DEF",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            B2: { content: "=A4" },
            A4: { content: "3" },
          },
        },
      ],
    });

    expect(model["workbook"].activeSheet.name).toBe("ABC");
    expect(getCell(model, "B1")!.value).toBe(3);
  });

  test("evaluating multiple sheets, 3 (with range)", () => {
    const model = new Model({
      sheets: [
        {
          name: "ABC",
          colNumber: 10,
          rowNumber: 10,
          cells: { B1: { content: "=DEF!B2" } },
        },
        {
          name: "DEF",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            B2: { content: "=SUM(A1:A5)" },
            A1: { content: "2" },
            A4: { content: "3" },
          },
        },
      ],
    });

    expect(model["workbook"].activeSheet.name).toBe("ABC");
    expect(getCell(model, "B1")!.value).toBe(5);
  });

  test("evaluating multiple sheets: cycles", () => {
    const model = new Model({
      sheets: [
        {
          name: "ABC",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            B1: { content: "=DEF!B2" },
            C3: { content: "=DEF!C5 + 1" },
            C4: { content: "40" },
          },
        },
        {
          name: "DEF",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            B2: { content: "=ABC!B1" },
            C5: { content: "=ABC!C4 + 1" },
          },
        },
      ],
    });

    expect(model["workbook"].activeSheet.name).toBe("ABC");
    expect(getCell(model, "B1")!.value).toBe("#CYCLE");
    expect(getCell(model, "C3")!.value).toBe(42);
  });

  test("cells are updated when dependency in other sheet is updated", () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET");
    expect(model.getters.getActiveSheet()).toEqual("Sheet2");
    model.dispatch("ACTIVATE_SHEET", { from: "Sheet2", to: "Sheet1" });
    expect(model.getters.getActiveSheet()).toEqual("Sheet1");
    model.dispatch("SET_VALUE", { text: "=Sheet2!A1", xc: "A1" });
    expect(getText(model, "A1")).toEqual("0");
    model.dispatch("ACTIVATE_SHEET", { from: "Sheet1", to: "Sheet2" });
    model.dispatch("SET_VALUE", { text: "3", xc: "A1" });
    model.dispatch("ACTIVATE_SHEET", { from: "Sheet2", to: "Sheet1" });
    expect(model.getters.getActiveSheet()).toEqual("Sheet1");
    expect(getText(model, "A1")).toEqual("3");
  });
});

function getText(model: Model, xc: string): string {
  const cell = model.getters.getCell(...toCartesian(xc));
  return cell ? model.getters.getCellText(cell) : "";
}
