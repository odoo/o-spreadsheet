import { Component, useState, xml } from "@odoo/owl";
import { Model, Spreadsheet } from "../../src";
import { SpreadsheetChildEnv } from "../../src/types";
import { createSheet, setCellContent } from "../test_helpers/commands_helpers";
import { getChildFromComponent, mountComponent, nextTick } from "../test_helpers/helpers";

class Parent extends Component<{}, SpreadsheetChildEnv> {
  static template = xml/* xml */ `
      <div class="integration-wrapper">
        <Spreadsheet model="model"/>
      </div>
    `;
  static components = { Spreadsheet };

  state = useState({ model: new Model() });

  setup() {}

  get model() {
    return this.state.model;
  }

  setModel(model: Model) {
    this.state.model = model;
  }
}

async function mountParent(
  model: Model = new Model()
): Promise<{ parent: Parent; model: Model; fixture: HTMLElement }> {
  let parent: Component;
  let fixture: HTMLElement;
  ({ parent, fixture } = await mountComponent(Parent, { props: { model } }));
  return { parent: parent as Parent, model, fixture };
}

describe("Integration of Spreadsheet component", () => {
  test("Updates in old model of Spreadsheet should not impact the latter", async () => {
    const { parent } = await mountParent();
    const model1 = parent.model;
    createSheet(model1, { name: "test", sheetId: "test" });
    await nextTick();

    const spreadsheetComponent = getChildFromComponent(parent, Spreadsheet);

    const model2 = new Model();
    parent.setModel(model2);
    model1.leaveSession();
    await nextTick();

    // starting from here, any action on model1 should have 0 effect on Spreadsheet
    const fn1 = jest.spyOn(spreadsheetComponent, "render");

    setCellContent(model1, "A1", "test");
    await nextTick();
    expect(fn1).not.toHaveBeenCalled();
  });
});
