import { GridModel } from "../../src/model/index";

describe("data", () => {
  test("give default col size if not specified", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cols: { 1: {} },
          cells: { B2: { content: "b2" } }
        }
      ]
    });

    // 96 is default cell width
    expect(model.state.cols[0].size).toEqual(96);
    expect(model.state.cols[1].size).toEqual(96);
  });

  test("get default values in style 0", () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10
        }
      ]
    });

    // 96 is default cell width
    expect(model.state.styles[0].fillColor).toEqual("white");
  });
});
