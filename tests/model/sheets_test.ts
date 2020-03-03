import { GridModel, CURRENT_VERSION } from "../../src/model/index";
import "../helpers"; // to have getcontext mocks

describe("sheets", () => {
  test("can create a new sheet, then undo, then redo", () => {
    const model = new GridModel();
    expect(model.state.sheets.length).toBe(1);
    expect(model.state.activeSheet.name).toBe("Sheet1");

    model.createSheet();
    expect(model.state.sheets.length).toBe(2);
    expect(model.state.activeSheet.name).toBe("Sheet2");

    model.undo();
    expect(model.state.sheets.length).toBe(1);
    expect(model.state.activeSheet.name).toBe("Sheet1");

    model.redo();
    expect(model.state.sheets.length).toBe(2);
    expect(model.state.activeSheet.name).toBe("Sheet2");
  });

  test("can read a value in same sheet", () => {
    const model = new GridModel();
    expect(model.state.activeSheet.name).toBe("Sheet1");

    model.setValue("A1", "3");
    model.setValue("A2", "=Sheet1!A1");

    expect(model.state.cells.A2.value).toBe(3);
  });

  test("can read a value in another sheet", () => {
    const model = new GridModel();
    expect(model.state.activeSheet.name).toBe("Sheet1");

    model.setValue("A1", "3");
    model.createSheet();
    expect(model.state.activeSheet.name).toBe("Sheet2");
    model.setValue("A1", "=Sheet1!A1");
    expect(model.state.cells.A1.value).toBe(3);
  });

  test("throw if invalid sheet name", () => {
    const model = new GridModel();
    model.setValue("A1", "=Sheet133!A1");

    expect(model.state.cells.A1.value).toBe("#ERROR");
  });

  test("evaluating multiple sheets", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
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

    expect(model.state.activeSheet.name).toBe("ABC");
    expect(model.state.cells.B1.value).toBe(3);
  });

  test("evaluating multiple sheets, 2", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
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

    expect(model.state.activeSheet.name).toBe("ABC");
    expect(model.state.cells.B1.value).toBe(3);
  });

  test("evaluating multiple sheets, 3 (with range)", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
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

    expect(model.state.activeSheet.name).toBe("ABC");
    expect(model.state.cells.B1.value).toBe(5);
  });

  test("evaluating multiple sheets: cycles", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
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

    expect(model.state.activeSheet.name).toBe("ABC");
    expect(model.state.cells.B1.value).toBe("#CYCLE");
    expect(model.state.cells.C3.value).toBe(42);
  });
});
