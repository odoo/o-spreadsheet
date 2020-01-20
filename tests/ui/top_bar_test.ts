import { GridModel } from "../../src/model/index";
import { makeTestFixture, nextTick } from "../helpers";
import { TopBar } from "../../src/ui/top_bar";
import { Component, tags } from "@odoo/owl";

const { xml } = tags;

let fixture: HTMLElement;

class Parent extends Component<any, any> {
  static template = xml`<TopBar model="model" t-on-ask-confirmation="askConfirmation"/>`;
  static components = { TopBar };
  model: GridModel;
  constructor(model: GridModel) {
    super();
    this.model = model;
  }
  askConfirmation(ev) {}
  mounted() {
    this.model.on("update", this, this.render);
  }

  willUnmount() {
    this.model.off("update", this);
  }
}

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("TopBar component", () => {
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
    model.updateSelection(5, 5);
    const parent = new TestParent(model);
    await parent.mount(fixture);

    fixture.querySelector('.o-tool[title="Merge Cells"]')!.dispatchEvent(new Event("click"));

    expect(model.state.merges).toEqual({});
    confirm();
    expect(model.state.merges).not.toEqual({});
  });

  test("opening a second menu closes the first one", async () => {
    const model = new GridModel({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } }
        }
      ]
    });
    const parent = new Parent(model);
    await parent.mount(fixture);

    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
    fixture.querySelector('span[title="Text Color"]')!.dispatchEvent(new Event("click"));
    await nextTick();
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    expect(fixture.querySelectorAll(".o-line-item").length).not.toBe(0);
    fixture
      .querySelector('.o-tool[title="Horizontal align"] span')!
      .dispatchEvent(new Event("click"));
    await nextTick();
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    expect(fixture.querySelectorAll(".o-color-line").length).toBe(0);
  });
});
