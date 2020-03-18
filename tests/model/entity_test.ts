import { addFunction } from "../../src/functions";
import { args } from "../../src/functions/arguments";
import { CURRENT_VERSION, GridModel } from "../../src/model/index";
import "../canvas.mock";
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
    expect(model.exportData().entities).toEqual({});
    model.dispatch({ type: "ADD_ENTITY", kind: "A", key: "1", value: { name: "Name" } });

    expect(model.exportData().entities).toEqual({
      A: { "1": { name: "Name" } }
    });

    expect(model.getters["getEntity"]("A", "1")).toEqual({ name: "Name" });
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

    model.dispatch({ type: "ADD_ENTITY", kind: "A", key: "1", value: { name: "Name" } });
    model.dispatch({ type: "ADD_ENTITY", kind: "A", key: "2", value: { name: "Test" } });

    expect(model.exportData().entities).toEqual({
      A: { "1": { name: "Name" }, "2": { name: "Test" } }
    });
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

    expect(model.exportData().entities).toEqual({
      A: { "1": { name: "Name" } }
    });

    model.dispatch({ type: "REMOVE_ENTITY", kind: "A", key: "2" });
    model.dispatch({ type: "REMOVE_ENTITY", kind: "B", key: "2" });

    expect(model.exportData().entities).toEqual({
      A: { "1": { name: "Name" } }
    });

    model.dispatch({ type: "REMOVE_ENTITY", kind: "A", key: "1" });

    expect(model.exportData().entities).toEqual({
      A: {}
    });
  });
});

describe("Entity functions", () => {
  test("Can call getEntity from a function", () => {
    expect.assertions(2);
    resetFunctions();
    addFunction("TEST", {
      description: "test with getEntity",
      args: [],
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
