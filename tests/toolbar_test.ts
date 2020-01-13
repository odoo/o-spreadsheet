import { GridModel } from "../src/grid_model";
import { makeTestFixture } from "./helpers";
import { ToolBar } from "../src/toolbar";
import { Component, tags } from "@odoo/owl";

const { xml } = tags;

let fixture: HTMLElement;

class Parent extends Component<any, any> {
  static template = xml`<ToolBar model="model" t-on-ask-confirmation="askConfirmation"/>`;
  static components = { ToolBar };
  model: GridModel;
  constructor(model: GridModel) {
    super();
    this.model = model;
  }
  askConfirmation(ev) {}
}

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("Toolbar component", () => {
  test("merging destructively a selection ask for confirmation", async () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } }
        }
      ]
    });
    let confirm;
    class TestParent extends Parent {
      askConfirmation(ev) {
        confirm = ev.detail.confirm;
      }
    }
    model.selections.zones = [
      {
        top: 0,
        left: 0,
        right: 5,
        bottom: 5
      }
    ];
    const parent = new TestParent(model);
    await parent.mount(fixture);

    fixture.querySelector('.o-tool[title="Merge Cells"')!.dispatchEvent(new Event("click"));

    expect(model.merges).toEqual({});
    confirm();
    expect(model.merges).not.toEqual({});
  });
});
