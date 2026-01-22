import "../src/canvas_mock";
import { Model } from "../src/model";

describe("o-spreadsheet engine", () => {
  beforeAll(() => {
    console.debug = () => {};
  });

  test("create a model without a DOM environment", () => {
    const model = new Model({
      sheets: [
        {
          cells: { A1: "=1+2" },
        },
      ],
    });
    expect(model).toBeDefined();
  });
});
