import { Model } from "../../src/model";
import { MockCanvasRenderingContext2D } from "../canvas.mock";
import { toZone } from "../../src/helpers";

MockCanvasRenderingContext2D.prototype.measureText = function() {
  return { width: 100 };
};

function addContextSetter(key, fn) {
  Object.defineProperty(MockCanvasRenderingContext2D.prototype, key, {
    set: fn,
    configurable: true
  });
}

describe("renderer", () => {
  test("formulas evaluating to a string are properly aligned", () => {
    const model = new Model();

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "=A1" });

    const canvas = document.createElement("canvas");
    let textAligns: string[] = [];

    addContextSetter("textAlign", newvalue => textAligns.push(newvalue));
    model.drawGrid(canvas, { width: 1000, height: 1000, offsetX: 0, offsetY: 0 });
    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    textAligns = [];
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "asdf" });
    model.drawGrid(canvas, { width: 1000, height: 1000, offsetX: 0, offsetY: 0 });
    expect(textAligns).toEqual(["left", "left", "center"]); // center for headers
  });

  test("formulas in a merge, evaluating to a string are properly aligned", () => {
    const model = new Model();

    model.dispatch({ type: "ADD_MERGE", sheet: "Sheet1", zone: toZone("A2:B2") });
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "=A1" });

    const canvas = document.createElement("canvas");
    let textAligns: string[] = [];

    addContextSetter("textAlign", newvalue => textAligns.push(newvalue));
    model.drawGrid(canvas, { width: 1000, height: 1000, offsetX: 0, offsetY: 0 });

    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "asdf" });

    textAligns = [];
    model.drawGrid(canvas, { width: 1000, height: 1000, offsetX: 0, offsetY: 0 });
    expect(textAligns).toEqual(["left", "left", "center"]); // center for headers
  });

  test("formulas evaluating to a boolean are properly aligned", () => {
    const model = new Model();

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "=A1" });

    const canvas = document.createElement("canvas");
    let textAligns: string[] = [];

    addContextSetter("textAlign", newvalue => textAligns.push(newvalue));
    model.drawGrid(canvas, { width: 1000, height: 1000, offsetX: 0, offsetY: 0 });
    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    textAligns = [];
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "true" });
    model.drawGrid(canvas, { width: 1000, height: 1000, offsetX: 0, offsetY: 0 });
    expect(textAligns).toEqual(["center", "center", "center"]); // center for headers
  });

  test("formulas in a merge, evaluating to a boolean are properly aligned", () => {
    const model = new Model();

    model.dispatch({ type: "ADD_MERGE", sheet: "Sheet1", zone: toZone("A2:B2") });
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "=A1" });

    const canvas = document.createElement("canvas");
    let textAligns: string[] = [];

    addContextSetter("textAlign", newvalue => textAligns.push(newvalue));
    model.drawGrid(canvas, { width: 1000, height: 1000, offsetX: 0, offsetY: 0 });

    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "false" });

    textAligns = [];
    model.drawGrid(canvas, { width: 1000, height: 1000, offsetX: 0, offsetY: 0 });
    expect(textAligns).toEqual(["center", "center", "center"]); // center for headers
  });
});
