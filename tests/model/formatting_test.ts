import { GridModel } from "../../src/model/index";

describe("formatting", () => {
  test("adding a style to a cell remove cell width cache", () => {
    const model = new GridModel();
    model.setValue("A2", "3");
    // this simulates a rendering which adds the width
    model.state.cells.A2.width = 234;
    model.selectCell(0, 1); // select B2
    model.setStyle({ fontSize: 33 });
    expect(model.state.cells.A2.width).not.toBeDefined();
  });
});
