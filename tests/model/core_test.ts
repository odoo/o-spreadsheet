import { GridModel } from "../../src/model/index";

describe("core", () => {
  test("properly compute sum of current cells", () => {
    const model = new GridModel();
    model.setValue("A2", "3");
    model.setValue("A3", "54");

    expect(model.aggregate).toBe(null);

    model.selectCell(0, 1);
    expect(model.aggregate).toBe(null);

    model.updateSelection(0, 2);
    expect(model.aggregate).toBe("57");
  });

  test("ignore cells with an error", () => {
    const model = new GridModel();
    model.setValue("A1", "2");
    model.setValue("A2", "=A2");
    model.setValue("A3", "3");

    // select A1
    model.selectCell(0, 0);
    expect(model.aggregate).toBe(null);

    // select A1:A2
    model.updateSelection(0, 1);
    expect(model.aggregate).toBe(null);

    // select A1:A3
    model.updateSelection(0, 2);
    expect(model.aggregate).toBe("5");
  });
});
