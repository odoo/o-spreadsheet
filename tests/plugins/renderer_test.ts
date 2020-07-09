import { Model } from "../../src/model";
import { MockCanvasRenderingContext2D } from "../canvas.mock";
import { Viewport, GridRenderingContext } from "../../src/types";
import { toZone } from "../../src/helpers";

MockCanvasRenderingContext2D.prototype.measureText = function () {
  return { width: 100 };
};

interface ContextObserver {
  onSet?(key, val): void;
  onGet?(key): void;
  onFunctionCall?(fn: string, args: any[]): void;
}

class MockGridRenderingContext implements GridRenderingContext {
  _context = document.createElement("canvas").getContext("2d");
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  dpr = 1;
  thinLineWidth = 0.4;

  constructor(model: Model, width: number, height: number, observer: ContextObserver) {
    this.viewport = {
      width,
      height,
      offsetX: 0,
      offsetY: 0,
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    };
    this.viewport = model.getters.adjustViewportZone(this.viewport);

    const handler = {
      get: (target, val) => {
        if (val in (this._context as any).__proto__) {
          return (...args) => {
            if (observer.onFunctionCall) {
              observer.onFunctionCall(val, args);
            }
          };
        } else {
          if (observer.onGet) {
            observer.onGet(val);
          }
        }
        return target[val];
      },
      set: (target, key, val) => {
        if (observer.onSet) {
          observer.onSet(key, val);
        }
        target[key] = val;
        return true;
      },
    };
    this.ctx = new Proxy({}, handler);
  }
}

describe("renderer", () => {
  test("snapshot for a simple grid rendering", () => {
    const model = new Model();

    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    const instructions: string[] = [];
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        instructions.push(`context.${key}=${JSON.stringify(value)};`);
      },
      onGet: (key) => {
        instructions.push(`GET:${key}`);
      },
      onFunctionCall: (key, args) => {
        instructions.push(`context.${key}(${args.map((a) => JSON.stringify(a)).join(", ")})`);
      },
    });

    model.drawGrid(ctx);
    expect(instructions).toMatchSnapshot();
  });

  test("formulas evaluating to a string are properly aligned", () => {
    const model = new Model();

    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=A1" });

    let textAligns: string[] = [];
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });

    model.drawGrid(ctx);
    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    textAligns = [];
    model.dispatch("SET_VALUE", { xc: "A1", text: "asdf" });
    model.drawGrid(ctx);
    expect(textAligns).toEqual(["left", "left", "center"]); // center for headers
  });

  test("formulas in a merge, evaluating to a string are properly aligned", () => {
    const model = new Model();

    const sheet1 = model["workbook"].visibleSheets[0];
    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("A2:B2") });
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=A1" });

    let textAligns: string[] = [];

    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    model.drawGrid(ctx);

    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    model.dispatch("SET_VALUE", { xc: "A1", text: "asdf" });

    textAligns = [];
    model.drawGrid(ctx);
    expect(textAligns).toEqual(["left", "left", "center"]); // center for headers
  });

  test("formulas evaluating to a boolean are properly aligned", () => {
    const model = new Model();

    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=A1" });

    let textAligns: string[] = [];
    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    model.drawGrid(ctx);
    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    textAligns = [];
    model.dispatch("SET_VALUE", { xc: "A1", text: "true" });
    model.drawGrid(ctx);
    expect(textAligns).toEqual(["center", "center", "center"]); // center for headers
  });

  test("formulas in a merge, evaluating to a boolean are properly aligned", () => {
    const model = new Model();
    const sheet1 = model["workbook"].visibleSheets[0];

    model.dispatch("ADD_MERGE", { sheet: sheet1, zone: toZone("A2:B2") });
    model.dispatch("SET_VALUE", { xc: "A1", text: "1" });
    model.dispatch("SET_VALUE", { xc: "A2", text: "=A1" });

    let textAligns: string[] = [];

    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    model.drawGrid(ctx);

    expect(textAligns).toEqual(["right", "right", "center"]); // center for headers

    model.dispatch("SET_VALUE", { xc: "A1", text: "false" });

    textAligns = [];
    model.drawGrid(ctx);
    expect(textAligns).toEqual(["center", "center", "center"]); // center for headers
  });

  test("errors are aligned to the center", () => {
    const model = new Model();

    model.dispatch("SET_VALUE", { xc: "A1", text: "=A1" });

    let textAligns: string[] = [];

    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    model.drawGrid(ctx);

    // 1 center for headers, 1 for cell content
    expect(textAligns).toEqual(["center", "center"]);
  });

  test("dates are aligned to the right", () => {
    const model = new Model();

    model.dispatch("SET_VALUE", { xc: "A1", text: "03/23/2010" });

    let textAligns: string[] = [];

    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    model.drawGrid(ctx);

    // 1 center for headers, 1 for cell content
    expect(textAligns).toEqual(["right", "center"]);
  });

  test("functions are aligned to the left", () => {
    const model = new Model();

    model.dispatch("SET_VALUE", { xc: "A1", text: "=SUM(1,2)" });
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    let textAligns: string[] = [];

    let ctx = new MockGridRenderingContext(model, 1000, 1000, {
      onSet: (key, value) => {
        if (key === "textAlign") {
          textAligns.push(value);
        }
      },
    });
    model.drawGrid(ctx);

    // 1 center for headers, 1 for cell content
    expect(textAligns).toEqual(["left", "center"]);
  });
});
