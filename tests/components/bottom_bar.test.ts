import { App, Component, onMounted, onWillUnmount, xml } from "@odoo/owl";
import { BottomBar } from "../../src/components/bottom_bar/bottom_bar";
import { MenuContainer } from "../../src/components/menu_container/menu_container";
import { Model } from "../../src/model";
import { SpreadsheetChildEnv } from "../../src/types";
import { OWL_TEMPLATES } from "../setup/jest.setup";
import {
  activateSheet,
  createSheet,
  hideSheet,
  selectCell,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { keyDown, simulateClick, triggerMouseEvent } from "../test_helpers/dom_helper";
import { makeTestEnv, makeTestFixture, mockUuidV4To, nextTick } from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

let fixture: HTMLElement;

class Parent extends Component<any, any> {
  static template = xml/* xml */ `
    <div class="o-spreadsheet">
      <BottomBar onClick="()=>{}"/>
      <MenuContainer/>
    </div>
  `;
  static components = { BottomBar, MenuContainer };

  setup() {
    onMounted(() => this.props.model.on("update", this, () => this.render(true)));
    onWillUnmount(() => this.props.model.off("update", this));
  }
  getSubEnv() {
    return this.__owl__.childEnv;
  }
}

async function mountBottomBar(
  model: Model = new Model(),
  env: Partial<SpreadsheetChildEnv> = {}
): Promise<{ parent: Parent; app: App; model: Model }> {
  const mockEnv = makeTestEnv({ ...env, model });
  const app = new App(Parent, { props: { model }, env: mockEnv });
  app.addTemplates(OWL_TEMPLATES);
  const parent = await app.mount(fixture);
  return { app, parent, model: parent.props.model };
}

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("BottomBar component", () => {
  test("simple rendering", async () => {
    const { app } = await mountBottomBar();

    expect(fixture.querySelector(".o-spreadsheet-bottom-bar")).toMatchSnapshot();
    app.destroy();
  });

  test("Can create a new sheet", async () => {
    const { app, model } = await mountBottomBar();

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
    app.destroy();
  });

  test("create a second sheet while the first one is called Sheet2", async () => {
    const model = new Model({ sheets: [{ name: "Sheet2" }] });
    const { app } = await mountBottomBar(model);
    const dispatch = jest.spyOn(model, "dispatch");
    expect(model.getters.getSheetIds().map(model.getters.getSheetName)).toEqual(["Sheet2"]);
    triggerMouseEvent(".o-add-sheet", "click");
    expect(dispatch).toHaveBeenNthCalledWith(1, "CREATE_SHEET", {
      sheetId: expect.any(String),
      name: "Sheet1",
      position: 1,
    });
    app.destroy();
  });

  test("Can activate a sheet", async () => {
    const { app, parent } = await mountBottomBar();
    const dispatch = jest.spyOn(parent.props.model, "dispatch");
    triggerMouseEvent(".o-sheet", "click");
    const sheetIdFrom = parent.props.model.getters.getActiveSheetId();
    const sheetIdTo = sheetIdFrom;
    expect(dispatch).toHaveBeenCalledWith("ACTIVATE_SHEET", {
      sheetIdFrom,
      sheetIdTo,
    });
    app.destroy();
  });

  test("Can open context menu of a sheet", async () => {
    const { app } = await mountBottomBar();

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    app.destroy();
  });

  test("Can open context menu of a sheet with the arrow", async () => {
    const { app } = await mountBottomBar();

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    app.destroy();
  });

  test("Click on the arrow when the context menu is open should close it", async () => {
    const { app } = await mountBottomBar();

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    app.destroy();
  });

  test("Can open context menu of a sheet with the arrow if another menu is already open", async () => {
    const { app } = await mountBottomBar();

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);

    triggerMouseEvent(".o-sheet-item.o-list-sheets", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    expect(fixture.querySelector(".o-menu-item")!.textContent).toEqual("Sheet1");

    triggerMouseEvent(".o-sheet-icon", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    expect(fixture.querySelector(".o-menu-item")!.textContent).toEqual("Duplicate");
    app.destroy();
  });

  test("Can move right a sheet", async () => {
    const { app, model } = await mountBottomBar();
    const dispatch = jest.spyOn(model, "dispatch");
    createSheet(model, { sheetId: "42" });
    await nextTick();
    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='move_right'", "click");
    expect(dispatch).toHaveBeenCalledWith("MOVE_SHEET", {
      sheetId,
      direction: "right",
    });
    app.destroy();
  });

  test("Can move left a sheet", async () => {
    const { app, model } = await mountBottomBar();
    const dispatch = jest.spyOn(model, "dispatch");
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");
    await nextTick();
    triggerMouseEvent(".o-sheet[data-id='42']", "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='move_left'", "click");
    expect(dispatch).toHaveBeenCalledWith("MOVE_SHEET", {
      sheetId,
      direction: "left",
    });
    app.destroy();
  });

  test("Can hide a sheet", async () => {
    const { app, model } = await mountBottomBar();
    const dispatch = jest.spyOn(model, "dispatch");
    createSheet(model, { sheetId: "42" });
    activateSheet(model, "42");

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='hide_sheet']", "click");
    expect(dispatch).toHaveBeenCalledWith("HIDE_SHEET", {
      sheetId,
    });
    app.destroy();
  });

  test("Hide sheet menu is not visible if there's only one visible sheet", async () => {
    const { app, model } = await mountBottomBar();
    createSheet(model, { sheetId: "42" });
    hideSheet(model, "42");

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).not.toBeNull();
    expect(fixture.querySelector(".o-menu-item[data-name='hide_sheet']")).toBeNull();
    app.destroy();
  });

  test("Move right and left are not visible when it's not possible to move", async () => {
    const { app } = await mountBottomBar();

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='move_left'")).toBeNull();
    expect(fixture.querySelector(".o-menu-item[data-name='move_right'")).toBeNull();
    app.destroy();
  });

  describe("Rename a sheet", () => {
    let app: App;
    let model: Model;
    let raiseError: jest.Mock;
    beforeEach(async () => {
      raiseError = jest.fn((string, callback) => {
        callback();
      });
      ({ app, model } = await mountBottomBar(new Model(), { raiseError }));
      model;
    });

    afterEach(() => {
      app.destroy();
    });

    test("Double click on the sheet name make it editable and give it the focus", async () => {
      const sheetName = fixture.querySelector<HTMLElement>(".o-sheet-name")!;
      expect(sheetName.getAttribute("contenteditable")).toEqual("false");
      triggerMouseEvent(sheetName, "dblclick");
      await nextTick();
      expect(sheetName.getAttribute("contenteditable")).toEqual("true");
      expect(document.activeElement).toEqual(sheetName);
    });

    test("Rename sheet with context menu makes sheet name editable and give it the focus", async () => {
      triggerMouseEvent(".o-sheet", "contextmenu");
      await nextTick();
      triggerMouseEvent(".o-menu-item[data-name='rename'", "click");
      await nextTick();
      const sheetName = fixture.querySelector<HTMLElement>(".o-sheet-name")!;
      expect(sheetName.getAttribute("contenteditable")).toEqual("true");
      expect(document.activeElement).toEqual(sheetName);
    });

    test("The whole sheet name is in the selection after starting the edition", async () => {
      const sheetName = fixture.querySelector<HTMLElement>(".o-sheet-name")!;
      triggerMouseEvent(sheetName, "dblclick");
      await nextTick();
      expect(window.getSelection()?.toString()).toEqual("Sheet1");
    });

    test("Pressing enter confirm the change in sheet name", async () => {
      const sheetName = fixture.querySelector<HTMLElement>(".o-sheet-name")!;
      triggerMouseEvent(sheetName, "dblclick");
      await nextTick();
      sheetName.textContent = "New name";
      await keyDown("Enter");
      expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toEqual("New name");
    });

    test("Losing focus confirms the change in sheet name", async () => {
      const sheetName = fixture.querySelector<HTMLElement>(".o-sheet-name")!;
      triggerMouseEvent(sheetName, "dblclick");
      await nextTick();
      sheetName.textContent = "New name";
      sheetName.blur();
      expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toEqual("New name");
    });

    test("Pressing escape cancels the change in sheet name", async () => {
      const sheetName = fixture.querySelector<HTMLElement>(".o-sheet-name")!;
      triggerMouseEvent(sheetName, "dblclick");
      await nextTick();
      sheetName.textContent = "New name";
      await keyDown("Escape");
      expect(sheetName.textContent).toEqual("Sheet1");
      expect(model.getters.getSheetName(model.getters.getActiveSheetId())).toEqual("Sheet1");
    });

    test("Renaming sheet is interactive", async () => {
      const sheetName = fixture.querySelector<HTMLElement>(".o-sheet-name")!;
      triggerMouseEvent(sheetName, "dblclick");
      await nextTick();
      sheetName.textContent = "";
      await keyDown("Enter");
      expect(raiseError).toHaveBeenCalled();
    });

    test("After an error was raised at the confirmation of the new sheet name, the sheet name is selected and focused ", async () => {
      createSheet(model, { name: "ThisIsASheet" });
      const sheetName = fixture.querySelector<HTMLElement>(".o-sheet-name")!;
      triggerMouseEvent(sheetName, "dblclick");
      await nextTick();
      sheetName.textContent = "ThisIsASheet";
      expect(window.getSelection()?.toString()).toEqual("");
      await keyDown("Enter");
      expect(raiseError).toHaveBeenCalled();
      expect(window.getSelection()?.toString()).toEqual("ThisIsASheet");
      expect(document.activeElement).toEqual(sheetName);
    });
  });

  test("Can duplicate a sheet", async () => {
    const { app, model } = await mountBottomBar();
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
    app.destroy();
  });

  test("Can delete a sheet", async () => {
    const { app, model } = await mountBottomBar(new Model(), {
      askConfirmation: jest.fn((title, callback) => callback()),
    });
    const dispatch = jest.spyOn(model, "dispatch");
    createSheet(model, { sheetId: "42" });

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    triggerMouseEvent(".o-menu-item[data-name='delete'", "click");
    expect(dispatch).toHaveBeenCalledWith("DELETE_SHEET", { sheetId });
    app.destroy();
  });

  test("Delete sheet is not visible when there is only one sheet", async () => {
    const { app } = await mountBottomBar();

    triggerMouseEvent(".o-sheet", "contextmenu");
    await nextTick();
    expect(fixture.querySelector(".o-menu-item[data-name='delete'")).toBeNull();
    app.destroy();
  });

  test("Can open the list of sheets", async () => {
    const { app } = await mountBottomBar();

    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    triggerMouseEvent(".o-list-sheets", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    app.destroy();
  });

  test("Can open the list of sheets", async () => {
    const { app, model } = await mountBottomBar();
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
    app.destroy();
  });

  test("Can activate a sheet from the list of sheets", async () => {
    const { app, model } = await mountBottomBar();
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
    app.destroy();
  });

  describe("Scroll on the list of sheets", () => {
    let model: Model;
    let app: App;
    let parent: Parent;
    let sheetListEl: HTMLElement;

    jest
      .spyOn(Element.prototype, "clientWidth", "get")
      .mockImplementation(function (this: HTMLDivElement) {
        if (this.classList.contains("o-sheet-list")) return 300;
        return 0;
      });

    beforeEach(async () => {
      model = new Model({
        sheets: [
          { name: "Sheet1" },
          { name: "Sheet2" },
          { name: "Sheet3" },
          { name: "Sheet4" },
          { name: "Sheet5" },
          { name: "Sheet6" },
        ],
      });
      ({ app, parent } = await mountBottomBar(model));
      sheetListEl = fixture.querySelector<HTMLElement>(".o-sheet-list")!;
      //@ts-ignore - scrollTo is not defined in JSDOM
      sheetListEl.scrollTo = (arg: ScrollToOptions) => {
        sheetListEl.scrollLeft = arg.left!;
      };
    });

    afterEach(() => {
      parent;
      app.destroy();
    });

    test("Can scroll on the list of sheets", async () => {
      expect(sheetListEl.scrollLeft).toBe(0);
      sheetListEl.dispatchEvent(new WheelEvent("wheel", { deltaY: 100 }));
      expect(sheetListEl.scrollLeft).toBe(50);
      sheetListEl.dispatchEvent(new WheelEvent("wheel", { deltaY: -100 }));
      expect(sheetListEl.scrollLeft).toBe(0);
    });

    test("Enough space to display all the sheets: no scroll arrow nor fade effect", async () => {
      jest.spyOn(sheetListEl, "clientWidth", "get").mockReturnValue(300);
      jest.spyOn(sheetListEl, "scrollWidth", "get").mockReturnValue(300);
      await nextTick();
      expect(fixture.querySelector(".o-bottom-bar-arrow-left")).toBeNull();
      expect(fixture.querySelector(".o-bottom-bar-arrow-right")).toBeNull();
      expect(fixture.querySelector(".o-bottom-bar-fade-in")).toBeNull();
      expect(fixture.querySelector(".o-bottom-bar-fade-out")).toBeNull();
    });

    test("Can scroll to the right: scroll arrow right enabled and fade-out effect", async () => {
      jest.spyOn(sheetListEl, "clientWidth", "get").mockReturnValue(300);
      jest.spyOn(sheetListEl, "scrollWidth", "get").mockReturnValue(500);
      parent.render();
      await nextTick();

      expect(fixture.querySelector(".o-bottom-bar-arrow-left.o-disabled")).not.toBeNull();
      expect(fixture.querySelector(".o-bottom-bar-arrow-right:not(.o-disabled)")).not.toBeNull();
      expect(fixture.querySelector(".o-bottom-bar-fade-in")).toBeNull();
      expect(fixture.querySelector(".o-bottom-bar-fade-out")).not.toBeNull();
    });

    test("Can scroll to the left: scroll arrow left enabled and fade-in effect", async () => {
      jest.spyOn(sheetListEl, "clientWidth", "get").mockReturnValue(300);
      jest.spyOn(sheetListEl, "scrollWidth", "get").mockReturnValue(500);
      sheetListEl.scrollLeft = 200;
      parent.render();
      await nextTick();
      expect(fixture.querySelector(".o-bottom-bar-arrow-left:not(.o-disabled)")).not.toBeNull();
      expect(fixture.querySelector(".o-bottom-bar-arrow-right.o-disabled")).not.toBeNull();
      expect(fixture.querySelector(".o-bottom-bar-fade-in")).not.toBeNull();
      expect(fixture.querySelector(".o-bottom-bar-fade-out")).toBeNull();
    });

    test("Can scroll in both direction: scroll arrows enabled and fade effects", async () => {
      jest.spyOn(sheetListEl, "clientWidth", "get").mockReturnValue(300);
      jest.spyOn(sheetListEl, "scrollWidth", "get").mockReturnValue(500);
      sheetListEl.scrollLeft = 100;
      parent.render();
      await nextTick();
      expect(fixture.querySelector(".o-bottom-bar-arrow-left:not(.o-disabled)")).not.toBeNull();
      expect(fixture.querySelector(".o-bottom-bar-arrow-right:not(.o-disabled)")).not.toBeNull();
      expect(fixture.querySelector(".o-bottom-bar-fade-in")).not.toBeNull();
      expect(fixture.querySelector(".o-bottom-bar-fade-out")).not.toBeNull();
    });

    test("Scroll to the right with the arrow button", async () => {
      jest.spyOn(sheetListEl, "clientWidth", "get").mockReturnValue(100);
      jest.spyOn(sheetListEl, "scrollWidth", "get").mockReturnValue(250);
      parent.render();
      await nextTick();
      simulateClick(".o-bottom-bar-arrow-right");
      await nextTick();
      expect(sheetListEl.scrollLeft).toBe(100);

      simulateClick(".o-bottom-bar-arrow-right");
      await nextTick();
      expect(sheetListEl.scrollLeft).toBe(150);
    });

    test("Scroll to the left with the arrow button", async () => {
      jest.spyOn(sheetListEl, "clientWidth", "get").mockReturnValue(100);
      jest.spyOn(sheetListEl, "scrollWidth", "get").mockReturnValue(250);
      sheetListEl.scrollLeft = 150;
      parent.render();
      await nextTick();
      simulateClick(".o-bottom-bar-arrow-left");
      await nextTick();
      expect(sheetListEl.scrollLeft).toBe(50);

      simulateClick(".o-bottom-bar-arrow-left");
      await nextTick();
      expect(sheetListEl.scrollLeft).toBe(0);
    });

    test("Spam click on the arrow button scrolls a lot", async () => {
      let scrollTo = 0;
      //@ts-ignore - scrollTo is not defined in JSDOM
      sheetListEl.scrollTo = (arg: ScrollToOptions) => {
        scrollTo = arg.left!;
      };

      jest.spyOn(sheetListEl, "clientWidth", "get").mockReturnValue(100);
      jest.spyOn(sheetListEl, "scrollWidth", "get").mockReturnValue(800);
      parent.render();
      await nextTick();

      simulateClick(".o-bottom-bar-arrow-right");
      simulateClick(".o-bottom-bar-arrow-right");
      simulateClick(".o-bottom-bar-arrow-right");
      simulateClick(".o-bottom-bar-arrow-right");
      simulateClick(".o-bottom-bar-arrow-right");
      expect(scrollTo).toBe(500);

      sheetListEl.scrollLeft = 500;
      sheetListEl.dispatchEvent(new MouseEvent("scroll"));
      await nextTick();

      simulateClick(".o-bottom-bar-arrow-left");
      simulateClick(".o-bottom-bar-arrow-left");
      simulateClick(".o-bottom-bar-arrow-left");
      expect(scrollTo).toBe(200);
    });
  });

  test("Display the statistic button only if no-empty cells are selected", async () => {
    const { app, model } = await mountBottomBar();
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
    app.destroy();
  });

  test("Display empty information if the statistic function doesn't handle the types of the selected cells", async () => {
    const { model } = await mountBottomBar();
    setCellContent(model, "A2", "I am not a number");

    selectCell(model, "A2");
    await nextTick();
    expect(fixture.querySelector(".o-selection-statistic")?.textContent).toBe("Sum: __");
  });

  test("Can open the list of statistics", async () => {
    const { app, model } = await mountBottomBar();
    setCellContent(model, "A2", "24");
    selectCell(model, "A2");
    await nextTick();

    triggerMouseEvent(".o-selection-statistic", "click");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toMatchSnapshot();
    app.destroy();
  });

  test("Can activate a statistic from the list of statistics", async () => {
    const { app, model } = await mountBottomBar();
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
