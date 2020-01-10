import { GridModel } from "../src/grid_model";
import { Grid } from "../src/grid";
import { Component, tags } from "@odoo/owl";
import { makeTestFixture, triggerMouseEvent } from "./helpers";

const { xml } = tags;

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

class Parent extends Component<any, any> {
  static template = xml`
        <div class="parent">
        <Grid model="model"/>
        </div>
    `;

  static components = { Grid };
  model: GridModel;
  constructor(model: GridModel) {
    super();
    this.model = model;
  }
}

describe("Grid component", () => {
  test("can click on a cell to select it", async () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      cells: { B2: { content: "b2" }, B3: { content: "b3" } }
    });
    const parent = new Parent(model);
    await parent.mount(fixture);
    expect(model.activeXc).toBe("A1");
    triggerMouseEvent("mousedown", 300, 300);
    expect(model.activeXc).toBe("C10");
  });

  test("can shift-click on a cell to update selection", async () => {
    const model = new GridModel({
      colNumber: 10,
      rowNumber: 10,
      cells: { B2: { content: "b2" }, B3: { content: "b3" } }
    });
    const parent = new Parent(model);
    await parent.mount(fixture);
    expect(model.activeXc).toBe("A1");
    triggerMouseEvent("mousedown", 300, 300, { shiftKey: true });
    expect(model.selection).toEqual({
      top: 0,
      left: 0,
      bottom: 9,
      right: 2
    });
  });
});
