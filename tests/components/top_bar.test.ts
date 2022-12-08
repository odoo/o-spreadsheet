import { App, Component, onMounted, onWillUnmount, useState, useSubEnv, xml } from "@odoo/owl";
import { ComposerFocusType } from "../../src/components/spreadsheet/spreadsheet";
import { TopBar } from "../../src/components/top_bar/top_bar";
import { DEFAULT_FONT_SIZE } from "../../src/constants";
import { toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { topbarComponentRegistry } from "../../src/registries";
import { getMenuChildren } from "../../src/registries/menus/helpers";
import { topbarMenuRegistry } from "../../src/registries/menus/topbar_menu_registry";
import { ConditionalFormat, Style } from "../../src/types";
import { OWL_TEMPLATES } from "../setup/jest.setup";
import {
  addCellToSelection,
  createFilter,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setSelection,
} from "../test_helpers/commands_helpers";
import { simulateClick, triggerMouseEvent } from "../test_helpers/dom_helper";
import { getBorder, getCell, getStyle } from "../test_helpers/getters_helpers";
import {
  getFigureIds,
  makeTestFixture,
  mountSpreadsheet,
  nextTick,
  target,
  toRangesData,
  typeInComposerTopBar,
} from "../test_helpers/helpers";
import { FileStore } from "./__mocks__/mock_file_store";

jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);
jest.mock("../../src/helpers/figures/images/image_provider", () =>
  require("./__mocks__/mock_image_provider")
);
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

let fixture: HTMLElement;
const t = (s: string): string => s;

class Parent extends Component {
  static template = xml/* xml */ `
    <div class="o-spreadsheet">
      <TopBar focusComposer="state.focusComposer" onClick="() => {}"/>
    </div>
  `;
  static components = { TopBar };

  static _t = t;
  state = useState({ focusComposer: <ComposerFocusType>"inactive" });

  setup() {
    useSubEnv({
      openSidePanel: () => {},
      model: this.props.model,
      askConfirmation: jest.fn(),
      _t: Parent._t,
      isDashboard: () => this.props.model.getters.isDashboard(),
    });
    this.state.focusComposer = this.props.focusComposer || "inactive";
    onMounted(() => this.props.model.on("update", this, this.render));
    onWillUnmount(() => this.props.model.off("update", this));
  }

  setFocusComposer(isFocused: ComposerFocusType) {
    this.state.focusComposer = isFocused;
  }
}

async function mountParent(
  model: Model = new Model(),
  focusComposer: boolean = false
): Promise<{ parent: Parent; app: App }> {
  const app = new App(Parent, { props: { model, focusComposer } });
  app.addTemplates(OWL_TEMPLATES);
  const parent = await app.mount(fixture);
  return { app, parent };
}

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

// TODORAR: shouldn't it instanciate automatically before each test ?

describe("TopBar component", () => {
  test("simple rendering", async () => {
    const { app } = await mountParent();
    expect(fixture.querySelector(".o-spreadsheet-topbar")).toMatchSnapshot();
    app.destroy();
  });

  test("opening a second menu closes the first one", async () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    const { app } = await mountParent(model);

    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
    fixture.querySelector('.o-tool[title="Borders"]')!.dispatchEvent(new Event("click"));
    await nextTick();
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    expect(fixture.querySelectorAll(".o-line-item").length).not.toBe(0);
    fixture
      .querySelector('.o-tool[title="Horizontal align"] span')!
      .dispatchEvent(new Event("click"));
    await nextTick();
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    expect(fixture.querySelectorAll(".o-color-line").length).toBe(0);
    app.destroy();
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
    const { app } = await mountParent(model);
    const mergeTool = fixture.querySelector('.o-tool[title="Merge Cells"]')!;
    expect(mergeTool.classList.contains("active")).toBeTruthy();

    // increase the selection to A2 (so, it is now A1:B2) => merge tool
    // should not be active
    setAnchorCorner(model, "A2");
    await nextTick();
    expect(mergeTool.classList.contains("active")).toBeFalsy();
    app.destroy();
  });

  test("multiple selection zones => merge tools is disabled", async () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");

    const { app } = await mountParent(model);
    const mergeTool = fixture.querySelector('.o-tool[title="Merge Cells"]')!;

    // should be disabled, because the selection is just one cell
    expect(mergeTool.classList.contains("o-disabled")).toBeTruthy();

    setAnchorCorner(model, "B1");
    await nextTick();
    // should be enabled, because two cells are selected
    expect(mergeTool.classList.contains("o-disabled")).toBeFalsy();
    selectCell(model, "D4");

    await nextTick();
    // should be disabled, because multiple zones are selected
    expect(mergeTool.classList.contains("o-disabled")).toBeTruthy();
    app.destroy();
  });

  test("undo/redo tools", async () => {
    const model = new Model();

    const { app } = await mountParent(model);
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
    app.destroy();
  });

  test("paint format tools", async () => {
    const model = new Model();

    const { app } = await mountParent(model);
    const paintFormatTool = fixture.querySelector('.o-tool[title="Paint Format"]')!;

    expect(paintFormatTool.classList.contains("active")).toBeFalsy();

    paintFormatTool.dispatchEvent(new Event("click"));
    await nextTick();

    expect(paintFormatTool.classList.contains("active")).toBeTruthy();
    app.destroy();
  });

  describe("Filter Tool", () => {
    let model: Model;
    let app: App;

    beforeEach(async () => {
      model = new Model();
      ({ app } = await mountParent(model));
    });

    afterEach(() => {
      app.destroy();
    });

    test("Filter tool is enabled with single selection", async () => {
      setSelection(model, ["A2:B3"]);
      await nextTick();
      const filterTool = fixture.querySelector(".o-filter-tool")!;
      expect(filterTool.classList.contains("o-disabled")).toBeFalsy();
    });

    test("Filter tool is enabled with selection of multiple continuous zones", async () => {
      setSelection(model, ["A1", "A2"]);
      await nextTick();
      const filterTool = fixture.querySelector(".o-filter-tool")!;
      expect(filterTool.classList.contains("o-disabled")).toBeFalsy();
    });

    test("Filter tool is disabled with selection of multiple non-continuous zones", async () => {
      setSelection(model, ["A1", "B5"]);
      await nextTick();
      const filterTool = fixture.querySelector(".o-filter-tool")!;
      expect(filterTool.classList.contains("o-disabled")).toBeTruthy();
    });

    test("Filter tool change from create filter to remove filter when a filter is selected", async () => {
      createFilter(model, "A2:B3");
      await nextTick();
      let filterTool = fixture.querySelector(".o-filter-tool")!;
      expect(filterTool.querySelectorAll(".filter-icon-active").length).toEqual(0);
      expect(filterTool.querySelectorAll(".filter-icon-inactive").length).toEqual(1);

      setSelection(model, ["A1", "B2"]);
      await nextTick();
      filterTool = fixture.querySelector(".o-filter-tool")!;
      expect(filterTool.querySelectorAll(".filter-icon-active").length).toEqual(1);
      expect(filterTool.querySelectorAll(".filter-icon-inactive").length).toEqual(0);
    });
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
    const { app } = await mountParent(model);
    const clearFormatTool = fixture.querySelector('.o-tool[title="Clear Format"]')!;
    clearFormatTool.dispatchEvent(new Event("click"));
    expect(getCell(model, "B1")).toBeUndefined();
    app.destroy();
  });

  test("can set cell format", async () => {
    const model = new Model();
    expect(getCell(model, "A1")).toBeUndefined();
    const { app } = await mountParent(model);
    const formatTool = fixture.querySelector('.o-tool[title="More formats"]')!;
    formatTool.dispatchEvent(new Event("click"));
    await nextTick();
    expect(fixture).toMatchSnapshot();
    fixture
      .querySelector('[data-format="percent"]')!
      .dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();
    expect(getCell(model, "A1")!.format).toEqual("0.00%");
    app.destroy();
  });

  test("can set font size", async () => {
    const model = new Model();
    const { app } = await mountParent(model);
    const fontSizeTool = fixture.querySelector('.o-tool[title="Font Size"]')!;
    expect(fontSizeTool.textContent!.trim()).toBe(DEFAULT_FONT_SIZE.toString());
    fontSizeTool.dispatchEvent(new Event("click"));
    await nextTick();
    fixture.querySelector('[data-size="8"]')!.dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();
    expect(fontSizeTool.textContent!.trim()).toBe("8");
    expect(getStyle(model, "A1").fontSize).toBe(8);
    app.destroy();
  });

  test.each([
    ["align-left", { align: "left" }],
    ["align-center", { align: "center" }],
    ["align-right", { align: "right" }],
  ])("can set horizontal alignment with the toolbar", async (iconClass, expectedStyle) => {
    const model = new Model();
    selectCell(model, "A1");
    const { app } = await mountParent(model);
    const alignTool = fixture.querySelector('.o-tool[title="Horizontal align"]')!;
    alignTool.dispatchEvent(new Event("click"));
    await nextTick();

    const alignButtons = fixture.querySelectorAll("div.o-dropdown-item")!;
    const button = [...alignButtons].find((element) =>
      element.children[0]!.classList.contains(iconClass)
    )!;

    button.dispatchEvent(new Event("click"));
    await nextTick();
    expect(model.getters.getCurrentStyle()).toEqual(expectedStyle);
    app.destroy();
  });
  test.each([
    ["text", {}, "align-left"],
    ["0", {}, "align-right"],
    ["0", { align: "left" }, "align-left"],
    ["0", { align: "center" }, "align-center"],
    ["0", { align: "right" }, "align-right"],
  ])(
    "alignment icon in top bar match the selected cell",
    async (content, style, expectedIconClass) => {
      const model = new Model();
      setCellContent(model, "A1", content);
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: style as Style,
      });
      const { app } = await mountParent(model);
      const alignTool = fixture.querySelector('.o-tool[title="Horizontal align"]')!;
      expect(alignTool.querySelector("svg")!.classList).toContain(expectedIconClass);
      app.destroy();
    }
  );

  test("opening, then closing same menu", async () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");

    const { app } = await mountParent(model);
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
    fixture.querySelector('.o-tool[title="Borders"]')!.dispatchEvent(new Event("click"));
    await nextTick();
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    fixture.querySelector('.o-tool[title="Borders"]')!.dispatchEvent(new Event("click"));
    await nextTick();
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
    app.destroy();
  });

  test("Can open a Topbar menu", async () => {
    const { app, parent } = await mountParent();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    const items = topbarMenuRegistry.getAll();
    const number = items.filter((item) => item.children.length !== 0).length;
    expect(fixture.querySelectorAll(".o-topbar-menu")).toHaveLength(number);
    triggerMouseEvent(".o-topbar-menu[data-id='file']", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    const file = topbarMenuRegistry.get("file");
    const numberChild = getMenuChildren(file, parent.env).filter(
      (item) => item.children.length !== 0 || item.action
    ).length;
    expect(fixture.querySelectorAll(".o-menu-item")).toHaveLength(numberChild);
    triggerMouseEvent(".o-spreadsheet-topbar", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    app.destroy();
  });

  test("Can open a Topbar menu with mousemove", async () => {
    const { app, parent } = await mountParent();
    triggerMouseEvent(".o-topbar-menu[data-id='file']", "click");
    await nextTick();
    const file = topbarMenuRegistry.get("file");
    let numberChild = getMenuChildren(file, parent.env).filter(
      (item) => item.children.length !== 0 || item.action
    ).length;
    expect(fixture.querySelectorAll(".o-menu-item")).toHaveLength(numberChild);
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    triggerMouseEvent(".o-topbar-menu[data-id='insert']", "mouseover");
    await nextTick();
    const insert = topbarMenuRegistry.get("insert");
    numberChild = getMenuChildren(insert, parent.env).filter(
      (item) => (item.children.length !== 0 || item.action) && item.isVisible(parent.env)
    ).length;
    expect(fixture.querySelectorAll(".o-menu-item")).toHaveLength(numberChild);
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    app.destroy();
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
    const { app } = await mountParent();
    triggerMouseEvent(".o-topbar-menu[data-id='test']", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item", "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu-dropdown-content")).toHaveLength(0);
    expect(number).toBe(1);
    topbarMenuRegistry.content = menuDefinitions;
    app.destroy();
  });

  test("Opened menu parent is highlighted", async () => {
    const { app } = await mountParent();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    const menuItem = fixture.querySelector(".o-topbar-menu[data-id='edit']");
    expect(menuItem?.classList).not.toContain("o-topbar-menu-active");
    triggerMouseEvent(menuItem, "click");
    await nextTick();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    expect(menuItem?.classList).toContain("o-topbar-menu-active");
    triggerMouseEvent(".o-menu-item", "click");
    await nextTick();
    expect(menuItem?.classList).not.toContain("o-topbar-menu-active");
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    app.destroy();
  });

  test("Can add a custom component to topbar", async () => {
    const compDefinitions = Object.assign({}, topbarComponentRegistry.content);
    class Comp extends Component {
      static template = xml`<div class="o-topbar-test">Test</div>`;
    }
    topbarComponentRegistry.add("1", { component: Comp });
    const { app } = await mountParent();
    expect(fixture.querySelectorAll(".o-topbar-test")).toHaveLength(1);
    topbarComponentRegistry.content = compDefinitions;
    app.destroy();
  });

  test("Can add multiple components to topbar with different visibilities", async () => {
    const compDefinitions = Object.assign({}, topbarComponentRegistry.content);
    class Comp1 extends Component {
      static template = xml`<div class="o-topbar-test1">Test1</div>`;
    }
    class Comp2 extends Component {
      static template = xml`<div class="o-topbar-test2">Test2</div>`;
    }
    let comp1Visibility = false;
    topbarComponentRegistry.add("first", {
      component: Comp1,
      isVisible: () => {
        return comp1Visibility;
      },
    });
    topbarComponentRegistry.add("second", { component: Comp2 });
    const { app, parent } = await mountParent();
    expect(fixture.querySelectorAll(".o-topbar-test1")).toHaveLength(0);
    expect(fixture.querySelectorAll(".o-topbar-test2")).toHaveLength(1);

    comp1Visibility = true;
    parent.render();
    await nextTick();
    expect(fixture.querySelectorAll(".o-topbar-test1")).toHaveLength(1);
    expect(fixture.querySelectorAll(".o-topbar-test2")).toHaveLength(1);

    // reset Top Component Registry
    topbarComponentRegistry.content = compDefinitions;
    app.destroy();
  });

  test("Readonly spreadsheet has a specific top bar", async () => {
    const model = new Model();
    const { app } = await mountParent(model);

    expect(fixture.querySelectorAll(".o-readonly-toolbar")).toHaveLength(0);
    model.updateMode("readonly");
    await nextTick();
    expect(fixture.querySelectorAll(".o-readonly-toolbar")).toHaveLength(1);
    triggerMouseEvent(".o-topbar-menu[data-id='insert']", "click");
    await nextTick();
    const insertMenuItems = fixture.querySelectorAll(".o-menu div.o-menu-item");
    expect([...insertMenuItems].every((item) => item.classList.contains("disabled"))).toBeTruthy();
    app.destroy();
  });

  test("Cannot edit cell in a readonly spreadsheet", async () => {
    const model = new Model({}, { mode: "readonly" });
    const { app, parent } = await mountParent(model);

    let composerEl = fixture.querySelector(".o-spreadsheet-topbar div.o-composer")!;

    expect(composerEl.classList.contains("unfocusable")).toBeTruthy();
    expect(composerEl.attributes.getNamedItem("contentEditable")!.value).toBe("false");

    parent.setFocusComposer("contentFocus");
    await nextTick();
    // Won't update the current content
    const content = model.getters.getCurrentContent();
    expect(content).toBe("");
    composerEl = await typeInComposerTopBar("tabouret", false);
    expect(model.getters.getCurrentContent()).toBe(content);
    app.destroy();
  });

  test.each([
    ["Horizontal align", ".o-dropdown-content"],
    ["Borders", ".o-dropdown-content"],
    ["Font Size", ".o-dropdown-content"],
    ["Fill Color", ".o-color-picker"],
    ["Text Color", ".o-color-picker"],
    ["More formats", ".o-dropdown-content"],
  ])(
    "Clicking a static element inside a dropdown '%s' don't close the dropdown",
    async (toolName: string, dropdownContentSelector: string) => {
      const model = new Model();
      const { app } = await mountParent(model);

      await simulateClick(`.o-tool[title="${toolName}"]`);
      await nextTick();
      expect(fixture.querySelector(dropdownContentSelector)).toBeTruthy();
      await simulateClick(dropdownContentSelector);
      await nextTick();
      expect(fixture.querySelector(dropdownContentSelector)).toBeTruthy();
      app.destroy();
    }
  );

  test("can insert an image", async () => {
    fixture = makeTestFixture();
    const fileStore = new FileStore();
    const { model, app } = await mountSpreadsheet(fixture, { model: new Model(), fileStore });
    await nextTick();
    const sheetId = model.getters.getActiveSheetId();
    await simulateClick(".o-topbar-menu[data-id='insert']");
    await simulateClick(".o-menu-item[data-name='insert_image']");
    expect(getFigureIds(model, sheetId)).toHaveLength(1);
    app.destroy();
    fixture.remove();
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
  const { app } = await mountParent();
  expect(fixture.querySelectorAll(".o-topbar-test1")).toHaveLength(1);
  expect(fixture.querySelectorAll(".o-topbar-test2")).toHaveLength(0);
  topbarComponentRegistry.content = compDefinitions;
  app.destroy();
});

describe("TopBar - Custom currency", () => {
  test("can open custom currency sidepanel from tool", async () => {
    const { app } = await mountSpreadsheet(fixture);
    triggerMouseEvent(".o-tool[title='More formats']", "click");
    await nextTick();
    triggerMouseEvent(".o-format-tool div[data-custom='custom_currency']", "click");
    await nextTick();
    expect(fixture.querySelector(".o-custom-currency")).toBeTruthy();
    app.destroy();
  });
});

describe("Format", () => {
  test("can clear format", async () => {
    const { app, model } = await mountSpreadsheet(fixture);
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("SET_FORMATTING", {
      sheetId,
      target: target("A1, B2:B3"),
      style: { fillColor: "#000000" },
    });
    selectCell(model, "A1");
    addCellToSelection(model, "B2");
    setAnchorCorner(model, "B3");
    expect(getCell(model, "A1")?.style).toEqual({ fillColor: "#000000" });
    expect(getCell(model, "B2")?.style).toEqual({ fillColor: "#000000" });
    expect(getCell(model, "B3")?.style).toEqual({ fillColor: "#000000" });
    triggerMouseEvent(".o-topbar-menu[data-id='format']", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='format_clearFormat']", "click");
    await nextTick();
    expect(getCell(model, "A1")?.style).toBeUndefined();
    expect(getCell(model, "B2")?.style).toBeUndefined();
    expect(getCell(model, "B3")?.style).toBeUndefined();
    app.destroy();
  });
});

describe("TopBar - CF", () => {
  test("open sidepanel with no CF in selected zone", async () => {
    const { app } = await mountSpreadsheet(fixture);
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
    app.destroy();
  });

  test("open sidepanel with one CF in selected zone", async () => {
    const { app, model } = await mountSpreadsheet(fixture);

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
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: cfRule,
      sheetId,
      ranges: toRangesData(sheetId, cfRule.ranges.join(",")),
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
    app.destroy();
  });

  test("open sidepanel with with more then one CF in selected zone", async () => {
    const { app, model } = await mountSpreadsheet(fixture);

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
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: cfRule1,
      sheetId,
      ranges: toRangesData(sheetId, cfRule1.ranges.join(",")),
    });
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: cfRule2,
      sheetId,
      ranges: toRangesData(sheetId, cfRule2.ranges.join(",")),
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
    app.destroy();
  });

  test("will update sidepanel if we reopen it from other cell", async () => {
    const { app, model } = await mountSpreadsheet(fixture);

    const cfRule1: ConditionalFormat = {
      ranges: ["A1:A10"],
      id: "1",
      rule: {
        values: ["2"],
        operator: "Equal",
        type: "CellIsRule",
        style: { fillColor: "#FF1200" },
      },
    };
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: cfRule1,
      sheetId,
      ranges: toRangesData(sheetId, cfRule1.ranges.join(",")),
    });
    setSelection(model, ["A1:A11"]);
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

    setSelection(model, ["F6"]);
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
    app.destroy();
  });
});
describe("Topbar - View", () => {
  test("Setting show formula from topbar should retain its state even it's changed via f&r side panel upon closing", async () => {
    const { app, parent, model } = await mountSpreadsheet(fixture);
    triggerMouseEvent(".o-topbar-menu[data-id='view']", "click");
    await nextTick();
    triggerMouseEvent(".o-menu-item[data-name='view_formulas']", "click");
    await nextTick();
    expect(model.getters.shouldShowFormulas()).toBe(true);
    parent.env.openSidePanel("FindAndReplace");
    await nextTick();
    expect(model.getters.shouldShowFormulas()).toBe(true);
    await nextTick();
    triggerMouseEvent(
      document.querySelector(
        ".o-sidePanel .o-sidePanelBody .o-find-and-replace .o-section:nth-child(1) .o-far-item:nth-child(3) input"
      ),
      "click"
    );
    await nextTick();
    expect(model.getters.shouldShowFormulas()).toBe(false);
    triggerMouseEvent(
      document.querySelector(".o-sidePanel .o-sidePanelHeader .o-sidePanelClose"),
      "click"
    );
    await nextTick();
    expect(model.getters.shouldShowFormulas()).toBe(true);
    app.destroy();
  });
});
