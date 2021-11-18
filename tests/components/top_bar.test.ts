import { Component, hooks, tags, useState } from "@odoo/owl";
import { TopBar } from "../../src/components/top_bar";
import { DEFAULT_FONT_SIZE } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { topbarComponentRegistry } from "../../src/registries";
import { topbarMenuRegistry } from "../../src/registries/menus/topbar_menu_registry";
import { ConditionalFormat, SpreadsheetEnv } from "../../src/types";
import { selectCell, setCellContent, setSelection } from "../test_helpers/commands_helpers";
import { simulateClick, triggerMouseEvent } from "../test_helpers/dom_helper";
import { getBorder, getCell } from "../test_helpers/getters_helpers";
import {
  makeTestFixture,
  mountSpreadsheet,
  nextTick,
  typeInComposerTopBar,
} from "../test_helpers/helpers";

jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

const { xml } = tags;
const { useSubEnv } = hooks;

let fixture: HTMLElement;
let parent: Parent;
const t = (s: string): string => s;

class Parent extends Component<any, SpreadsheetEnv> {
  static template = xml/* xml */ `
    <TopBar class="o-spreadsheet" model="model" focusComposer="state.focusComposer" t-on-ask-confirmation="askConfirmation"/>
  `;
  static components = { TopBar };

  static _t = t;
  state = useState({ focusComposer: <boolean>false });
  model: Model;

  constructor(model: Model, focusComposer: boolean = false) {
    super();
    useSubEnv({
      openSidePanel: (panel: string) => {},
      dispatch: model.dispatch,
      getters: model.getters,
      askConfirmation: jest.fn(),
      _t: Parent._t,
    });
    this.model = model;
    this.state.focusComposer = focusComposer;
  }

  setFocusComposer(isFocused: boolean) {
    this.state.focusComposer = isFocused;
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
  parent.destroy();
  fixture.remove();
});

describe("TopBar component", () => {
  test("simple rendering", async () => {
    parent = new Parent(new Model());
    await parent.mount(fixture);

    expect(fixture.querySelector(".o-spreadsheet-topbar")).toMatchSnapshot();
  });

  test("opening a second menu closes the first one", async () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    parent = new Parent(model);
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
    parent = new Parent(model);
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
    setCellContent(model, "B2", "b2");

    parent = new Parent(model);
    await parent.mount(fixture);
    const mergeTool = fixture.querySelector('.o-tool[title="Merge Cells"]')!;

    // should be disabled, because the selection is just one cell
    expect(mergeTool.classList.contains("o-disabled")).toBeTruthy();

    model.dispatch("ALTER_SELECTION", { cell: [1, 0] });
    await nextTick();
    // should be enabled, because two cells are selected
    expect(mergeTool.classList.contains("o-disabled")).toBeFalsy();

    model.dispatch("START_SELECTION_EXPANSION");
    selectCell(model, "D4");

    await nextTick();
    // should be disabled, because multiple zones are selected
    expect(mergeTool.classList.contains("o-disabled")).toBeTruthy();
  });

  test("undo/redo tools", async () => {
    const model = new Model();

    parent = new Parent(model);
    await parent.mount(fixture);
    const undoTool = fixture.querySelector('.o-tool[title="Undo"]')!;
    const redoTool = fixture.querySelector('.o-tool[title="Redo"]')!;

    expect(undoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(redoTool.classList.contains("o-disabled")).toBeTruthy();

    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 0, right: 0, top: 0, bottom: 0 }],
      style: { bold: true },
    });
    await nextTick();

    expect(undoTool.classList.contains("o-disabled")).toBeFalsy();
    expect(redoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(getCell(model, "A1")!.style).toBeDefined();

    undoTool.dispatchEvent(new Event("click"));
    await nextTick();
    expect(undoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(redoTool.classList.contains("o-disabled")).toBeFalsy();

    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("paint format tools", async () => {
    const model = new Model();

    parent = new Parent(model);
    await parent.mount(fixture);
    const paintFormatTool = fixture.querySelector('.o-tool[title="Paint Format"]')!;

    expect(paintFormatTool.classList.contains("active")).toBeFalsy();

    paintFormatTool.dispatchEvent(new Event("click"));
    await nextTick();

    expect(paintFormatTool.classList.contains("active")).toBeTruthy();
  });

  test("can clear formatting", async () => {
    const model = new Model();
    selectCell(model, "B1");
    model.dispatch("SET_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      border: "all",
    });
    expect(getBorder(model, "B1")).toBeDefined();
    parent = new Parent(model);
    await parent.mount(fixture);
    const clearFormatTool = fixture.querySelector('.o-tool[title="Clear Format"]')!;
    clearFormatTool.dispatchEvent(new Event("click"));
    expect(getCell(model, "B1")).toBeUndefined();
  });

  test("can set cell format", async () => {
    const model = new Model();
    expect(getCell(model, "A1")).toBeUndefined();
    parent = new Parent(model);
    await parent.mount(fixture);
    const formatTool = fixture.querySelector('.o-tool[title="More formats"]')!;
    formatTool.dispatchEvent(new Event("click"));
    await nextTick();
    expect(parent.el).toMatchSnapshot();
    formatTool
      .querySelector('[data-format="percent"]')!
      .dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();
    expect(getCell(model, "A1")!.format).toEqual("0.00%");
  });

  test("can set font size", async () => {
    const model = new Model();
    parent = new Parent(model);
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
    const style = model.getters.getCellStyle(getCell(model, "A1")!);
    expect(style.fontSize).toBe(8);
  });

  test("opening, then closing same menu", async () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    parent = new Parent(model);
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
    parent = new Parent(new Model());
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
    parent = new Parent(new Model());
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
    parent = new Parent(new Model());
    await parent.mount(fixture);
    triggerMouseEvent(".o-topbar-menu[data-id='test']", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu-dropdown-content")).toHaveLength(0);
    expect(number).toBe(1);
    topbarMenuRegistry.content = menuDefinitions;
  });

  test("Can add a custom component to topbar", async () => {
    const compDefinitions = Object.assign({}, topbarComponentRegistry.content);
    class Comp extends Component {
      static template = xml`<div class="o-topbar-test">Test</div>`;
    }
    topbarComponentRegistry.add("1", { component: Comp });
    parent = new Parent(new Model());
    await parent.mount(fixture);
    expect(fixture.querySelectorAll(".o-topbar-test")).toHaveLength(1);
    topbarComponentRegistry.content = compDefinitions;
  });

  test("Readonly spreadsheet has a specific top bar", async () => {
    const model = new Model();
    parent = new Parent(model);
    await parent.mount(fixture);

    expect(fixture.querySelectorAll(".o-readonly-toolbar")).toHaveLength(0);
    model.updateReadOnly(true);
    await nextTick();
    expect(fixture.querySelectorAll(".o-readonly-toolbar")).toHaveLength(1);
    triggerMouseEvent(".o-topbar-menu[data-id='insert']", "click");
    await nextTick();
    const insertMenuItems = fixture.querySelectorAll(".o-menu div.o-menu-item");
    expect([...insertMenuItems].every((item) => item.classList.contains("disabled"))).toBeTruthy();
  });

  test("Cannot edit cell in a readonly spreadsheet", async () => {
    const model = new Model({}, { isReadonly: true });
    parent = new Parent(model);
    await parent.mount(fixture);

    let composerEl = fixture.querySelector(".o-spreadsheet-topbar div.o-composer")!;

    expect(composerEl.classList.contains("unfocusable")).toBeTruthy();
    expect(composerEl.attributes.getNamedItem("contentEditable")!.value).toBe("false");

    parent.setFocusComposer(true);
    await nextTick();
    // Won't update the current content
    const content = model.getters.getCurrentContent();
    expect(content).toBe("");
    composerEl = await typeInComposerTopBar("tabouret", false);
    expect(model.getters.getCurrentContent()).toBe(content);
  });
});

test("Can show/hide a TopBarComponent based on condition", async () => {
  const compDefinitions = Object.assign({}, topbarComponentRegistry.content);
  class Comp1 extends Component {
    static template = xml`<div class="o-topbar-test1">Test1</div>`;
  }
  class Comp2 extends Component {
    static template = xml`<div class="o-topbar-test2">Test2</div>`;
  }
  topbarComponentRegistry.add("1", {
    component: Comp1,
    isVisible: (env) => true,
  });
  topbarComponentRegistry.add("2", {
    component: Comp2,
    isVisible: (env) => false,
  });
  parent = new Parent(new Model());
  await parent.mount(fixture);
  expect(fixture.querySelectorAll(".o-topbar-test1")).toHaveLength(1);
  expect(fixture.querySelectorAll(".o-topbar-test2")).toHaveLength(0);
  topbarComponentRegistry.content = compDefinitions;
  parent.destroy();
});

describe("top bar align tool", () => {
  test.each([
    [0, "left"],
    [1, "center"],
    [2, "right"],
  ])("can set alignment", async (dropdownItem, alignment) => {
    const model = new Model();
    parent = new Parent(model);
    await parent.mount(fixture);
    await simulateClick('.o-tool[title="Horizontal align"] span');
    await simulateClick(fixture.querySelectorAll(".o-dropdown-item")[dropdownItem]);
    expect(getCell(model, "A1")?.style?.align).toBe(alignment);
  });
});

describe("TopBar - CF", () => {
  test("open sidepanel with no CF in selected zone", async () => {
    const parent = await mountSpreadsheet(fixture);
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
    parent.destroy();
  });

  test("open sidepanel with one CF in selected zone", async () => {
    const parent = await mountSpreadsheet(fixture);
    const model = parent.model;

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
      sheetId: model.getters.getActiveSheetId(),
      target: cfRule.ranges.map(toZone),
    });
    setSelection(model, ["A1:K11"]);

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
    parent.destroy();
  });

  test("open sidepanel with with more then one CF in selected zone", async () => {
    const parent = await mountSpreadsheet(fixture);
    const model = parent.model;

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
      sheetId: model.getters.getActiveSheetId(),
      target: cfRule1.ranges.map(toZone),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: cfRule2,
      sheetId: model.getters.getActiveSheetId(),
      target: cfRule2.ranges.map(toZone),
    });
    setSelection(model, ["A1:K11"]);

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
    parent.destroy();
  });
});
