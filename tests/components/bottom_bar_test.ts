import { Component, hooks, tags } from "@odoo/owl";
import { BottomBar } from "../../src/components/bottom_bar";
import { Model } from "../../src/model";
import { makeTestFixture, nextTick } from "../helpers";
import { triggerMouseEvent } from "../dom_helper";
import { CommandResult } from "../../src/types";

const { xml } = tags;
const { useSubEnv } = hooks;

let fixture: HTMLElement;

class Parent extends Component<any, any> {
  static template = xml`<BottomBar model="model"/>`;
  static components = { BottomBar };
  model: Model;
  constructor(model: Model) {
    super();
    useSubEnv({
      openSidePanel: (panel: string) => {},
      dispatch: jest.fn(() => ({ status: "SUCCESS" } as CommandResult)),
      getters: model.getters,
      askConfirmation: jest.fn(),
    });
    this.model = model;
  }
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

describe("BottomBar component", () => {
  test("simple rendering", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    expect(fixture.querySelector(".o-spreadsheet-bottom-bar")).toMatchSnapshot();
  });

  test("Can create a new sheet", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    triggerMouseEvent(".o-add-sheet", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("CREATE_SHEET", { activate: true });
  });

  test("Can activate a sheet", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "click");
    const from = parent.model.getters.getActiveSheet();
    const to = from;
    expect(parent.env.dispatch).toHaveBeenCalledWith("ACTIVATE_SHEET", { from, to });
  });

  test.skip("Can open context menu of a sheet", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
  });
});
