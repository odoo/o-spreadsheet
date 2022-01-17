import { Component, hooks, tags } from "@odoo/owl";
import { BottomBar } from "../../src/components/bottom_bar";
import { Model } from "../../src/model";
import { CommandResult } from "../../src/types";
import {
  activateSheet,
  createSheet,
  selectCell,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { triggerMouseEvent } from "../test_helpers/dom_helper";
import { makeTestFixture, mockUuidV4To, nextTick } from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

const { xml } = tags;
const { useSubEnv, onMounted, onWillUnmount } = hooks;

let fixture: HTMLElement;

class Parent extends Component<any, any> {
  static template = xml/* xml */ `
    <div class="o-spreadsheet">
      <BottomBar onClick="()=>{}" model="model"/>
    </div>
  `;
  static components = { BottomBar };
  model: Model;
  constructor(model: Model) {
    super();
    useSubEnv({
      openSidePanel: (panel: string) => {},
      dispatch: jest.fn(() => CommandResult.Success as CommandResult),
      getters: model.getters,
      _t: (s: string) => s,
      askConfirmation: jest.fn(),
      uuidGenerator: model.uuidGenerator,
    });
    this.model = model;
  }
  setup() {
    onMounted(() => this.model.on("update", this, this.render));
    onWillUnmount(() => this.model.off("update", this));
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
    parent.destroy();
  });

  test("Can create a new sheet", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);

    mockUuidV4To(model, 42);
    triggerMouseEvent(".o-add-sheet", "click");
    const activeSheetId = parent.env.getters.getActiveSheetId();
    expect(parent.env.dispatch).toHaveBeenNthCalledWith(1, "CREATE_SHEET", {
      sheetId: "42",
      position: 1,
    });
    expect(parent.env.dispatch).toHaveBeenNthCalledWith(2, "ACTIVATE_SHEET", {
      sheetIdTo: "42",
      sheetIdFrom: activeSheetId,
    });
    parent.destroy();
  });

  test("Can activate a sheet", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "click");
    const sheetIdFrom = parent.model.getters.getActiveSheetId();
    const sheetIdTo = sheetIdFrom;
    expect(parent.env.dispatch).toHaveBeenCalledWith("ACTIVATE_SHEET", { sheetIdFrom, sheetIdTo });
    parent.destroy();
  });

  test("Can open context menu of a sheet", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    parent.destroy();
  });

  test("Can open context menu of a sheet with the arrow", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    parent.destroy();
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
    parent.destroy();
  });

  test("Can move right a sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='move_right'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("MOVE_SHEET", { sheetId, direction: "right" });
    parent.destroy();
  });

  test("Can move left a sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='move_left'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("MOVE_SHEET", { sheetId, direction: "left" });
    parent.destroy();
  });

  test("Move right and left are not visible when it's not possible to move", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='move_left'")).toBeNull();
    expect(fixture.querySelector(".o-menu-item[data-name='move_right'")).toBeNull();
    parent.destroy();
  });

  test("Can rename a sheet", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    parent.env.dispatch = model.dispatch;
    parent.env.editText = jest.fn((title, placeholder, callback) => callback("new_name"));
    triggerMouseEvent(".o-menu-item[data-name='rename'", "click");
    expect(model.getters.getActiveSheet().name).toEqual("new_name");
    parent.destroy();
  });

  test("Can rename a sheet with dblclick", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);

    parent.env.dispatch = model.dispatch;
    parent.env.editText = jest.fn((title, placeholder, callback) => callback("new_name"));
    triggerMouseEvent(".o-sheet-name", "dblclick");
    await nextTick();
    expect(model.getters.getActiveSheet().name).toEqual("new_name");
    parent.destroy();
  });

  test("Can duplicate a sheet", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);
    mockUuidV4To(model, 123);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='duplicate'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("DUPLICATE_SHEET", {
      sheetId: sheet,
      sheetIdTo: "123",
    });
    parent.destroy();
  });

  test("Can delete a sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const parent = new Parent(model);
    parent.env.askConfirmation = jest.fn((title, callback) => callback());
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='delete'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("DELETE_SHEET", { sheetId });
    parent.destroy();
  });

  test("Delete sheet is not visible when there is only one sheet", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='delete'")).toBeNull();
    parent.destroy();
  });

  test("Can open the list of sheets", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-list-sheets", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    parent.destroy();
  });

  test("Can open the list of sheets", async () => {
    const model = new Model();
    const parent = new Parent(model);
    const sheet = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    await parent.mount(fixture);
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-list-sheets", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    const sheets = fixture.querySelectorAll(".o-menu-item");
    expect(sheets.length).toBe(2);
    expect((sheets[0] as HTMLElement).dataset.name).toBe(sheet);
    expect((sheets[1] as HTMLElement).dataset.name).toBe("42");
    parent.destroy();
  });

  test("Can activate a sheet from the list of sheets", async () => {
    const model = new Model();
    const parent = new Parent(model);
    const sheet = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    await parent.mount(fixture);
    triggerMouseEvent(".o-list-sheets", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='42'", "click");
    expect(parent.env.dispatch).toHaveBeenCalledWith("ACTIVATE_SHEET", {
      sheetIdFrom: sheet,
      sheetIdTo: "42",
    });
    parent.destroy();
  });

  test("Display the statistic button only if no-empty cells are selected", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);
    setCellContent(model, "A2", "24");
    setCellContent(model, "A3", "=A1");

    selectCell(model, "A1");
    await nextTick();
    expect(fixture.querySelector(".o-selection-statistic")).toBeFalsy();

    selectCell(model, "A2");
    await nextTick();
    expect(fixture.querySelector(".o-selection-statistic")?.textContent).toBe("Sum: 24");

    selectCell(model, "A3");
    await nextTick();
    expect(fixture.querySelector(".o-selection-statistic")).toBeFalsy();
    parent.destroy();
  });

  test("Display empty information if the statistic function doesn't handle the types of the selected cells", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);
    setCellContent(model, "A2", "I am not a number");

    selectCell(model, "A2");
    await nextTick();
    expect(fixture.querySelector(".o-selection-statistic")?.textContent).toBe("Sum: __");
  });

  test("Can open the list of statistics", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);
    setCellContent(model, "A2", "24");

    selectCell(model, "A2");
    await nextTick();
    triggerMouseEvent(".o-selection-statistic", "click");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toMatchSnapshot();
    parent.destroy();
  });

  test("Can activate a statistic from the list of statistics", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);
    setCellContent(model, "A2", "24");

    selectCell(model, "A2");
    await nextTick();
    expect(fixture.querySelector(".o-selection-statistic")?.textContent).toBe("Sum: 24");

    triggerMouseEvent(".o-selection-statistic", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='Count Numbers'", "click");
    await nextTick();
    expect(fixture.querySelector(".o-selection-statistic")?.textContent).toBe("Count Numbers: 1");
    parent.destroy();
  });
});
