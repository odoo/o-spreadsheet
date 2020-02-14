import { addFunction } from "../../src/functions";
import { args } from "../../src/functions/arguments";
import { CURRENT_VERSION, GridModel } from "../../src/model/index";
import { resetFunctions } from "../helpers";

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

describe("Object functions", () => {
  test("Can call getObject from a function", () => {
    expect.assertions(2);
    resetFunctions();
    addFunction("TEST", {
      description: "test with getObject",
      args: args``,
      compute: function() {
        // @ts-ignore
        expect(this.getObject).toBeDefined();
        // @ts-ignore
        expect(this.getObjects).toBeDefined();
        return 1;
      },
      returns: ["ANY"]
    });
    const model = new GridModel();
    model.setValue("A1", "=TEST()");
  });

  test("Can call getObject from a function with one arg", () => {
    expect.assertions(2);
    resetFunctions();
    addFunction("TEST", {
      description: "test with getObject",
      args: args`n (number) some number`,
      compute: function() {
        // @ts-ignore
        expect(this.getObject).toBeDefined();
        // @ts-ignore
        expect(this.getObjects).toBeDefined();
        return 1;
      },
      returns: ["ANY"]
    });
    const model = new GridModel();
    model.setValue("A1", "=TEST(3)");
  });
});
