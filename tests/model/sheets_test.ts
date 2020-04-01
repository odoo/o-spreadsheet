import { GridModel } from "../../src/model/index";
import "../helpers"; // to have getcontext mocks

describe("sheets", () => {
  test("can create a new sheet, then undo, then redo", () => {
    const model = new GridModel();
    expect(model.workbook.sheets.length).toBe(1);
    expect(model.workbook.activeSheet.name).toBe("Sheet1");

    model.dispatch({ type: "CREATE_SHEET" });
    expect(model.workbook.sheets.length).toBe(2);
    expect(model.workbook.activeSheet.name).toBe("Sheet2");

    model.dispatch({ type: "UNDO" });
    expect(model.workbook.sheets.length).toBe(1);
    expect(model.workbook.activeSheet.name).toBe("Sheet1");

    model.dispatch({ type: "REDO" });
    expect(model.workbook.sheets.length).toBe(2);
    expect(model.workbook.activeSheet.name).toBe("Sheet2");
  });

  test("can read a value in same sheet", () => {
    const model = new GridModel();
    expect(model.workbook.activeSheet.name).toBe("Sheet1");

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "3" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "=Sheet1!A1" });

    expect(model.workbook.cells.A2.value).toBe(3);
  });

  test("can read a value in another sheet", () => {
    const model = new GridModel();
    expect(model.workbook.activeSheet.name).toBe("Sheet1");

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "3" });
    model.dispatch({ type: "CREATE_SHEET" });
    expect(model.workbook.activeSheet.name).toBe("Sheet2");
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "=Sheet1!A1" });
    expect(model.workbook.cells.A1.value).toBe(3);
  });

  test("throw if invalid sheet name", () => {
    const model = new GridModel();
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "=Sheet133!A1" });

    expect(model.workbook.cells.A1.value).toBe("#ERROR");
  });

  test("evaluating multiple sheets", () => {
    const model = new GridModel({
      sheets: [
        {
          name: "ABC",
          colNumber: 10,
          rowNumber: 10,
          cells: { B1: { content: "=DEF!B2" } }
        },
        {
          name: "DEF",
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "3" } }
        }
      ]
    });

    expect(model.workbook.activeSheet.name).toBe("ABC");
    expect(model.workbook.cells.B1.value).toBe(3);
  });

  test("evaluating multiple sheets, 2", () => {
    const model = new GridModel({
      sheets: [
        {
          name: "ABC",
          colNumber: 10,
          rowNumber: 10,
          cells: { B1: { content: "=DEF!B2" } }
        },
        {
          name: "DEF",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            B2: { content: "=A4" },
            A4: { content: "3" }
          }
        }
      ]
    });

    expect(model.workbook.activeSheet.name).toBe("ABC");
    expect(model.workbook.cells.B1.value).toBe(3);
  });

  test("evaluating multiple sheets, 3 (with range)", () => {
    const model = new GridModel({
      sheets: [
        {
          name: "ABC",
          colNumber: 10,
          rowNumber: 10,
          cells: { B1: { content: "=DEF!B2" } }
        },
        {
          name: "DEF",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            B2: { content: "=SUM(A1:A5)" },
            A1: { content: "2" },
            A4: { content: "3" }
          }
        }
      ]
    });

    expect(model.workbook.activeSheet.name).toBe("ABC");
    expect(model.workbook.cells.B1.value).toBe(5);
  });

  test("evaluating multiple sheets: cycles", () => {
    const model = new GridModel({
      sheets: [
        {
          name: "ABC",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            B1: { content: "=DEF!B2" },
            C3: { content: "=DEF!C5 + 1" },
            C4: { content: "40" }
          }
        },
        {
          name: "DEF",
          colNumber: 10,
          rowNumber: 10,
          cells: {
            B2: { content: "=ABC!B1" },
            C5: { content: "=ABC!C4 + 1" }
          }
        }
      ]
    });

    expect(model.workbook.activeSheet.name).toBe("ABC");
    expect(model.workbook.cells.B1.value).toBe("#CYCLE");
    expect(model.workbook.cells.C3.value).toBe(42);
  });
});
