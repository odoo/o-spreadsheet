import { GridModel } from "../../src/model";

import { GridParent, makeTestFixture } from "../helpers";

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("Model resizer", () => {
  test("Can resize one column", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    const initialSize = model.state.cols[1].size;
    const initialTop = model.state.cols[2].left;

    model.updateColSize(1, 100);

    expect(model.state.cols[1].size).toBe(initialSize + 100);
    expect(model.state.cols[2].left).toBe(initialTop + 100);
  });

  test("Can resize one row", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    const initialSize = model.state.rows[1].size;
    const initialTop = model.state.rows[2].top;

    model.updateRowSize(1, 100);

    expect(model.state.rows[1].size).toBe(initialSize + 100);
    expect(model.state.rows[2].top).toBe(initialTop + 100);
  });

  test("Can resize multiple columns", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    const size = model.state.cols[0].size;

    model.updateColsSize(1, [3, 4], 100);

    expect(model.state.cols[1].size).toBe(size + 100);
    expect(model.state.cols[3].size).toBe(size + 100);
    expect(model.state.cols[4].size).toBe(size + 100);
    expect(model.state.cols[5].left).toBe(size * 5 + 100 * 3);
  });

  test("Can resize multiple rows", async () => {
    const model = new GridModel();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    model.state.viewport = { left: 0, top: 0, right: 9, bottom: 9 };

    const size = model.state.rows[0].size;

    model.updateRowsSize(1, [3, 4], 100);

    expect(model.state.rows[1].size).toBe(size + 100);
    expect(model.state.rows[3].size).toBe(size + 100);
    expect(model.state.rows[4].size).toBe(size + 100);
    expect(model.state.rows[5].top).toBe(size * 5 + 100 * 3);
  });
});
