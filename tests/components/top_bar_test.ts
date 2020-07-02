import { Component, hooks, tags } from "@odoo/owl";
import { TopBar } from "../../src/components/top_bar";
import { Model } from "../../src/model";
import { getCell, makeTestFixture, nextTick, GridParent } from "../helpers";
import { topbarMenuRegistry } from "../../src/registries/menus/topbar_menu_registry";
import { triggerMouseEvent } from "../dom_helper";
import { DEFAULT_FONT_SIZE } from "../../src/constants";
import { ConditionalFormat } from "../../src/types";
import { _lt } from "../../src/translation";

const { xml } = tags;
const { useSubEnv } = hooks;

let fixture: HTMLElement;

topbarMenuRegistry.addChild("save", ["file"], {
  name: _lt("Save"),
  sequence: 10,
  action: () => console.log("Not implemented"),
});

class Parent extends Component<any, any> {
  static template = xml`<TopBar model="model" t-on-ask-confirmation="askConfirmation"/>`;
  static components = { TopBar };
  model: Model;
  constructor(model: Model) {
    super();
    useSubEnv({
      openSidePanel: (panel: string) => {},
      dispatch: model.dispatch,
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

describe("TopBar component", () => {
  test("simple rendering", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);

    expect(fixture.querySelector(".o-spreadsheet-topbar")).toMatchSnapshot();
  });

  test("opening a second menu closes the first one", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    const parent = new Parent(model);
    await parent.mount(fixture);

    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
    fixture.querySelector('span[title="Borders"]')!.dispatchEvent(new Event("click"));
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

  test("merging cell button state is correct", async () => {
    const model = new Model({
      sheets: [
        {
          colNumber: 10,
          rowNumber: 10,
          cells: { B2: { content: "b2" } },
          merges: ["A1:B1"],
        },
      ],
    });
    const parent = new Parent(model);
    await parent.mount(fixture);
    const mergeTool = fixture.querySelector('.o-tool[title="Merge Cells"]')!;
    expect(mergeTool.classList.contains("active")).toBeTruthy();

    // increase the selection to A2 (so, it is now A1:B2) => merge tool
    // shoul not be active
    model.dispatch("ALTER_SELECTION", { cell: [0, 1] });
    await nextTick();
    expect(mergeTool.classList.contains("active")).toBeFalsy();
  });

  test("multiple selection zones => merge tools is disabled", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });

    const parent = new Parent(model);
    await parent.mount(fixture);
    const mergeTool = fixture.querySelector('.o-tool[title="Merge Cells"]')!;

    // should be disabled, because the selection is just one cell
    expect(mergeTool.classList.contains("o-disabled")).toBeTruthy();

    model.dispatch("ALTER_SELECTION", { cell: [1, 0] });
    await nextTick();
    // should be enabled, because two cells are selected
    expect(mergeTool.classList.contains("o-disabled")).toBeFalsy();

    model.dispatch("START_SELECTION_EXPANSION");
    model.dispatch("SELECT_CELL", { col: 3, row: 3 });

    await nextTick();
    // should be disabled, because multiple zones are selected
    expect(mergeTool.classList.contains("o-disabled")).toBeTruthy();
  });

  test("undo/redo tools", async () => {
    const model = new Model();

    const parent = new Parent(model);
    await parent.mount(fixture);
    const undoTool = fixture.querySelector('.o-tool[title="Undo"]')!;
    const redoTool = fixture.querySelector('.o-tool[title="Redo"]')!;

    expect(undoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(redoTool.classList.contains("o-disabled")).toBeTruthy();

    model.dispatch("SET_FORMATTING", {
      sheet: "Sheet1",
      target: [{ left: 0, right: 0, top: 0, bottom: 0 }],
      style: { bold: true },
    });
    await nextTick();

    expect(undoTool.classList.contains("o-disabled")).toBeFalsy();
    expect(redoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(model["workbook"].activeSheet.cells.A1.style).toBeDefined();

    undoTool.dispatchEvent(new Event("click"));
    await nextTick();
    expect(undoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(redoTool.classList.contains("o-disabled")).toBeFalsy();

    expect(getCell(model, "A1")).toBeNull();
  });

  test("paint format tools", async () => {
    const model = new Model();

    const parent = new Parent(model);
    await parent.mount(fixture);
    const paintFormatTool = fixture.querySelector('.o-tool[title="Paint Format"]')!;

    expect(paintFormatTool.classList.contains("active")).toBeFalsy();

    paintFormatTool.dispatchEvent(new Event("click"));
    await nextTick();

    expect(paintFormatTool.classList.contains("active")).toBeTruthy();
  });

  test("can clear formatting", async () => {
    const model = new Model();
    model.dispatch("SELECT_CELL", { col: 1, row: 0 });
    model.dispatch("SET_FORMATTING", {
      sheet: model.getters.getActiveSheet(),
      target: model.getters.getSelectedZones(),
      border: "all",
    });
    expect(model["workbook"].activeSheet.cells.B1.border).toBeDefined();
    const parent = new Parent(model);
    await parent.mount(fixture);
    const clearFormatTool = fixture.querySelector('.o-tool[title="Clear Format"]')!;
    clearFormatTool.dispatchEvent(new Event("click"));
    expect(getCell(model, "B1")).toBeNull();
  });

  test("can set cell format", async () => {
    const model = new Model();
    expect(getCell(model, "A1")).toBeNull();
    const parent = new Parent(model);
    await parent.mount(fixture);
    const formatTool = fixture.querySelector('.o-tool[title="Format"]')!;
    formatTool.dispatchEvent(new Event("click"));
    await nextTick();
    expect(parent.el).toMatchSnapshot();
    formatTool
      .querySelector('[data-format="percent"]')!
      .dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();
    expect(model["workbook"].activeSheet.cells.A1.format).toEqual("0.00%");
  });

  test("can set font size", async () => {
    const model = new Model();
    const parent = new Parent(model);
    await parent.mount(fixture);
    const fontSizeTool = fixture.querySelector('.o-tool[title="Font Size"]')!;
    expect(fontSizeTool.textContent!.trim()).toBe(DEFAULT_FONT_SIZE.toString());
    fontSizeTool.dispatchEvent(new Event("click"));
    await nextTick();
    fontSizeTool
      .querySelector('[data-size="8"]')!
      .dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();
    expect(fontSizeTool.textContent!.trim()).toBe("8");
    const style = model.getters.getCellStyle(model["workbook"].activeSheet.cells.A1);
    expect(style.fontSize).toBe(8);
  });

  test("opening, then closing same menu", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B2", text: "b2" });
    const parent = new Parent(model);
    await parent.mount(fixture);

    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
    fixture.querySelector('span[title="Borders"]')!.dispatchEvent(new Event("click"));
    await nextTick();
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    fixture.querySelector('span[title="Borders"]')!.dispatchEvent(new Event("click"));
    await nextTick();
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
  });

  test("Can open a Topbar menu", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    const items = topbarMenuRegistry.getAll();
    const number = items.filter((item) => item.children.length !== 0).length;
    expect(fixture.querySelectorAll(".o-topbar-menu")).toHaveLength(number);
    triggerMouseEvent(".o-topbar-menu[data-id='file']", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    const file = topbarMenuRegistry.get("file");
    const numberChild = topbarMenuRegistry
      .getChildren(file, parent.env)
      .filter((item) => item.children.length !== 0 || item.action).length;
    expect(fixture.querySelectorAll(".o-menu-item")).toHaveLength(numberChild);
    triggerMouseEvent(".o-spreadsheet-topbar", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
  });

  test("Can open a Topbar menu with mousemove", async () => {
    const parent = new Parent(new Model());
    await parent.mount(fixture);
    triggerMouseEvent(".o-topbar-menu[data-id='file']", "click");
    await nextTick();
    const file = topbarMenuRegistry.get("file");
    let numberChild = topbarMenuRegistry
      .getChildren(file, parent.env)
      .filter((item) => item.children.length !== 0 || item.action).length;
    expect(fixture.querySelectorAll(".o-menu-item")).toHaveLength(numberChild);
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    triggerMouseEvent(".o-topbar-menu[data-id='insert']", "mouseover");
    await nextTick();
    const insert = topbarMenuRegistry.get("insert");
    numberChild = topbarMenuRegistry
      .getChildren(insert, parent.env)
      .filter((item) => item.children.length !== 0 || item.action).length;
    expect(fixture.querySelectorAll(".o-menu-item")).toHaveLength(numberChild);
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
  });

  test("Can click on a menuItem do execute action and close menus", async () => {
    const menuDefinitions = Object.assign({}, topbarMenuRegistry.content);
    let number = 0;
    topbarMenuRegistry.add("test", { name: "Test", sequence: 1 });
    topbarMenuRegistry.addChild("testaction", ["test"], {
      name: "TestAction",
      sequence: 1,
      action: () => {
        number++;
      },
    });
    const parent = new Parent(new Model());
    await parent.mount(fixture);
    triggerMouseEvent(".o-topbar-menu[data-id='test']", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu-dropdown-content")).toHaveLength(0);
    expect(number).toBe(1);
    topbarMenuRegistry.content = menuDefinitions;
  });
});
describe("TopBar - CF", () => {
  test("open sidepanel with no CF in selected zone", async () => {
    const model = new Model();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    triggerMouseEvent(".o-topbar-menu[data-id='format']", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='format_cf']", "click");
    await nextTick();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeTruthy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeFalsy();
  });

  test("open sidepanel with one CF in selected zone", async () => {
    const model = new Model();
    const parent = new GridParent(model);
    await parent.mount(fixture);

    const cfRule: ConditionalFormat = {
      ranges: ["A1:C7"],
      id: "1",
      rule: {
        values: ["2"],
        operator: "Equal",
        type: "CellIsRule",
        style: { fillColor: "#FF0000" },
      },
    };
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: cfRule,
      sheet: model.getters.getActiveSheet(),
    });
    const zone = { left: 0, top: 0, bottom: 10, right: 10 };
    model.dispatch("SET_SELECTION", { zones: [zone], anchor: [0, 0] });

    triggerMouseEvent(".o-topbar-menu[data-id='format']", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='format_cf']", "click");
    await nextTick();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeFalsy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeTruthy();
  });

  test("open sidepanel with with more then one CF in selected zone", async () => {
    const model = new Model();
    const parent = new GridParent(model);
    await parent.mount(fixture);

    const cfRule1: ConditionalFormat = {
      ranges: ["A1:C7"],
      id: "1",
      rule: {
        values: ["2"],
        operator: "Equal",
        type: "CellIsRule",
        style: { fillColor: "#FF0000" },
      },
    };
    const cfRule2: ConditionalFormat = {
      ranges: ["A1:C7"],
      id: "2",
      rule: {
        values: ["3"],
        operator: "Equal",
        type: "CellIsRule",
        style: { fillColor: "#FE0001" },
      },
    };
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: cfRule1,
      sheet: model.getters.getActiveSheet(),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: cfRule2,
      sheet: model.getters.getActiveSheet(),
    });
    const zone = { left: 0, top: 0, bottom: 10, right: 10 };
    model.dispatch("SET_SELECTION", { zones: [zone], anchor: [0, 0] });

    triggerMouseEvent(".o-topbar-menu[data-id='format']", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='format_cf']", "click");
    await nextTick();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeTruthy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeFalsy();
  });
});
