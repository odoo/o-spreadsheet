import * as owl from "@odoo/owl";
import { BottomBar } from "../../src/components/bottom_bar";
import { Menus, OpenMenuEvent } from "../../src/components/spreadsheet";
import { Model } from "../../src/model";
import { CommandResult } from "../../src/types";
import { triggerMouseEvent } from "../dom_helper";
import { makeTestFixture, mockUuidV4To, nextTick, SpreadSheetParent } from "../helpers";
import { simulateContextMenu } from "./context_menu_test";
const { Component, useState, hooks, tags } = owl;
const { useExternalListener } = owl.hooks;
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

const { xml } = tags;
const { useSubEnv } = hooks;

let fixture: HTMLElement;
let model: Model;
let parent: Parent | SpreadSheetParent;
class Parent extends Component<any, any> {
  static template = xml`
  <div class="parent" t-on-open-menu="openMenu">
    <BottomBar menuIsOpen="menu.isOpen==='bottomBarMenu'"/>
  </div>`;

  static components = { BottomBar };
  model: Model;
  menu = useState({ isOpen: "" } as {
    isOpen: "" | Menus;
  });
  constructor(model: Model) {
    super();
    useSubEnv({
      openSidePanel: (panel: string) => {},
      dispatch: jest.fn(() => ({ status: "SUCCESS" } as CommandResult)),
      getters: model.getters,
      _t: (s: string) => s,
      askConfirmation: jest.fn(),
    });
    useExternalListener(window as any, "click", this.onClick);
    this.model = model;
  }
  mounted() {
    this.model.on("update", this, this.render);
  }

  willUnmount() {
    this.model.off("update", this);
  }

  openMenu(ev: OpenMenuEvent) {
    this.menu.isOpen = ev.detail.menu;
  }

  onClick() {
    this.menu.isOpen = "";
  }
}

describe("Bottombar", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    model = new Model();
    parent = new Parent(model);
    await parent.mount(fixture);
  });

  afterEach(() => {
    fixture.remove();
    parent.destroy();
  });

  test("simple rendering", async () => {
    expect(fixture.querySelector(".o-spreadsheet-bottom-bar")).toMatchSnapshot();
  });

  test("Can create a new sheet", async () => {
    mockUuidV4To(42);
    triggerMouseEvent(".o-add-sheet", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("CREATE_SHEET", {
      activate: true,
      id: "42",
    });
  });

  test("Can activate a sheet", async () => {
    triggerMouseEvent(".o-sheet", "click");
    const from = parent.model.getters.getActiveSheet();
    const to = from;
    expect(parent.env.dispatch).toHaveBeenCalledWith("ACTIVATE_SHEET", { from, to });
  });

  test("Can rename a sheet with dblclick", async () => {
    triggerMouseEvent(".o-sheet-name", "dblclick");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    expect(parent.env.dispatch).toHaveBeenCalledWith("RENAME_SHEET", {
      sheet,
      interactive: true,
    });
  });

  test("Can open context menu of a sheet", async () => {
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
  });

  test("Can open context menu of a sheet with the arrow", async () => {
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
  });

  test("Click on the arrow when the context menu is open should close it", async () => {
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
  });

  test("Can move right a sheet", async () => {
    model.dispatch("CREATE_SHEET", { id: "42" });
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    triggerMouseEvent(".o-menu-item[data-name='move_right'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("MOVE_SHEET", { sheet, direction: "right" });
  });

  test("Can move left a sheet", async () => {
    model.dispatch("CREATE_SHEET", { id: "42", activate: true });
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    triggerMouseEvent(".o-menu-item[data-name='move_left'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("MOVE_SHEET", { sheet, direction: "left" });
  });

  test("Move right and left are not visible when it's not possible to move", async () => {
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='move_left'")).toBeNull();
    expect(fixture.querySelector(".o-menu-item[data-name='move_right'")).toBeNull();
  });

  test("Can rename a sheet", async () => {
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    triggerMouseEvent(".o-menu-item[data-name='rename'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("RENAME_SHEET", {
      sheet,
      interactive: true,
    });
  });

  test("Can duplicate a sheet", async () => {
    mockUuidV4To(123);
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    const name = `Copy of ${model.getters.getSheets()[0].name}`;
    triggerMouseEvent(".o-menu-item[data-name='duplicate'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("DUPLICATE_SHEET", {
      sheet,
      id: "123",
      name,
    });
  });

  test("Can delete a sheet", async () => {
    model.dispatch("CREATE_SHEET", { id: "42" });
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheet();
    triggerMouseEvent(".o-menu-item[data-name='delete'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("DELETE_SHEET_CONFIRMATION", { sheet });
  });

  test("Delete sheet is not visible when there is only one sheet", async () => {
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='delete'")).toBeNull();
  });

  test("Can open the list of sheets", async () => {
    const sheet = model.getters.getActiveSheet();
    model.dispatch("CREATE_SHEET", { id: "42" });
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
    const sheet = model.getters.getActiveSheet();
    model.dispatch("CREATE_SHEET", { id: "42" });
    triggerMouseEvent(".o-list-sheets", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='42'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("ACTIVATE_SHEET", { from: sheet, to: "42" });
  });
});

describe("Spreadsheet menu interactions", () => {
  beforeEach(async () => {
    fixture = makeTestFixture();
    model = new Model();
    parent = new SpreadSheetParent(model);
    await parent.mount(fixture);
  });

  afterEach(() => {
    fixture.remove();
    parent.destroy();
  });
  test("opening topbar tool menu closes bottom bar menu", async () => {
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
    triggerMouseEvent(".o-sheet", "contextmenu"); //opens bottombarMenu
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
    fixture.querySelector('span[title="Borders"]')!.dispatchEvent(new Event("click")); //opens topbar tool menu
    await nextTick();
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
  });

  test("opening topbar context menu closes bottom bar menu", async () => {
    expect(fixture.querySelectorAll(".o-spreadsheet-bottom-bar .o-menu")).toHaveLength(0);
    expect(fixture.querySelectorAll(".o-topbar-topleft .o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet", "contextmenu"); //opens bottombarMenu
    await nextTick();
    expect(fixture.querySelectorAll(".o-spreadsheet-bottom-bar .o-menu")).toHaveLength(1);
    expect(fixture.querySelectorAll(".o-topbar-topleft .o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-topbar-menu[data-id='file']", "click"); //opens topbar context menu
    await nextTick();
    expect(fixture.querySelectorAll(".o-spreadsheet-bottom-bar .o-menu")).toHaveLength(0);
    expect(fixture.querySelectorAll(".o-topbar-topleft .o-menu")).toHaveLength(1);
  });

  test("opening grid context menu closes bottom bar menu", async () => {
    expect(fixture.querySelectorAll(".o-spreadsheet-bottom-bar .o-menu")).toHaveLength(0);
    expect(fixture.querySelectorAll(".o-grid-context-menu .o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet", "contextmenu"); //opens bottombarMenu
    await nextTick();
    expect(fixture.querySelectorAll(".o-spreadsheet-bottom-bar .o-menu")).toHaveLength(1);
    expect(fixture.querySelectorAll(".o-grid-context-menu .o-menu")).toHaveLength(0);
    simulateContextMenu(300, 200); //grid context menu
    await nextTick();
    expect(fixture.querySelectorAll(".o-spreadsheet-bottom-bar .o-menu")).toHaveLength(0);
    expect(fixture.querySelectorAll(".o-grid-context-menu .o-menu")).toHaveLength(1);
  });
});
