import { Component, xml } from "@odoo/owl";
import { Model } from "../src";
import { CellComposerStore } from "../src/components/composer/composer/cell_composer_store";
import { PaintFormatStore } from "../src/components/paint_format_button/paint_format_store";
import { TopBar } from "../src/components/top_bar/top_bar";
import { topBarToolBarRegistry } from "../src/components/top_bar/top_bar_tools_registry";
import { DEBOUNCE_TIME, DEFAULT_FONT_SIZE } from "../src/constants";
import { toZone, zoneToXc } from "../src/helpers";
import { topbarMenuRegistry } from "../src/registries/menus";
import { topbarComponentRegistry } from "../src/registries/topbar_component_registry";
import { ConditionalFormat, Currency, Pixel, SpreadsheetChildEnv, Style } from "../src/types";
import { FileStore } from "./__mocks__/mock_file_store";
import { MockTransportService } from "./__mocks__/transport_service";
import {
  addCellToSelection,
  createTableWithFilter,
  freezeColumns,
  freezeRows,
  merge,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setSelection,
  setStyle,
  setZoneBorders,
} from "./test_helpers/commands_helpers";
import {
  click,
  doubleClick,
  getElComputedStyle,
  simulateClick,
  triggerMouseEvent,
} from "./test_helpers/dom_helper";
import { getBorder, getCell, getStyle, getTable } from "./test_helpers/getters_helpers";
import {
  addToRegistry,
  getFigureIds,
  getNode,
  mountComponent,
  mountSpreadsheet,
  nextTick,
  target,
  toRangesData,
  typeInComposerTopBar,
} from "./test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "./test_helpers/mock_helpers";

jest.mock("../src/helpers/figures/images/image_provider", () =>
  require("./__mocks__/mock_image_provider")
);

const topBarToolsHeight = 30;
let spreadsheetWidth = 1000;
let spreadsheetHeight = 1000;
const moreToolsContainerWidth = 50;
const moreToolsWidth = 50;
const toolWidth = 100;

beforeEach(() => {
  extendMockGetBoundingClientRect({
    "o-spreadsheet": () => ({ x: 0, y: 0, width: spreadsheetWidth, height: spreadsheetHeight }),
    "o-popover": () => ({ width: 50, height: 50 }),
    "o-topbar-responsive": () => ({ x: 0, y: 0, width: spreadsheetWidth, height: 1000 }),
    "o-toolbar-tools": () => ({ x: 0, y: 0, width: spreadsheetWidth, height: topBarToolsHeight }),
    "tool-container": () => ({ x: 0, y: 0, width: toolWidth, height: topBarToolsHeight }),
    "more-tools-container": () => ({
      x: 0,
      y: 0,
      width: moreToolsContainerWidth,
      height: topBarToolsHeight,
    }),
    "more-tools": () => ({
      x: 0,
      y: 0,
      width: moreToolsWidth,
      height: topBarToolsHeight,
    }),
    "o-dropdown": () => ({ x: 0, y: 0, width: 30, height: topBarToolsHeight }),
  });
});

afterEach(() => {
  spreadsheetWidth = 1000;
  spreadsheetHeight = 1000;
});

let fixture: HTMLElement;
let parent: Parent;

class Parent extends Component<any, SpreadsheetChildEnv> {
  static template = xml/* xml */ `
    <div class="o-spreadsheet">
      <TopBar
        onClick="() => {}"
        dropdownMaxHeight="gridHeight"/>
    </div>
  `;
  static components = { TopBar };
  static props = {};

  get gridHeight(): Pixel {
    const { height } = this.env.model.getters.getSheetViewDimension();
    return height;
  }
}

class Comp extends Component {
  static template = xml`<div class="o-topbar-test">Test</div>`;
  static props = {};
}

class Comp1 extends Comp {
  static template = xml`<div class="o-topbar-test1">Test1</div>`;
}
class Comp2 extends Comp {
  static template = xml`<div class="o-topbar-test2">Test2</div>`;
}

async function mountParent(
  model: Model = new Model(),
  testEnv?: Partial<SpreadsheetChildEnv>
): Promise<{ parent: Parent; model: Model; fixture: HTMLElement }> {
  const env = {
    ...testEnv,
    model,
    isDashboard: () => model.getters.isDashboard(),
  };
  let parent: Component;
  ({ parent, fixture } = await mountComponent(Parent, { env }));
  return { parent: parent as Parent, model, fixture };
}

describe("TopBar component", () => {
  test("simple rendering", async () => {
    await mountParent();
    expect(fixture.querySelector(".o-spreadsheet-topbar")).toMatchSnapshot();
  });

  test("opening a second menu closes the first one", async () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    await mountParent(model);
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
    await nextTick();
    await click(fixture, '.o-menu-item-button[title="Vertical align"]');
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    expect(fixture.querySelectorAll('.o-menu-item-button[title="Top"]').length).not.toBe(0);
    await click(fixture, '.o-menu-item-button[title="Horizontal align"]');
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    expect(fixture.querySelectorAll('.o-menu-item-button[title="Top"]').length).toBe(0);
  });

  test("Menu should be closed while clicking on composer", async () => {
    await mountParent();
    expect(fixture.querySelectorAll(".o-menu").length).toBe(0);
    await click(fixture, ".o-topbar-menu[data-id='edit']");
    expect(fixture.querySelectorAll(".o-menu").length).toBe(1);
    await click(fixture, ".o-spreadsheet-topbar div.o-composer");
    expect(fixture.querySelectorAll(".o-menu").length).toBe(0);
  });

  test("merge button is active when selected zone contains merged cells", async () => {
    const { model } = await mountParent();
    const mergeTool = () => fixture.querySelector('.o-menu-item-button[title="Merge cells"]')!;

    // Case 1: A selected zone contains merged cells → should be active
    merge(model, "A1:B2");
    setSelection(model, ["A1:C3", "D1:F3"]);
    await nextTick();
    expect(mergeTool().classList.contains("active")).toBeTruthy();

    // Case 2: No selected zone contains merged cells → should not be active
    setSelection(model, ["D1:F3", "H1:J3"]);
    await nextTick();
    expect(mergeTool().classList.contains("active")).toBeFalsy();
  });

  test("disables the merge button when selected zones share overlapping cells", async () => {
    const { model } = await mountParent();

    setSelection(model, ["A1:B2", "C1:D2"]);
    await nextTick();

    const mergeTool = fixture.querySelector('.o-menu-item-button[title="Merge cells"]')!;
    expect(mergeTool.classList.contains("o-disabled")).toBeFalsy();

    setSelection(model, ["A1:B2", "B1:C2"]);
    await nextTick();

    expect(mergeTool.classList.contains("o-disabled")).toBeTruthy();
  });

  test("disables the merge button when any one zone crosses a frozen pane", async () => {
    const { model } = await mountParent();

    freezeColumns(model, 2);
    freezeRows(model, 2);

    const mergeTool = fixture.querySelector('.o-menu-item-button[title="Merge cells"]')!;

    setSelection(model, ["B1:C1"]);
    await nextTick();
    expect(mergeTool.classList.contains("o-disabled")).toBeTruthy();

    setSelection(model, ["A2:A3"]);
    await nextTick();
    expect(mergeTool.classList.contains("o-disabled")).toBeTruthy();

    setSelection(model, ["D5:E7", "B1:C1"]);
    await nextTick();
    expect(mergeTool.classList.contains("o-disabled")).toBeTruthy();

    setSelection(model, ["D5:E7", "A2:A3"]);
    await nextTick();
    expect(mergeTool.classList.contains("o-disabled")).toBeTruthy();
  });

  test("allows merging multiple non-overlapping zones", async () => {
    const { model } = await mountParent();
    const sheetId = model.getters.getActiveSheetId();

    setSelection(model, ["A1:B2", "C1:D2"]);
    await nextTick();

    const mergeTool = fixture.querySelector('.o-menu-item-button[title="Merge cells"]')!;
    expect(mergeTool.classList.contains("o-disabled")).toBeFalsy();
    expect(model.getters.getMerges(sheetId)).toEqual([]);

    await click(mergeTool);
    expect(model.getters.getMerges(sheetId)).toEqual([
      { id: 1, top: 0, left: 0, bottom: 1, right: 1 },
      { id: 2, top: 0, left: 2, bottom: 1, right: 3 },
    ]);
  });

  test("toggles merge/unmerge based on selected zones containing merged cells", async () => {
    const { model } = await mountParent();
    const sheetId = model.getters.getActiveSheetId();

    // First select zones without merged cells
    setSelection(model, ["A1:C3", "D1:E2"]);
    await nextTick();

    const mergeTool = fixture.querySelector('.o-menu-item-button[title="Merge cells"]')!;

    expect(mergeTool.classList.contains("active")).toBeFalsy();
    expect(mergeTool.classList.contains("o-disabled")).toBeFalsy();
    expect(model.getters.getMerges(sheetId)).toEqual([]);

    await click(mergeTool);
    expect(model.getters.getMerges(sheetId)).toEqual([
      { id: 1, top: 0, left: 0, bottom: 2, right: 2 },
      { id: 2, top: 0, left: 3, bottom: 1, right: 4 },
    ]);

    // Now select a zone with merged cells
    setSelection(model, ["G1:H2", "A1:C3", "D1:E2"]);
    await nextTick();

    expect(mergeTool.classList.contains("active")).toBeTruthy();

    await click(mergeTool);
    expect(model.getters.getMerges(sheetId)).toEqual([]);

    expect(mergeTool.classList.contains("o-disabled")).toBeFalsy();
  });

  test("undo/redo tools", async () => {
    const { model } = await mountParent();
    const undoTool = fixture.querySelector('.o-menu-item-button[title="Undo (Ctrl+Z)"]')!;
    const redoTool = fixture.querySelector('.o-menu-item-button[title="Redo (Ctrl+Y)"]')!;

    expect(undoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(redoTool.classList.contains("o-disabled")).toBeTruthy();

    setSelection(model, ["A2"]); // non repeatable command
    await nextTick();
    expect(undoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(redoTool.classList.contains("o-disabled")).toBeTruthy();

    setStyle(model, "A1", { bold: true });
    await nextTick();
    expect(undoTool.classList.contains("o-disabled")).toBeFalsy();
    expect(redoTool.classList.contains("o-disabled")).toBeFalsy();
    expect(getCell(model, "A1")!.style).toBeDefined();

    await click(undoTool);
    expect(undoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(redoTool.classList.contains("o-disabled")).toBeFalsy();

    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("irregularity map tool", async () => {
    const { parent } = await mountParent();
    const menu = getNode(["view", "view_irregularity_map"], parent.env, topbarMenuRegistry);
    expect(".irregularity-map").toHaveCount(0);
    menu.execute?.(parent.env);
    await nextTick();
    expect(".irregularity-map").toHaveCount(1);
    await click(fixture, ".irregularity-map");
    expect(".irregularity-map btn").toHaveCount(0);
  });

  describe("Paint format tools", () => {
    test("Single click to activate paint format (once)", async () => {
      const { parent } = await mountParent();
      const paintFormatTool = fixture.querySelector('.o-menu-item-button[title="Paint Format"]')!;
      expect(paintFormatTool.classList.contains("active")).toBeFalsy();

      await click(paintFormatTool);
      expect(paintFormatTool.classList.contains("active")).toBeTruthy();

      parent.env.getStore(PaintFormatStore).pasteFormat(target("B2"));
      await nextTick();
      expect(paintFormatTool.classList.contains("active")).toBeFalsy();
    });

    test("Double click to activate and keep it", async () => {
      const { parent } = await mountParent();
      const paintFormatTool = fixture.querySelector('.o-menu-item-button[title="Paint Format"]')!;
      expect(paintFormatTool.classList.contains("active")).toBeFalsy();

      await doubleClick(paintFormatTool);
      expect(paintFormatTool.classList.contains("active")).toBeTruthy();

      parent.env.getStore(PaintFormatStore).pasteFormat(target("B2"));
      expect(paintFormatTool.classList.contains("active")).toBeTruthy();
    });

    test("When paint format (single) is activated, single click will exit paint format mode", async () => {
      await mountParent();
      const paintFormatTool = fixture.querySelector('.o-menu-item-button[title="Paint Format"]')!;
      await click(paintFormatTool);
      expect(paintFormatTool.classList.contains("active")).toBeTruthy();

      await click(paintFormatTool);
      expect(paintFormatTool.classList.contains("active")).toBeFalsy();
    });

    test("When paint format (persistent) is activated, single click will exit paint format mode", async () => {
      await mountParent();
      const paintFormatTool = fixture.querySelector('.o-menu-item-button[title="Paint Format"]')!;
      await doubleClick(paintFormatTool);
      expect(paintFormatTool.classList.contains("active")).toBeTruthy();

      await click(paintFormatTool);
      expect(paintFormatTool.classList.contains("active")).toBeFalsy();
    });
  });

  describe("Filter Tool", () => {
    let model: Model;
    const createFilterTool = '.o-menu-item-button[title="Add filters"]';
    const removeFilterTool = '.o-menu-item-button[title="Remove selected filters"]';

    beforeEach(async () => {
      ({ model } = await mountParent());
    });

    test("Filter tool is enabled with single selection", async () => {
      setSelection(model, ["A2:B3"]);
      await nextTick();
      const filterTool = fixture.querySelector(createFilterTool)!;
      expect(filterTool.classList.contains("o-disabled")).toBeFalsy();
    });

    test("Filter tool is enabled with selection of multiple continuous zones", async () => {
      setSelection(model, ["A1", "A2"]);
      await nextTick();
      const filterTool = fixture.querySelector(createFilterTool)!;
      expect(filterTool.classList.contains("o-disabled")).toBeFalsy();
    });

    test("Filter tool is disabled with selection of multiple non-continuous zones", async () => {
      setSelection(model, ["A1", "B5"]);
      await nextTick();
      const filterTool = fixture.querySelector(createFilterTool)!;
      expect(filterTool.classList.contains("o-disabled")).toBeTruthy();
    });

    test("Filter tool change from create filter to remove filter when a filter is selected", async () => {
      createTableWithFilter(model, "A2:B3");
      await nextTick();
      expect(fixture.querySelectorAll(removeFilterTool).length).toEqual(0);
      expect(fixture.querySelectorAll(createFilterTool).length).toEqual(1);

      setSelection(model, ["A1", "B2"]);
      await nextTick();
      expect(fixture.querySelectorAll(removeFilterTool).length).toEqual(1);
      expect(fixture.querySelectorAll(createFilterTool).length).toEqual(0);
    });

    test("Adjacent cells selection while creating table on single cell", async () => {
      setCellContent(model, "A1", "A");
      setCellContent(model, "A2", "A3");
      setCellContent(model, "B2", "B");
      setCellContent(model, "B3", "3");
      setCellContent(model, "C3", "B4");
      setCellContent(model, "C4", "Hello");
      setCellContent(model, "D4", "2");
      selectCell(model, "A1");
      await simulateClick(createFilterTool);
      await nextTick();
      const selection = model.getters.getSelectedZone();
      expect(zoneToXc(selection)).toEqual("A1:D4");
      expect(getTable(model, "A1")!.range.zone).toEqual(toZone("A1:D4"));
    });
  });

  test("can clear formatting", async () => {
    const model = new Model();
    selectCell(model, "B1");
    setZoneBorders(model, { position: "all" });
    expect(getBorder(model, "B1")).toBeDefined();
    await mountParent(model);
    const clearFormatTool = fixture.querySelector(
      '.o-menu-item-button[title="Clear formatting (Ctrl+<)"]'
    )!;
    await click(clearFormatTool);
    expect(getCell(model, "B1")).toBeUndefined();
  });

  test("can set cell format", async () => {
    const { model } = await mountParent();
    expect(getCell(model, "A1")).toBeUndefined();
    const formatTool = fixture.querySelector('.o-menu-item-button[title="More formats"]')!;
    await click(formatTool);
    expect(fixture).toMatchSnapshot();
    await click(fixture, `.o-menu-item[title="Percent"]`);
    expect(getCell(model, "A1")!.format).toEqual("0.00%");
  });

  test("can set font size", async () => {
    const { model } = await mountParent();
    const fontSizeText = fixture.querySelector("input.o-font-size")! as HTMLInputElement;
    expect(fontSizeText.value.trim()).toBe(DEFAULT_FONT_SIZE.toString());
    await click(fixture, ".o-font-size-editor");
    // ensure the input is no longer selected (not automaticly done by click in jsdom)
    fontSizeText.blur();
    await click(fixture, '.o-text-options [data-size="8"]');
    expect(fontSizeText.value.trim()).toBe("8");
    expect(getStyle(model, "A1").fontSize).toBe(8);
  });

  test("prevents default behavior of mouse wheel event on font size input", async () => {
    await mountParent();
    const fontSizeInput = fixture.querySelector("input.o-font-size") as HTMLInputElement;

    const event = new WheelEvent("wheel", { deltaY: 100 });
    const preventDefaultSpy = jest.spyOn(event, "preventDefault");

    fontSizeInput.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  describe("horizontal align", () => {
    test.each([
      ["Left (Ctrl+Shift+L)", { align: "left" }],
      ["Center (Ctrl+Shift+E)", { align: "center" }],
      ["Right (Ctrl+Shift+R)", { align: "right" }],
    ])("can set horizontal alignment '%s' with the toolbar", async (iconTitle, expectedStyle) => {
      const { model } = await mountParent();
      await click(fixture, '.o-menu-item-button[title="Horizontal align"]');
      await click(fixture, `.o-menu-item-button[title="${iconTitle}"]`);
      expect(model.getters.getCurrentStyle()).toEqual(expectedStyle);
    });
    test.each([
      ["text", {}, "Left (Ctrl+Shift+L)"],
      ["0", {}, "Right (Ctrl+Shift+R)"],
      ["0", { align: "left" }, "Left (Ctrl+Shift+L)"],
      ["0", { align: "center" }, "Center (Ctrl+Shift+E)"],
      ["0", { align: "right" }, "Right (Ctrl+Shift+R)"],
    ])(
      "alignment icon options in top bar matches the selected cell (content: %s, style: %s)",
      async (content, style, expectedTitleActive) => {
        const model = new Model();
        setCellContent(model, "A1", content);
        setStyle(model, "A1", style as Style);
        await mountParent(model);
        await click(fixture, '.o-menu-item-button[title="Horizontal align"]');
        const expectedButtonActive = fixture.querySelector(
          `.o-menu-item-button[title="${expectedTitleActive}"]`
        )!;
        expect(expectedButtonActive!.classList).toContain("active");
      }
    );
  });

  describe("vertical align", () => {
    test.each([
      ["Top", { verticalAlign: "top" }],
      ["Middle", { verticalAlign: "middle" }],
      ["Bottom", { verticalAlign: "bottom" }],
    ])("can set vertical alignmen '%s't with the toolbar", async (iconTitle, expectedStyle) => {
      const { model } = await mountParent();
      await click(fixture, '.o-menu-item-button[title="Vertical align"]');
      await click(fixture, `.o-menu-item-button[title="${iconTitle}"]`);
      expect(model.getters.getCurrentStyle()).toEqual(expectedStyle);
    });
    test.each([
      ["text", {}, "Bottom"],
      ["0", {}, "Bottom"],
      ["0", { verticalAlign: "top" }, "Top"],
      ["0", { verticalAlign: "middle" }, "Middle"],
      ["0", { verticalAlign: "bottom" }, "Bottom"],
    ])(
      "alignment icon options in top bar matches the selected cell (content: %s, style: %s)",
      async (content, style, expectedTitleActive) => {
        const model = new Model();
        setCellContent(model, "A1", content);
        setStyle(model, "A1", style as Style);
        await mountParent(model);
        await click(fixture, '.o-menu-item-button[title="Vertical align"]');
        const expectedButtonActive = fixture.querySelector(
          `.o-menu-item-button[title="${expectedTitleActive}"]`
        )!;
        expect(expectedButtonActive!.classList).toContain("active");
      }
    );
  });

  describe("text wrapping", () => {
    test.each([
      ["Overflow", { wrapping: "overflow" }],
      ["Wrap", { wrapping: "wrap" }],
      ["Clip", { wrapping: "clip" }],
    ])("can set the wrapping state '%s' with the toolbar", async (iconTitle, expectedStyle) => {
      const { model } = await mountParent();
      await click(fixture, '.o-menu-item-button[title="Wrapping"]');
      await click(fixture, `.o-menu-item-button[title="${iconTitle}"]`);
      expect(model.getters.getCurrentStyle()).toEqual(expectedStyle);
    });
    test.each([
      ["text", {}, "Overflow"],
      ["0", {}, "Overflow"],
      ["0", { wrapping: "overflow" }, "Overflow"],
      ["0", { wrapping: "wrap" }, "Wrap"],
      ["0", { wrapping: "clip" }, "Clip"],
    ])(
      "wrapping icon options in the top bar matches the selected cell (content: %s, style: %s)",
      async (content, style, expectedTitleActive) => {
        const model = new Model();
        setCellContent(model, "A1", content);
        setStyle(model, "A1", style as Style);
        await mountParent(model);
        await click(fixture, '.o-menu-item-button[title="Wrapping"]');
        const expectedButtonActive = fixture.querySelector(
          `.o-menu-item-button[title="${expectedTitleActive}"]`
        );
        expect(expectedButtonActive!.classList).toContain("active");
      }
    );
  });

  test("opening, then closing same menu", async () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    await mountParent(model);

    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
    await click(fixture, '.o-menu-item-button[title="Vertical align"]');
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    await click(fixture, '.o-menu-item-button[title="Vertical align"]');
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
  });

  test("Can open a Topbar menu", async () => {
    const { parent } = await mountParent();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    const env = parent.env;
    const items = topbarMenuRegistry.getMenuItems();
    const number = items.filter(
      (item) => item.children(env).length !== 0 && item.isVisible(env)
    ).length;
    expect(fixture.querySelectorAll(".o-topbar-menu")).toHaveLength(number);
    await click(fixture, ".o-topbar-menu[data-id='edit']");
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    const edit = getNode(["edit"], env, topbarMenuRegistry);
    const numberChild = edit.children(parent.env).filter((item) => item.isVisible(env)).length;
    expect(fixture.querySelectorAll(".o-menu-item")).toHaveLength(numberChild);
    await click(fixture, ".o-spreadsheet-topbar");
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
  });

  test("Can open a Topbar menu with pointermove", async () => {
    const { parent } = await mountParent();
    const env = parent.env;
    await click(fixture, ".o-topbar-menu[data-id='edit']");
    const edit = getNode(["edit"], env, topbarMenuRegistry);
    let numberChild = edit.children(env).filter((item) => item.isVisible(env)).length;
    expect(fixture.querySelectorAll(".o-menu-item")).toHaveLength(numberChild);
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    triggerMouseEvent(".o-topbar-menu[data-id='insert']", "mouseover");
    await nextTick();
    const insert = getNode(["insert"], env, topbarMenuRegistry);
    numberChild = insert?.children(parent.env).filter((item) => item.isVisible(parent.env)).length;
    expect(fixture.querySelectorAll(".o-menu-item")).toHaveLength(numberChild);
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
  });

  test("Can click on a menuItem do execute action and close menus", async () => {
    const menuDefinitions = Object.assign({}, topbarMenuRegistry.content);
    let number = 0;
    addToRegistry(topbarMenuRegistry, "test", { name: "Test", sequence: 1 });
    topbarMenuRegistry.addChild("testaction", ["test"], {
      name: "TestAction",
      sequence: 1,
      execute: () => {
        number++;
      },
    });
    const { fixture } = await mountParent();
    await click(fixture, ".o-topbar-menu[data-id='test']");
    await click(fixture, ".o-menu-item");
    expect(fixture.querySelectorAll(".o-menu-dropdown-content")).toHaveLength(0);
    expect(number).toBe(1);
    topbarMenuRegistry.content = menuDefinitions;
  });

  test("Opened menu parent is highlighted", async () => {
    await mountParent();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    const menuItem = fixture.querySelector(".o-topbar-menu[data-id='edit']");
    expect(menuItem?.classList).not.toContain("active");
    await click(fixture, ".o-topbar-menu[data-id='edit']");
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    expect(menuItem?.classList).toContain("active");
    // close the menu by clicking on menu item
    await click(fixture.querySelector('.o-menu-item[title="Copy"]')!);
    expect(menuItem?.classList).not.toContain("active");
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
  });

  test("Can add a custom component to topbar", async () => {
    const compDefinitions = Object.assign({}, topbarComponentRegistry.content);
    addToRegistry(topbarComponentRegistry, "1", { component: Comp, sequence: 1 });
    await mountParent();
    expect(fixture.querySelectorAll(".o-topbar-test")).toHaveLength(1);
    topbarComponentRegistry.content = compDefinitions;
  });

  test("Can add multiple components to topbar with different visibilities", async () => {
    const compDefinitions = Object.assign({}, topbarComponentRegistry.content);
    let comp1Visibility = false;
    addToRegistry(topbarComponentRegistry, "first", {
      component: Comp1,
      isVisible: () => {
        return comp1Visibility;
      },
      sequence: 1,
    });
    addToRegistry(topbarComponentRegistry, "second", { component: Comp2, sequence: 2 });
    const { parent } = await mountParent();
    expect(fixture.querySelectorAll(".o-topbar-test1")).toHaveLength(0);
    expect(fixture.querySelectorAll(".o-topbar-test2")).toHaveLength(1);

    comp1Visibility = true;
    parent.render();
    await nextTick();
    expect(fixture.querySelectorAll(".o-topbar-test1")).toHaveLength(1);
    expect(fixture.querySelectorAll(".o-topbar-test2")).toHaveLength(1);

    // reset Top Component Registry
    topbarComponentRegistry.content = compDefinitions;
  });

  test("Readonly spreadsheet has a specific top bar", async () => {
    const { model } = await mountParent();

    expect(fixture.querySelectorAll(".o-readonly-toolbar")).toHaveLength(0);
    model.updateMode("readonly");
    await nextTick();
    expect(fixture.querySelectorAll(".o-readonly-toolbar")).toHaveLength(1);
    await click(fixture, ".o-topbar-menu[data-id='insert']");
    const insertMenuItems = fixture.querySelectorAll(".o-menu div.o-menu-item");
    expect([...insertMenuItems].every((item) => item.classList.contains("disabled"))).toBeTruthy();
  });

  test("Cannot edit cell in a readonly spreadsheet", async () => {
    const model = new Model({}, { mode: "readonly" });
    ({ fixture, parent } = await mountParent(model));
    const composerStore = parent.env.getStore(CellComposerStore);

    const composerEl = fixture.querySelector(".o-spreadsheet-topbar div.o-composer")!;
    expect(composerEl.attributes.getNamedItem("contentEditable")!.value).toBe("false");
    await simulateClick(composerEl);

    // Won't update the current content
    const content = composerStore.currentContent;
    expect(content).toBe("");
    await typeInComposerTopBar("tabouret", false);
    expect(composerStore.currentContent).toBe(content);
  });

  test("Keep focus on the composer when clicked in readonly mode", async () => {
    ({ fixture } = await mountParent(new Model({}, { mode: "readonly" })));

    const topBarComposerEl = fixture.querySelector<HTMLElement>(".o-topbar-composer")!;
    expect(topBarComposerEl.classList).toContain("o-topbar-composer-readonly");
    const composerEl = fixture.querySelector<HTMLElement>(".o-spreadsheet-topbar div.o-composer")!;
    expect(document.activeElement).not.toBe(composerEl);
    await simulateClick(composerEl);
    expect(document.activeElement).toBe(composerEl);
  });

  test.each([
    ["Horizontal align", ".o-dropdown-content"],
    ["Vertical align", ".o-dropdown-content"],
    ["Wrapping", ".o-dropdown-content"],
    ["Font Size", ".o-text-options"],
    ["More formats", ".o-menu"],
  ])(
    "Clicking a static element inside a dropdown '%s' don't close the dropdown",
    async (toolName: string, dropdownContentSelector: string) => {
      ({ fixture } = await mountParent());
      await click(fixture, `[title="${toolName}"]`);
      expect(fixture.querySelector(dropdownContentSelector)).toBeTruthy();
      await simulateClick(dropdownContentSelector);
      await nextTick();
      expect(fixture.querySelector(dropdownContentSelector)).toBeTruthy();
    }
  );

  test.each([["Fill Color", "Text Color"]])(
    "Clicking a static element inside the color picker *%s* dont close the color picker dropdown",
    async (toolName: string) => {
      await mountParent();

      await simulateClick(`.o-menu-item-button[title="${toolName}"]`);
      await nextTick();
      expect(fixture.querySelector(".o-color-picker")).toBeTruthy();
      await simulateClick(".o-color-picker");
      await nextTick();
      expect(fixture.querySelector(".o-color-picker")).toBeTruthy();
    }
  );

  test("can insert an image", async () => {
    const fileStore = new FileStore();
    const model = new Model({}, { external: { fileStore } });
    await mountParent(model);
    const sheetId = model.getters.getActiveSheetId();
    await simulateClick(".o-topbar-menu[data-id='insert']");
    await simulateClick(".o-menu-item[data-name='insert_image']");
    expect(getFigureIds(model, sheetId)).toHaveLength(1);
  });

  test("top bar composer displays formula", async () => {
    const { model } = await mountParent();
    const topbarComposerElement = fixture.querySelector(
      ".o-spreadsheet-topbar .o-composer-container div"
    )!;
    setCellContent(model, "A1", "=A1+A2");
    await nextTick();
    expect(topbarComposerElement.textContent).toBe("=A1+A2");
  });
});

test("Can show/hide a TopBarComponent based on condition", async () => {
  const compDefinitions = Object.assign({}, topbarComponentRegistry.content);
  addToRegistry(topbarComponentRegistry, "1", {
    component: Comp1,
    isVisible: (env) => true,
    sequence: 1,
  });
  addToRegistry(topbarComponentRegistry, "2", {
    component: Comp2,
    isVisible: (env) => false,
    sequence: 2,
  });
  await mountParent();
  expect(fixture.querySelectorAll(".o-topbar-test1")).toHaveLength(1);
  expect(fixture.querySelectorAll(".o-topbar-test2")).toHaveLength(0);
  topbarComponentRegistry.content = compDefinitions;
});

describe("TopBar - Custom currency", () => {
  test("can open custom currency sidepanel from tool", async () => {
    const { fixture } = await mountSpreadsheet({
      model: new Model({}, { external: { loadCurrencies: async () => [] as Currency[] } }),
    });
    await click(fixture, ".o-menu-item-button[title='More formats']");
    await click(fixture, ".o-menu-item[title='Custom currency']");
    expect(fixture.querySelector(".o-custom-currency")).toBeTruthy();
  });
});

describe("Format", () => {
  test("can clear format", async () => {
    const { model, fixture } = await mountSpreadsheet();
    setStyle(model, "A1, B2:B3", { fillColor: "#000000" });
    selectCell(model, "A1");
    addCellToSelection(model, "B2");
    setAnchorCorner(model, "B3");
    expect(getCell(model, "A1")?.style).toEqual({ fillColor: "#000000" });
    expect(getCell(model, "B2")?.style).toEqual({ fillColor: "#000000" });
    expect(getCell(model, "B3")?.style).toEqual({ fillColor: "#000000" });
    await click(fixture, ".o-topbar-menu[data-id='format']");
    await click(fixture, ".o-menu-item[data-name='format_clearFormat']");
    expect(getCell(model, "A1")?.style).toBeUndefined();
    expect(getCell(model, "B2")?.style).toBeUndefined();
    expect(getCell(model, "B3")?.style).toBeUndefined();
  });
});

describe("TopBar - CF", () => {
  test("open sidepanel with no CF in selected zone", async () => {
    const { fixture } = await mountSpreadsheet();
    await click(fixture, ".o-topbar-menu[data-id='format']");
    await click(fixture, ".o-menu-item[data-name='format_cf']");
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeTruthy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeFalsy();
  });

  test("open sidepanel with one CF in selected zone", async () => {
    const { model, fixture } = await mountSpreadsheet();

    const cfRule: ConditionalFormat = {
      ranges: ["A1:C7"],
      id: "1",
      rule: {
        values: ["2"],
        operator: "isEqual",
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

    await click(fixture, ".o-topbar-menu[data-id='format']");
    await click(fixture, ".o-menu-item[data-name='format_cf']");
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeFalsy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeTruthy();
  });

  test("open sidepanel with with more then one CF in selected zone", async () => {
    const { model, fixture } = await mountSpreadsheet();

    const cfRule1: ConditionalFormat = {
      ranges: ["A1:C7"],
      id: "1",
      rule: {
        values: ["2"],
        operator: "isEqual",
        type: "CellIsRule",
        style: { fillColor: "#FF0000" },
      },
    };
    const cfRule2: ConditionalFormat = {
      ranges: ["A1:C7"],
      id: "2",
      rule: {
        values: ["3"],
        operator: "isEqual",
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

    await click(fixture, ".o-topbar-menu[data-id='format']");
    await click(fixture, ".o-menu-item[data-name='format_cf']");
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeTruthy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeFalsy();
  });

  test("will update sidepanel if we reopen it from other cell", async () => {
    const { model, fixture } = await mountSpreadsheet();

    const cfRule1: ConditionalFormat = {
      ranges: ["A1:A10"],
      id: "1",
      rule: {
        values: ["2"],
        operator: "isEqual",
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
    await click(fixture, ".o-topbar-menu[data-id='format']");
    await click(fixture, ".o-menu-item[data-name='format_cf']");
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeFalsy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeTruthy();

    setSelection(model, ["F6"]);
    await click(fixture, ".o-topbar-menu[data-id='format']");
    await click(fixture, ".o-menu-item[data-name='format_cf']");
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeTruthy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeFalsy();
  });
});

describe("Topbar - menu item resizing with viewport", () => {
  test("color picker of fill color in top bar is resized with screen size change", async () => {
    const { model, fixture } = await mountParent();
    await click(fixture, '.o-menu-item-button[title="Fill Color"]');
    let height = getElComputedStyle(".o-popover", "maxHeight");
    expect(parseInt(height)).toBe(
      model.getters.getVisibleRect(model.getters.getActiveMainViewport()).height
    );
    model.dispatch("RESIZE_SHEETVIEW", { width: 300, height: 100 });
    spreadsheetHeight = 100;
    window.resizers.resize();
    await nextTick();
    height = getElComputedStyle(".o-popover", "maxHeight");
    expect(parseInt(height)).toBe(
      model.getters.getVisibleRect(model.getters.getActiveMainViewport()).height
    );
  });

  test("color picker of text color in top bar is resized with screen size change", async () => {
    const { model, fixture } = await mountParent();
    await click(fixture, '.o-menu-item-button[title="Text Color"]');
    let height = getElComputedStyle(".o-popover", "maxHeight");
    expect(parseInt(height)).toBe(
      model.getters.getVisibleRect(model.getters.getActiveMainViewport()).height
    );
    model.dispatch("RESIZE_SHEETVIEW", { width: 300, height: 100 });
    spreadsheetHeight = 100;
    window.resizers.resize();
    await nextTick();
    height = getElComputedStyle(".o-popover", "maxHeight");
    expect(parseInt(height)).toBe(
      model.getters.getVisibleRect(model.getters.getActiveMainViewport()).height
    );
  });
});

test("The composer helper should be closed on toggle topbar context menu", async () => {
  const { parent, fixture } = await mountSpreadsheet();
  const composerStore = parent.env.getStore(CellComposerStore);
  await typeInComposerTopBar("=sum(");
  expect(composerStore.editionMode).not.toBe("inactive");
  expect(fixture.querySelectorAll(".o-composer-assistant")).toHaveLength(1);
  await simulateClick(".o-topbar-topleft .o-topbar-menu");
  expect(composerStore.editionMode).toBe("inactive");
  expect(fixture.querySelectorAll(".o-composer-assistant")).toHaveLength(0);
});

test("The menu items are orderer by their sequence", async () => {
  addToRegistry(topbarMenuRegistry, "test", {
    sequence: 1,
    name: "test",
  });
  topbarMenuRegistry.addChild("second", ["test"], {
    name: "second",
    sequence: 2,
  });
  topbarMenuRegistry.addChild("first", ["test"], {
    name: "first",
    sequence: 1,
  });
  topbarMenuRegistry.addChild("third", ["test"], {
    name: "third",
    sequence: 3,
  });
  const { fixture } = await mountSpreadsheet();
  await click(fixture, ".o-topbar-menu[data-id='test']");
  const menuItems: NodeListOf<HTMLElement> = fixture.querySelectorAll(".o-menu-item");
  expect(menuItems[0].dataset.name).toBe("first");
  expect(menuItems[1].dataset.name).toBe("second");
  expect(menuItems[2].dataset.name).toBe("third");
});

describe("Topbar svg icon", () => {
  test.each([
    [{ align: "left" }, "Horizontal align", "align-left"],
    [{ align: "center" }, "Horizontal align", "align-center"],
    [{ align: "right" }, "Horizontal align", "align-right"],
    [{ verticalAlign: "top" }, "Vertical align", "align-top"],
    [{ verticalAlign: "middle" }, "Vertical align", "align-middle"],
    [{ verticalAlign: "bottom" }, "Vertical align", "align-bottom"],
    [{ wrapping: "clip" }, "Wrapping", "wrapping-clip"],
    [{ wrapping: "wrap" }, "Wrapping", "wrapping-wrap"],
    [{ wrapping: "overflow" }, "Wrapping", "wrapping-overflow"],
  ])("Icon in top bar matches the selected cell style", async (style, buttonTitle, iconClass) => {
    const model = new Model();
    setStyle(model, "A1", style as Style);

    ({ fixture } = await mountSpreadsheet({ model }));

    const icon = fixture.querySelector(`.o-menu-item-button[title="${buttonTitle}"] svg`);
    expect(icon?.classList.contains(iconClass)).toBeTruthy();
  });
});

test("Clicking on a topbar button triggers two renders", async () => {
  jest.useFakeTimers();
  const transportService = new MockTransportService();

  const model = new Model({}, { transportService });
  const { fixture, env } = await mountSpreadsheet({ model });
  jest.advanceTimersByTime(DEBOUNCE_TIME + 10); // wait for the debounce of session.move
  jest.useRealTimers();

  const modelRender = jest.fn();
  const storeRender = jest.fn();
  model.on("update", {}, modelRender);
  env["__spreadsheet_stores__"].on("store-updated", null, storeRender);

  await click(fixture, ".o-spreadsheet-topbar [title='Bold (Ctrl+B)']");

  // two renders from the model (one from the command handling and one from the collaborative session)
  expect(modelRender).toHaveBeenCalledTimes(2);
  expect(storeRender).toHaveBeenCalledTimes(0);
});

describe("Responsive Top bar behaviour", () => {
  const categories = topBarToolBarRegistry.getCategories();
  describe("items are hidden when the screen is resized", () => {
    const topbarToolsWidthThresholds = [750, 650];
    const widthThresholds = topbarToolsWidthThresholds.map((threshold, index) => [
      threshold,
      index,
    ]);

    test.each(widthThresholds)("Screen slightly smaller than %spx ", async (threshold, index) => {
      spreadsheetWidth = threshold - 1;
      await mountParent();
      await nextTick();
      const tools = [...fixture.querySelectorAll(".o-toolbar-tools .tool-container")].filter(
        (element) => !element.classList.contains("d-none")
      );
      expect(tools.length).toBe(categories.length - (index + 1));
    });

    test("toolbar items hidden are available in a popover", async () => {
      await mountParent();

      expect(fixture.querySelector('.o-menu-item-button[title="Vertical align"]')).not.toBeNull();
      expect(fixture.querySelector('.o-menu-item-button[title="Horizontal align"]')).not.toBeNull();
      expect(fixture.querySelector('.o-menu-item-button[title="Wrapping"]')).not.toBeNull();

      spreadsheetWidth = (categories.length - 2) * toolWidth + moreToolsContainerWidth + 1; // hides the last 2 categories
      await nextTick();

      expect(
        fixture
          .querySelector('.o-menu-item-button[title="Vertical align"]')
          ?.closest(".tool-container")?.classList
      ).toContain("d-none");
      expect(
        fixture
          .querySelector('.o-menu-item-button[title="Horizontal align"]')
          ?.closest(".tool-container")?.classList
      ).toContain("d-none");
      expect(
        fixture.querySelector('.o-menu-item-button[title="Wrapping"]')?.closest(".tool-container")
          ?.classList
      ).toContain("d-none");

      await click(fixture, ".more-tools");
      expect(
        fixture.querySelector('.o-popover .o-menu-item-button[title="Vertical align"]')
      ).not.toBeNull();
      expect(
        fixture.querySelector('.o-popover .o-menu-item-button[title="Horizontal align"]')
      ).not.toBeNull();
      expect(
        fixture.querySelector('.o-popover .o-menu-item-button[title="Wrapping"]')
      ).not.toBeNull();
    });
  });

  test("the popover should close when the screen is resized", async () => {
    spreadsheetWidth = (toolWidth * categories.length) / 2;
    const { parent } = await mountParent();
    await nextTick();
    await click(fixture, ".more-tools");
    expect(fixture.querySelector(".o-popover")).not.toBeNull();
    spreadsheetWidth += 10;

    parent.render(true);
    await nextTick();
    expect(fixture.querySelector(".o-popover")).toBeNull();
  });

  test("the popover should close when clicking the grid", async () => {
    spreadsheetWidth = (toolWidth * categories.length) / 2;
    const { fixture } = await mountSpreadsheet();
    await nextTick();
    await click(fixture, ".more-tools");
    expect(fixture.querySelector(".o-popover")).not.toBeNull();

    await click(fixture, ".o-grid");
    expect(fixture.querySelector(".o-popover")).toBeNull();
  });

  test("the popover should close when clicking visible tools", async () => {
    spreadsheetWidth = (toolWidth * categories.length) / 2;
    await mountParent();
    await nextTick();
    await click(fixture, ".more-tools");
    expect(fixture.querySelector(".o-popover")).not.toBeNull();
    await click(fixture, '.o-menu-item-button[title="Format as percent"]');
    expect(fixture.querySelector(".o-popover")).toBeNull();
  });

  test("the popover should close when clicking top bar menus", async () => {
    spreadsheetWidth = (toolWidth * categories.length) / 2;
    await mountParent();
    await nextTick();
    await click(fixture, ".more-tools");
    const menuInPopoverSelector = '.o-popover .o-menu-item-button[title="Vertical align"]';
    expect(fixture.querySelector(menuInPopoverSelector)).not.toBeNull();
    await click(fixture, ".o-topbar-menu[data-id='edit']");
    expect(fixture.querySelector(menuInPopoverSelector)).toBeNull();
  });

  test("Use a color picker from the popover", async () => {
    // Hide the text Style section
    const index = categories.findIndex((category) => category === "cellStyle");
    spreadsheetWidth = index * toolWidth + moreToolsContainerWidth + 1;

    const model = new Model();
    await mountParent(model);
    await nextTick();
    await click(fixture, ".more-tools");
    await click(fixture, '.o-popover .o-menu-item-button[title="Fill Color"]');
    await click(fixture, ".o-color-picker-line-item:nth-child(2)");
    expect(getStyle(model, "A1").fillColor).toBe("#434343");
  });

  test("use an action button from the popover", async () => {
    // Hide a section with an action button
    const index = categories.findIndex((category) => category === "textStyle");
    spreadsheetWidth = index * toolWidth + moreToolsContainerWidth + 1;
    const model = new Model();
    await mountParent(model);
    await nextTick();
    await click(fixture, ".more-tools");
    await click(fixture, '.o-popover .o-menu-item-button[title="Strikethrough"]');
    expect(getStyle(model, "A1").strikethrough).toBeTruthy();
    await click(fixture, '.o-popover .o-menu-item-button[title="Strikethrough"]');
    expect(getStyle(model, "A1").strikethrough).toBeFalsy();
  });

  test("Use a dropdown item from the popover", async () => {
    spreadsheetWidth = 550;
    const model = new Model();
    await mountParent(model);
    await nextTick();
    await click(fixture, ".more-tools");
    await click(fixture, '.o-popover .o-menu-item-button[title="Vertical align"]');
    await click(fixture, '.o-popover .o-menu-item-button[title="Top"]');
    expect(getStyle(model, "A1").verticalAlign).toBe("top");
  });
});
