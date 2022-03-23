import { App, Component, onMounted, onWillUnmount, useSubEnv, xml } from "@odoo/owl";
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

let fixture: HTMLElement;

class Parent extends Component<any, any> {
  static template = xml/* xml */ `
    <div class="o-spreadsheet">
      <BottomBar onClick="()=>{}" model="props.model"/>
    </div>
  `;
  static components = { BottomBar };

  setup() {
    this.props.model.dispatch = jest.fn(() => CommandResult.Success as CommandResult);
    useSubEnv({
      openSidePanel: (panel: string) => {},
      model: this.props.model,
      _t: (s: string) => s,
      askConfirmation: jest.fn(),
    });
    onMounted(() => this.props.model.on("update", this, this.render));
    onWillUnmount(() => this.props.model.off("update", this));
  }
  getSubEnv() {
    return this.__owl__.childEnv;
  }
}

async function mountTopBar(model: Model = new Model()): Promise<{ parent: Parent; app: App }> {
  const app = new App(Parent, { props: { model } });
  const parent = await app.mount(fixture);
  return { app, parent };
}

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("BottomBar component", () => {
  test("simple rendering", async () => {
    const { app } = await mountTopBar();

    expect(fixture.querySelector(".o-spreadsheet-bottom-bar")).toMatchSnapshot();
    app.destroy();
  });

  test("Can create a new sheet", async () => {
    const model = new Model();
    const { app } = await mountTopBar(model);

    mockUuidV4To(model, 42);
    triggerMouseEvent(".o-add-sheet", "click");
    const activeSheetId = model.getters.getActiveSheetId();
    expect(model.dispatch).toHaveBeenNthCalledWith(1, "CREATE_SHEET", {
      name: "Sheet2",
      sheetId: "42",
      position: 1,
    });
    expect(model.dispatch).toHaveBeenNthCalledWith(2, "ACTIVATE_SHEET", {
      sheetIdTo: "42",
      sheetIdFrom: activeSheetId,
    });
    app.destroy();
  });

  test("create a second sheet while the first one is called Sheet2", async () => {
    const model = new Model({ sheets: [{ name: "Sheet2" }] });
    const { app } = await mountTopBar(model);
    expect(model.getters.getSheets().map((sheet) => sheet.name)).toEqual(["Sheet2"]);
    triggerMouseEvent(".o-add-sheet", "click");
    expect(model.dispatch).toHaveBeenNthCalledWith(1, "CREATE_SHEET", {
      sheetId: expect.any(String),
      name: "Sheet1",
      position: 1,
    });
    app.destroy();
  });

  test("Can activate a sheet", async () => {
    const { app, parent } = await mountTopBar();

    triggerMouseEvent(".o-sheet", "click");
    const sheetIdFrom = parent.props.model.getters.getActiveSheetId();
    const sheetIdTo = sheetIdFrom;
    expect(parent.props.model.dispatch).toHaveBeenCalledWith("ACTIVATE_SHEET", {
      sheetIdFrom,
      sheetIdTo,
    });
    app.destroy();
  });

  test("Can open context menu of a sheet", async () => {
    const { app } = await mountTopBar();

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    app.destroy();
  });

  test("Can open context menu of a sheet with the arrow", async () => {
    const { app } = await mountTopBar();

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    app.destroy();
  });

  test("Click on the arrow when the context menu is open should close it", async () => {
    const { app } = await mountTopBar();

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    app.destroy();
  });

  test("Can move right a sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const { app } = await mountTopBar(model);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='move_right'", "click");
    expect(model.dispatch).toHaveBeenCalledWith("MOVE_SHEET", {
      sheetId,
      direction: "right",
    });
    app.destroy();
  });

  test("Can move left a sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    const { app } = await mountTopBar(model);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='move_left'", "click");
    expect(model.dispatch).toHaveBeenCalledWith("MOVE_SHEET", {
      sheetId,
      direction: "left",
    });
    app.destroy();
  });

  test("Move right and left are not visible when it's not possible to move", async () => {
    const model = new Model();
    const { app } = await mountTopBar(model);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='move_left'")).toBeNull();
    expect(fixture.querySelector(".o-menu-item[data-name='move_right'")).toBeNull();
    app.destroy();
  });

  test("Can rename a sheet", async () => {
    const model = new Model();
    class Parent extends Component<any, any> {
      static template = xml/* xml */ `
        <div class="o-spreadsheet">
          <BottomBar onClick="()=>{}" model="props.model"/>
        </div>
  `;
      static components = { BottomBar };

      setup() {
        useSubEnv({
          openSidePanel: (panel: string) => {},
          model: this.props.model,
          _t: (s: string) => s,
          askConfirmation: jest.fn(),
          editText: jest.fn((title, callback, options) => callback("new_name")),
        });
        onMounted(() => this.props.model.on("update", this, this.render));
        onWillUnmount(() => this.props.model.off("update", this));
      }
      getSubEnv() {
        return this.__owl__.childEnv;
      }
    }

    const app = new App(Parent, { props: { model } });
    await app.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='rename'", "click");
    expect(model.getters.getActiveSheet().name).toEqual("new_name");
    app.destroy();
  });

  test("Can rename a sheet with dblclick", async () => {
    const model = new Model();

    class Parent extends Component<any, any> {
      static template = xml/* xml */ `
        <div class="o-spreadsheet">
          <BottomBar onClick="()=>{}" model="props.model"/>
        </div>
  `;
      static components = { BottomBar };

      setup() {
        useSubEnv({
          openSidePanel: (panel: string) => {},
          model: this.props.model,
          _t: (s: string) => s,
          askConfirmation: jest.fn(),
          editText: jest.fn((title, callback, options) => callback("new_name")),
        });
        onMounted(() => this.props.model.on("update", this, this.render));
        onWillUnmount(() => this.props.model.off("update", this));
      }
      getSubEnv() {
        return this.__owl__.childEnv;
      }
    }

    const app = new App(Parent, { props: { model } });
    await app.mount(fixture);

    triggerMouseEvent(".o-sheet-name", "dblclick");
    await nextTick();
    expect(model.getters.getActiveSheet().name).toEqual("new_name");
    app.destroy();
  });

  test("Can duplicate a sheet", async () => {
    const model = new Model();
    const { app } = await mountTopBar(model);
    mockUuidV4To(model, 123);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='duplicate'", "click");
    expect(model.dispatch).toHaveBeenCalledWith("DUPLICATE_SHEET", {
      sheetId: sheet,
      sheetIdTo: "123",
    });
    app.destroy();
  });

  test("Can delete a sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });

    class Parent extends Component<any, any> {
      static template = xml/* xml */ `
        <div class="o-spreadsheet">
          <BottomBar onClick="()=>{}" model="props.model"/>
        </div>
  `;
      static components = { BottomBar };

      setup() {
        this.props.model.dispatch = jest.fn(() => CommandResult.Success as CommandResult);
        useSubEnv({
          openSidePanel: (panel: string) => {},
          model: this.props.model,
          _t: (s: string) => s,
          askConfirmation: jest.fn((title, callback) => callback()),
        });
        onMounted(() => this.props.model.on("update", this, this.render));
        onWillUnmount(() => this.props.model.off("update", this));
      }
      getSubEnv() {
        return this.__owl__.childEnv;
      }
    }

    const app = new App(Parent, { props: { model } });
    await app.mount(fixture);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='delete'", "click");
    expect(model.dispatch).toHaveBeenCalledWith("DELETE_SHEET", { sheetId });
    app.destroy();
  });

  test("Delete sheet is not visible when there is only one sheet", async () => {
    const model = new Model();
    const { app } = await mountTopBar(model);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='delete'")).toBeNull();
    app.destroy();
  });

  test("Can open the list of sheets", async () => {
    const { app } = await mountTopBar();

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-list-sheets", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    app.destroy();
  });

  test("Can open the list of sheets", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    const { app } = await mountTopBar(model);
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-list-sheets", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    const sheets = fixture.querySelectorAll(".o-menu-item");
    expect(sheets.length).toBe(2);
    expect((sheets[0] as HTMLElement).dataset.name).toBe(sheet);
    expect((sheets[1] as HTMLElement).dataset.name).toBe("42");
    app.destroy();
  });

  test("Can activate a sheet from the list of sheets", async () => {
    const model = new Model();
    const sheet = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    const { app } = await mountTopBar(model);
    triggerMouseEvent(".o-list-sheets", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='42'", "click");
    expect(model.dispatch).toHaveBeenCalledWith("ACTIVATE_SHEET", {
      sheetIdFrom: sheet,
      sheetIdTo: "42",
    });
    app.destroy();
  });

  test("Display the statistic button only if no-empty cells are selected", async () => {
    const model = new Model();
    const nonMockedDispatch = model.dispatch;
    const { app } = await mountTopBar(model);
    model.dispatch = nonMockedDispatch;
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
    app.destroy();
  });

  test("Display empty information if the statistic function doesn't handle the types of the selected cells", async () => {
    const model = new Model();
    const nonMockedDispatch = model.dispatch;
    await mountTopBar(model);
    model.dispatch = nonMockedDispatch;
    setCellContent(model, "A2", "I am not a number");

    selectCell(model, "A2");
    await nextTick();
    expect(fixture.querySelector(".o-selection-statistic")?.textContent).toBe("Sum: __");
  });

  test("Can open the list of statistics", async () => {
    const model = new Model();
    const nonMockedDispatch = model.dispatch;
    const { app } = await mountTopBar(model);
    model.dispatch = nonMockedDispatch;
    setCellContent(model, "A2", "24");

    selectCell(model, "A2");
    await nextTick();
    triggerMouseEvent(".o-selection-statistic", "click");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toMatchSnapshot();
    app.destroy();
  });

  test("Can activate a statistic from the list of statistics", async () => {
    const model = new Model();
    const nonMockedDispatch = model.dispatch;
    const { app } = await mountTopBar(model);
    model.dispatch = nonMockedDispatch;
    setCellContent(model, "A2", "24");

    selectCell(model, "A2");
    await nextTick();
    expect(fixture.querySelector(".o-selection-statistic")?.textContent).toBe("Sum: 24");

    triggerMouseEvent(".o-selection-statistic", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='Count Numbers'", "click");
    await nextTick();
    expect(fixture.querySelector(".o-selection-statistic")?.textContent).toBe("Count Numbers: 1");
    app.destroy();
  });
});
