import { GridModel } from "../../src/model/index";

describe("evaluateCells", () => {
  test("Simple Evaluation", () => {
    const data = {
      sheets: [
        {
          colNumber: 3,
          rowNumber: 3,
          cells: {
            A1: { content: "1" },
            B1: { content: "2" },
            C1: { content: "=SUM(A1,B1)" }
          }
        }
      ]
    };
    const grid = new GridModel(data);
    expect(grid.state.cells["C1"].value).toEqual(3);
  });

  test("With empty content", () => {
    const data = {
      sheets: [
        {
          colNumber: 3,
          rowNumber: 3,
          cells: {
            A1: { content: "1" },
            B1: { content: "" },
            C1: { content: "=SUM(A1,B1)" }
          }
        }
      ]
    };
    const grid = new GridModel(data);
    expect(grid.state.cells["C1"].value).toEqual(1);
  });

  test("With empty cell", () => {
    const data = {
      sheets: [
        {
          colNumber: 3,
          rowNumber: 3,
          cells: {
            A1: { content: "1" },
            C1: { content: "=SUM(A1,B1)" }
          }
        }
      ]
    };
    const grid = new GridModel(data);
    expect(grid.state.cells["C1"].value).toEqual(1);
  });
});
