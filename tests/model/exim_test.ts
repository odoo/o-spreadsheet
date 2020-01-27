import { GridModel, importData } from "../../src/model/index";

describe("data", () => {
  test("give default col size if not specified", () => {
    const model = new GridModel();

    // 96 is default cell width
    expect(model.state.cols[0].size).toEqual(96);
    expect(model.state.cols[1].size).toEqual(96);
  });

  test("get default values in style 0", () => {
    const model = new GridModel();

    // 96 is default cell width
    expect(model.state.styles[0].fillColor).toEqual("white");
  });

  test("importing data with no version number should fail", () => {
    expect(() => {
      importData({ some: "state" } as any);
    }).toThrow("Missing version number");
  });
});
