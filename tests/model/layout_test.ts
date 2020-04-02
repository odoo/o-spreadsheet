import { Model } from "../../src/model";
import { setMockSize } from "../canvas.mock";
import { toZone } from "../../src/helpers";

setMockSize(100);

describe("layout", () => {
  test("formulas evaluating to a string are properly aligned", () => {
    const model = new Model();
    model.updateVisibleZone(1000, 1000);
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "=A1" });
    expect(model.getters.getViewport(1000, 1000, 0, 0).boxes[0].align).toBe("right");
    expect(model.getters.getViewport(1000, 1000, 0, 0).boxes[1].align).toBe("right");

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "asdf" });
    expect(model.getters.getViewport(1000, 1000, 0, 0).boxes[0].align).toBe("left");
    expect(model.getters.getViewport(1000, 1000, 0, 0).boxes[1].align).toBe("left");
  });

  test("formulas in a merge, evaluating to a string are properly aligned", () => {
    const model = new Model();
    model.updateVisibleZone(1000, 1000);
    model.dispatch({ type: "ADD_MERGE", sheet: "Sheet1", zone: toZone("A2:B2") });
    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "1" });
    model.dispatch({ type: "SET_VALUE", xc: "A2", text: "=A1" });
    expect(model.getters.getViewport(1000, 1000, 0, 0).boxes[0].align).toBe("right");
    expect(model.getters.getViewport(1000, 1000, 0, 0).boxes[1].align).toBe("right");

    model.dispatch({ type: "SET_VALUE", xc: "A1", text: "asdf" });
    expect(model.getters.getViewport(1000, 1000, 0, 0).boxes[0].align).toBe("left");
    expect(model.getters.getViewport(1000, 1000, 0, 0).boxes[1].align).toBe("left");
  });
});
