import "../canvas.mock";
import { Model } from "../../src";

let m;
describe("navigation", () => {
  beforeEach(() => {
    m = new Model();
  });
  test("normal move to the right", () => {
    expect(m).toBeDefined();
  });
});
