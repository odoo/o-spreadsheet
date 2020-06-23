import { Component, hooks, tags } from "@odoo/owl";
import { BottomBar } from "../../src/components/bottom_bar";
import { Model } from "../../src/model";
import { makeTestFixture, nextTick, mockUuidV4To } from "../helpers";
import { triggerMouseEvent } from "../dom_helper";
import { CommandResult } from "../../src/types";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

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

    mockUuidV4To(42);
    triggerMouseEvent(".o-add-sheet", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("CREATE_SHEET", { activate: true, id: "42" });
  });

  test("Can activate a sheet", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "click");
    const from = parent.model.getters.getActiveSheet();
    const to = from;
    expect(parent.env.dispatch).toHaveBeenCalledWith("ACTIVATE_SHEET", { from, to });
  });

  test("Can open context menu of a sheet", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
  });

  test("Can move right a sheet", async () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET");
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    triggerMouseEvent(".o-menu-item[data-name='move_right'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("MOVE_SHEET", { sheet, left: false });
  });

  test("Can move left a sheet", async () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { activate: true });
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    triggerMouseEvent(".o-menu-item[data-name='move_left'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("MOVE_SHEET", { sheet, left: true });
  });

  test("Move right and left are disabled when it's not possible to move", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='move_left'")!.classList).toContain(
      "disabled"
    );
    expect(fixture.querySelector(".o-menu-item[data-name='move_right'")!.classList).toContain(
      "disabled"
    );
  });

  test("Can delete a sheet", async () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET");
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    triggerMouseEvent(".o-menu-item[data-name='delete'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("DELETE_SHEET", { sheet });
  });

  test("Delete sheet is disabled when there is only one sheet", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='delete'")!.classList).toContain(
      "disabled"
    );
  });
});
