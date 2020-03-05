import { addFunction } from "../../src/functions";
import { args } from "../../src/functions/arguments";
import { CURRENT_VERSION, GridModel } from "../../src/model/index";
import { resetFunctions } from "../helpers";

describe("Entity", () => {
  test("Add an entity", () => {
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
    model.addEntity("A", "1", { name: "Name" });
    expect(Object.keys(model.state.entities)).toHaveLength(1);
    expect(Object.keys(model.getEntities("A"))).toHaveLength(1);
    expect(model.getEntity("A", "1")).toBeDefined();
    expect(() => model.getEntity("A", "2")).toThrow();
    expect(() => model.getEntity("B", "1")).toThrow();
    expect(() => model.getEntities("B")).toThrow();
  });
  test("Add multiple entities", () => {
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
    model.addEntity("A", "1", { name: "Name" });
    model.addEntity("A", "2", { name: "Test" });
    expect(Object.keys(model.state.entities)).toHaveLength(1);
    expect(model.getEntity("A", "1")["name"]).toBe("Name");
    expect(model.getEntity("A", "2")["name"]).toBe("Test");
  });
  test("Remove entities", () => {
    const model = new GridModel({
      version: CURRENT_VERSION,
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          merges: ["A1:B3"]
        }
      ],
      entities: {
        A: {
          "1": { name: "Name" }
        }
      }
    });
    expect(Object.keys(model.state.entities)).toHaveLength(1);
    model.removeEntity("A", "2");
    model.removeEntity("B", "2");
    expect(Object.keys(model.state.entities)).toHaveLength(1);
    expect(Object.keys(model.state.entities["A"])).toHaveLength(1);
    model.removeEntity("A", "1");
    expect(Object.keys(model.state.entities)).toHaveLength(1);
    expect(Object.keys(model.state.entities["A"])).toHaveLength(0);
  });
});

describe("Entity functions", () => {
  test("Can call getEntity from a function", () => {
    expect.assertions(2);
    resetFunctions();
    addFunction("TEST", {
      description: "test with getEntity",
      args: args``,
      compute: function() {
        // @ts-ignore
        expect(this.getEntity).toBeDefined();
        // @ts-ignore
        expect(this.getEntities).toBeDefined();
        return 1;
      },
      returns: ["ANY"]
    });
    const model = new GridModel();
    model.setValue("A1", "=TEST()");
  });

  test("Can call getEntity from a function with one arg", () => {
    expect.assertions(2);
    resetFunctions();
    addFunction("TEST", {
      description: "test with getEntity",
      args: args`n (number) some number`,
      compute: function() {
        // @ts-ignore
        expect(this.getEntity).toBeDefined();
        // @ts-ignore
        expect(this.getEntities).toBeDefined();
        return 1;
      },
      returns: ["ANY"]
    });
    const model = new GridModel();
    model.setValue("A1", "=TEST(3)");
  });
});
