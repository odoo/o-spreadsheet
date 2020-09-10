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
      _t: (s: string) => s,
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

  test("Can open context menu of a sheet with the arrow", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
  });

  test("Click on the arrow when the context menu is open should close it", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
  });

  test("Can move right a sheet", async () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { id: "42" });
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    triggerMouseEvent(".o-menu-item[data-name='move_right'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("MOVE_SHEET", { sheet, direction: "right" });
  });

  test("Can move left a sheet", async () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { id: "42", activate: true });
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    triggerMouseEvent(".o-menu-item[data-name='move_left'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("MOVE_SHEET", { sheet, direction: "left" });
  });

  test("Move right and left are not visible when it's not possible to move", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='move_left'")).toBeNull();
    expect(fixture.querySelector(".o-menu-item[data-name='move_right'")).toBeNull();
  });

  test("Can rename a sheet", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    triggerMouseEvent(".o-menu-item[data-name='rename'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("RENAME_SHEET", { sheet, interactive: true });
  });

  test("Can rename a sheet with dblclick", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet-name", "dblclick");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    expect(parent.env.dispatch).toHaveBeenCalledWith("RENAME_SHEET", { sheet, interactive: true });
  });

  test("Can duplicate a sheet", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);
    mockUuidV4To(123);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    const name = `Copy of ${model.getters.getSheets()[0].name}`;
    triggerMouseEvent(".o-menu-item[data-name='duplicate'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("DUPLICATE_SHEET", { sheet, id: "123", name });
  });

  test("Can duplicate a sheet", async () => {
    const model = new Model({
      sheets: [
        {
          name: "test",
        },
        {
          name: "Copy of test",
        },
      ],
    });
    const parent = new Parent(model);
    await parent.mount(fixture);
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    const name = `Copy of test (1)`;
    mockUuidV4To(123);
    triggerMouseEvent(".o-menu-item[data-name='duplicate'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("DUPLICATE_SHEET", { sheet, id: "123", name });
  });

  test("Can delete a sheet", async () => {
    const model = new Model();
    model.dispatch("CREATE_SHEET", { id: "42" });
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    triggerMouseEvent(".o-menu-item[data-name='delete'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("DELETE_SHEET_CONFIRMATION", { sheet });
  });

  test("Delete sheet is not visible when there is only one sheet", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='delete'")).toBeNull();
  });

  test("Can open the list of sheets", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-list-sheets", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
  });

  test("Can open the list of sheets", async () => {
    const model = new Model();
    const parent = new Parent(model);
    const sheet = model.getters.getActiveSheet();
    model.dispatch("CREATE_SHEET", { id: "42" });
    await parent.mount(fixture);
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-list-sheets", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    const sheets = fixture.querySelectorAll(".o-menu-item");
    expect(sheets.length).toBe(2);
    expect((sheets[0] as HTMLElement).dataset.name).toBe(sheet);
    expect((sheets[1] as HTMLElement).dataset.name).toBe("42");
  });

  test("Can activate a sheet from the list of sheets", async () => {
    const model = new Model();
    const parent = new Parent(model);
    const sheet = model.getters.getActiveSheet();
    model.dispatch("CREATE_SHEET", { id: "42" });
    await parent.mount(fixture);
    triggerMouseEvent(".o-list-sheets", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='42'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("ACTIVATE_SHEET", { from: sheet, to: "42" });
  });
});
