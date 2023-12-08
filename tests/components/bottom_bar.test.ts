import { Component, onMounted, onWillUnmount, xml } from "@odoo/owl";
import { BottomBar } from "../../src/components/bottom_bar/bottom_bar";
import { interactiveRenameSheet } from "../../src/helpers/ui/sheet_interactive";
import { Model } from "../../src/model";
import { EditTextOptions, SpreadsheetChildEnv } from "../../src/types";
import {
  createSheet,
  hideSheet,
  selectCell,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { triggerMouseEvent } from "../test_helpers/dom_helper";
import {
  makeInteractiveTestEnv,
  mockUuidV4To,
  mountComponent,
  nextTick,
} from "../test_helpers/helpers";
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
    onMounted(() => this.props.model.on("update", this, this.render));
    onWillUnmount(() => this.props.model.off("update", this));
  }
  getSubEnv() {
    return this.__owl__.childEnv;
  }
}

async function mountBottomBar(
  model: Model = new Model(),
  env: Partial<SpreadsheetChildEnv> = {}
): Promise<{ parent: Parent; model: Model }> {
  let parent: Component;
  ({ fixture, parent } = await mountComponent(Parent, { model, env, props: { model } }));
  return { parent: parent as Parent, model };
}

describe("BottomBar component", () => {
  test("simple rendering", async () => {
    await mountBottomBar();

    expect(fixture.querySelector(".o-spreadsheet-bottom-bar")).toMatchSnapshot();
  });

  test("Can create a new sheet", async () => {
    const { model } = await mountBottomBar();
    const dispatch = jest.spyOn(model, "dispatch");
    mockUuidV4To(model, 42);
    const activeSheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-add-sheet", "click");
    expect(dispatch).toHaveBeenNthCalledWith(1, "CREATE_SHEET", {
      name: "Sheet2",
      sheetId: "42",
      position: 1,
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, "ACTIVATE_SHEET", {
      sheetIdTo: "42",
      sheetIdFrom: activeSheetId,
    });
  });

  test("create a second sheet while the first one is called Sheet2", async () => {
    const model = new Model({ sheets: [{ name: "Sheet2" }] });
    await mountBottomBar(model);
    const dispatch = jest.spyOn(model, "dispatch");
    expect(model.getters.getSheetIds().map(model.getters.getSheetName)).toEqual(["Sheet2"]);
    triggerMouseEvent(".o-add-sheet", "click");
    expect(dispatch).toHaveBeenNthCalledWith(1, "CREATE_SHEET", {
      sheetId: expect.any(String),
      name: "Sheet1",
      position: 1,
    });
  });

  test("Can activate a sheet", async () => {
    const { model } = await mountBottomBar();
    const dispatch = jest.spyOn(model, "dispatch");
    triggerMouseEvent(".o-sheet", "click");
    const sheetIdFrom = model.getters.getActiveSheetId();
    const sheetIdTo = sheetIdFrom;
    expect(dispatch).toHaveBeenCalledWith("ACTIVATE_SHEET", {
      sheetIdFrom,
      sheetIdTo,
    });
  });

  test("Can open context menu of a sheet", async () => {
    await mountBottomBar();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
  });

  test("Can open context menu of a sheet with the arrow", async () => {
    await mountBottomBar();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
  });

  test("Click on the arrow when the context menu is open should close it", async () => {
    await mountBottomBar();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
  });

  test("Can open context menu of a sheet with the arrow if another menu is already open", async () => {
    await mountBottomBar();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-item.o-list-sheets", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    expect(fixture.querySelector(".o-menu-item")!.textContent).toEqual("Sheet1");

    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    expect(fixture.querySelector(".o-menu-item")!.textContent).toEqual("Duplicate");
  });

  test("Can open list of sheet menu if another menu is already open", async () => {
    await mountBottomBar();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    expect(fixture.querySelector(".o-menu-item")!.textContent).toEqual("Duplicate");

    triggerMouseEvent(".o-sheet-item.o-list-sheets", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    expect(fixture.querySelector(".o-menu-item")!.textContent).toEqual("Sheet1");
  });

  test("Can move right a sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    await mountBottomBar(model);
    const dispatch = jest.spyOn(model, "dispatch");

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='move_right'", "click");
    expect(dispatch).toHaveBeenCalledWith("MOVE_SHEET", {
      sheetId,
      direction: "right",
    });
  });

  test("Can move left a sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42", activate: true });
    await mountBottomBar(model);
    const dispatch = jest.spyOn(model, "dispatch");

    const target = fixture.querySelectorAll(".o-sheet")[1]!;
    triggerMouseEvent(target, "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='move_left'", "click");
    expect(dispatch).toHaveBeenCalledWith("MOVE_SHEET", {
      sheetId,
      direction: "left",
    });
  });

  test("Can hide a sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    await mountBottomBar(model);
    const dispatch = jest.spyOn(model, "dispatch");

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='hide_sheet'", "click");
    expect(dispatch).toHaveBeenCalledWith("HIDE_SHEET", {
      sheetId,
    });
  });

  test("Hide sheet menu is not visible if there's only one visible sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    hideSheet(model, "42");
    await mountBottomBar(model);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).not.toBeNull();
    expect(fixture.querySelector(".o-menu-item[data-name='hide_sheet']")).toBeNull();
  });

  test("Move right and left are not visible when it's not possible to move", async () => {
    await mountBottomBar();

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='move_left'")).toBeNull();
    expect(fixture.querySelector(".o-menu-item[data-name='move_right'")).toBeNull();
  });

  test("Can rename a sheet", async () => {
    const { model } = await mountBottomBar(new Model(), {
      editText: jest.fn((title, callback, options) => {
        callback("new_name");
      }),
    });

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='rename'", "click");
    expect(model.getters.getActiveSheet().name).toEqual("new_name");
  });

  test("Can rename a sheet with dblclick", async () => {
    const { model } = await mountBottomBar(new Model(), {
      editText: jest.fn((title, callback, options) => {
        callback("new_name");
      }),
    });

    triggerMouseEvent(".o-sheet-name", "dblclick");
    await nextTick();
    expect(model.getters.getActiveSheet().name).toEqual("new_name");
  });

  test("Can't rename a sheet with dblclick in readonly mode", async () => {
    const titleTextSpy = jest.fn();
    const editText = (
      title: string,
      callback: (text: string | null) => any,
      options?: EditTextOptions
    ) => {
      titleTextSpy(title.toString());
      callback("new_name");
    };

    const model = new Model({}, { mode: "readonly" });
    const env = makeInteractiveTestEnv(model, { editText });
    interactiveRenameSheet(env, model.getters.getActiveSheetId());

    expect(titleTextSpy).not.toHaveBeenCalled();
    expect(model.getters.getActiveSheet().name).toEqual("Sheet1");
  });

  test("Can duplicate a sheet", async () => {
    const { model } = await mountBottomBar();
    const dispatch = jest.spyOn(model, "dispatch");
    mockUuidV4To(model, 123);

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheet = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='duplicate'", "click");
    expect(dispatch).toHaveBeenCalledWith("DUPLICATE_SHEET", {
      sheetId: sheet,
      sheetIdTo: "123",
    });
  });

  test("Can delete a sheet", async () => {
    const { model } = await mountBottomBar(new Model(), {
      askConfirmation: jest.fn((title, callback) => callback()),
    });
    const dispatch = jest.spyOn(model, "dispatch");
    createSheet(model, { sheetId: "42" });

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='delete'", "click");
    expect(dispatch).toHaveBeenCalledWith("DELETE_SHEET", { sheetId });
  });

  test("Delete sheet is not visible when there is only one sheet", async () => {
    await mountBottomBar();

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='delete'")).toBeNull();
  });

  test("Can open the list of sheets", async () => {
    await mountBottomBar();

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-list-sheets", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
  });

  test("Can open the list of sheets", async () => {
    const { model } = await mountBottomBar();
    const sheet = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });

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
    const { model } = await mountBottomBar();
    const dispatch = jest.spyOn(model, "dispatch");
    const sheet = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42" });
    triggerMouseEvent(".o-list-sheets", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='42'", "click");
    expect(dispatch).toHaveBeenCalledWith("ACTIVATE_SHEET", {
      sheetIdFrom: sheet,
      sheetIdTo: "42",
    });
  });

  test("Display the statistic button only if no-empty cells are selected", async () => {
    const { model } = await mountBottomBar();
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
    expect(fixture.querySelector(".o-selection-statistic")?.textContent).toBe("Sum: 0");
  });

  test("Display empty information if the statistic function doesn't handle the types of the selected cells", async () => {
    const { model } = await mountBottomBar();
    setCellContent(model, "A2", "I am not a number");

    selectCell(model, "A2");
    await nextTick();
    expect(fixture.querySelector(".o-selection-statistic")?.textContent).toBe("Sum: __");
  });

  test("Can open the list of statistics", async () => {
    const { model } = await mountBottomBar();
    setCellContent(model, "A2", "24");

    selectCell(model, "A2");
    await nextTick();
    triggerMouseEvent(".o-selection-statistic", "click");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toMatchSnapshot();
  });

  test("Can open the list of statistics if another menu is already open", async () => {
    const model = new Model();
    const nonMockedDispatch = model.dispatch;
    await mountBottomBar(model);
    model.dispatch = nonMockedDispatch;
    setCellContent(model, "A2", "24");
    selectCell(model, "A2");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item")!.textContent).toEqual("Duplicate");

    triggerMouseEvent(".o-selection-statistic", "click");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item")!.textContent).toEqual("Sum: 24");
  });

  test("Can activate a statistic from the list of statistics", async () => {
    const { model } = await mountBottomBar();
    setCellContent(model, "A2", "24");

    selectCell(model, "A2");
    await nextTick();
    expect(fixture.querySelector(".o-selection-statistic")?.textContent).toBe("Sum: 24");

    triggerMouseEvent(".o-selection-statistic", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='Count Numbers'", "click");
    await nextTick();
    expect(fixture.querySelector(".o-selection-statistic")?.textContent).toBe("Count Numbers: 1");
  });
});
