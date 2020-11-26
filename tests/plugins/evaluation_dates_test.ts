import { Model } from "../../src/model";
import "../canvas.mock";
import { evaluateCellText, evaluateGrid, evaluateCell } from "../helpers";
import { getCellContent } from "../getters_helpers";
import { setCellContent } from "../commands_helpers";

describe("evaluateCells", () => {
  test("Various date representations", () => {
    const grid = {
      A1: "1/2/2020",
      A2: "02/26/1920",
      A3: "04/3/2010",
      B1: "1-2-2020",
      B2: "02-26-1920",
      B3: "04-3-2010",
      C1: "1 2 2020",
      C2: "02 26 1920",
      C3: "04 3 2010",
      D1: "2020/1/2",
      D2: "1920/02/26",
      D3: "2010/04/3",
      E1: "2020-1-2",
      E2: "1920-02-26",
      E3: "2010-04-3",
      F1: "2020 1 2",
      F2: "1920 02 26",
      F3: "2010 04 3",
    };
    expect(evaluateGrid(grid)).toEqual({
      A1: { format: "m/d/yyyy", jsDate: new Date(2020, 0, 2), value: 43832 },
      A2: { format: "mm/dd/yyyy", jsDate: new Date(1920, 1, 26), value: 7362 },
      A3: { format: "mm/dd/yyyy", jsDate: new Date(2010, 3, 3), value: 40271 },
      B1: { format: "m-d-yyyy", jsDate: new Date(2020, 0, 2), value: 43832 },
      B2: { format: "mm-dd-yyyy", jsDate: new Date(1920, 1, 26), value: 7362 },
      B3: { format: "mm-dd-yyyy", jsDate: new Date(2010, 3, 3), value: 40271 },
      C1: { format: "m d yyyy", jsDate: new Date(2020, 0, 2), value: 43832 },
      C2: { format: "mm dd yyyy", jsDate: new Date(1920, 1, 26), value: 7362 },
      C3: { format: "mm dd yyyy", jsDate: new Date(2010, 3, 3), value: 40271 },
      D1: { format: "yyyy/m/d", jsDate: new Date(2020, 0, 2), value: 43832 },
      D2: { format: "yyyy/mm/dd", jsDate: new Date(1920, 1, 26), value: 7362 },
      D3: { format: "yyyy/mm/dd", jsDate: new Date(2010, 3, 3), value: 40271 },
      E1: { format: "yyyy-m-d", jsDate: new Date(2020, 0, 2), value: 43832 },
      E2: { format: "yyyy-mm-dd", jsDate: new Date(1920, 1, 26), value: 7362 },
      E3: { format: "yyyy-mm-dd", jsDate: new Date(2010, 3, 3), value: 40271 },
      F1: { format: "yyyy m d", jsDate: new Date(2020, 0, 2), value: 43832 },
      F2: { format: "yyyy mm dd", jsDate: new Date(1920, 1, 26), value: 7362 },
      F3: { format: "yyyy mm dd", jsDate: new Date(2010, 3, 3), value: 40271 },
    });
  });

  test("date representation is preserved when displayed", () => {
    const model = new Model();
    setCellContent(model, "A1", "1/1/2020");
    expect(getCellContent(model, "A1")).toEqual("1/1/2020");
  });

  test("adding a date and a number", () => {
    const grid = {
      A1: "1/2/2020",
      A2: "=A1+1",
    };
    expect(evaluateCellText("A2", grid)).toEqual("1/3/2020");
  });

  test("adding a date in mm/d/yyyy format and a number", () => {
    const grid = {
      A1: "01/12/2020",
      A2: "=A1+1",
    };
    expect(evaluateCellText("A2", grid)).toEqual("01/13/2020");
  });

  test("adding two dates", () => {
    const grid = {
      A1: "2/3/2020",
      A2: "1/2/1940",
      A3: "=A1+A2",
    };
    expect(evaluateCell("A3", grid)).toEqual(58476);
  });
});
