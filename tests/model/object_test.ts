import { GridModel, CURRENT_VERSION } from "../../src/model/index";

describe("Object", () => {
  test("Add an object", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["A1:B3"]
        }
      ]
    });
    model.addObject("A", "1", { name: "Name" });
    expect(Object.keys(model.state.objects)).toHaveLength(1);
    expect(Object.keys(model.getObjects("A"))).toHaveLength(1);
    expect(model.getObject("A", "1")).toBeDefined();
    expect(() => model.getObject("A", "2")).toThrow();
    expect(() => model.getObject("B", "1")).toThrow();
    expect(() => model.getObjects("B")).toThrow();
  });
  test("Add multiple objects", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["A1:B3"]
        }
      ]
    });
    model.addObject("A", "1", { name: "Name" });
    model.addObject("A", "2", { name: "Test" });
    expect(Object.keys(model.state.objects)).toHaveLength(1);
    expect(model.getObject("A", "1")["name"]).toBe("Name");
    expect(model.getObject("A", "2")["name"]).toBe("Test");
  });
  test("Remove objects", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["A1:B3"]
        }
      ],
      objects: {
        A: {
          "1": { name: "Name" }
        }
      }
    });
    expect(Object.keys(model.state.objects)).toHaveLength(1);
    model.removeObject("A", "2");
    model.removeObject("B", "2");
    expect(Object.keys(model.state.objects)).toHaveLength(1);
    expect(Object.keys(model.state.objects["A"])).toHaveLength(1);
    model.removeObject("A", "1");
    expect(Object.keys(model.state.objects)).toHaveLength(1);
    expect(Object.keys(model.state.objects["A"])).toHaveLength(0);
  });
});
