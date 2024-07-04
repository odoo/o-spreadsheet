import { Component, xml } from "@odoo/owl";
import { Model } from "../src";
import { ComposerStore } from "../src/components/composer/composer/composer_store";
import { TopBar } from "../src/components/top_bar/top_bar";
import { DEFAULT_FONT_SIZE } from "../src/constants";
import { toZone, zoneToXc } from "../src/helpers";
import { topbarComponentRegistry, topbarMenuRegistry } from "../src/registries";
import { ConditionalFormat, Currency, Pixel, SpreadsheetChildEnv, Style } from "../src/types";
import { FileStore } from "./__mocks__/mock_file_store";
import {
  addCellToSelection,
  createTable,
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
  getFigureIds,
  getNode,
  mountComponent,
  mountSpreadsheet,
  nextTick,
  target,
  toRangesData,
  typeInComposerTopBar,
} from "./test_helpers/helpers";
import { mockGetBoundingClientRect } from "./test_helpers/mock_helpers";

jest.mock("../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);
jest.mock("../src/helpers/figures/images/image_provider", () =>
  require("./__mocks__/mock_image_provider")
);
jest.mock("../src/helpers/uuid", () => require("./__mocks__/uuid"));

mockGetBoundingClientRect({
  "o-spreadsheet": () => ({ x: 0, y: 0, width: 1000, height: 1000 }),
  "o-popover": () => ({ width: 50, height: 50 }),
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
    await mountParent(model);
    const mergeTool = fixture.querySelector('.o-menu-item-button[title="Merge cells"]')!;
    expect(mergeTool.classList.contains("active")).toBeTruthy();

    // increase the selection to A2 (so, it is now A1:B2) => merge tool
    // should not be active
    setAnchorCorner(model, "A2");
    await nextTick();
    expect(mergeTool.classList.contains("active")).toBeFalsy();
  });

  test("multiple selection zones => merge tools is disabled", async () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");

    await mountParent(model);
    const mergeTool = fixture.querySelector('.o-menu-item-button[title="Merge cells"]')!;

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

  describe("Paint format tools", () => {
    test("Single click to activate paint format (once)", async () => {
      const { model } = await mountParent();
      const paintFormatTool = fixture.querySelector('.o-menu-item-button[title="Paint Format"]')!;
      expect(paintFormatTool.classList.contains("active")).toBeFalsy();

      await click(paintFormatTool);
      expect(paintFormatTool.classList.contains("active")).toBeTruthy();

      model.dispatch("PASTE", {
        target: target("B2"),
      }); // to simulate clicking cell to paste format
      await nextTick();
      expect(paintFormatTool.classList.contains("active")).toBeFalsy();
    });

    test("Double click to activate and keep it", async () => {
      const { model } = await mountParent();
      const paintFormatTool = fixture.querySelector('.o-menu-item-button[title="Paint Format"]')!;
      expect(paintFormatTool.classList.contains("active")).toBeFalsy();

      await doubleClick(paintFormatTool);
      expect(paintFormatTool.classList.contains("active")).toBeTruthy();

      model.dispatch("PASTE", {
        target: target("B2"),
      }); // to simulate clicking cell to paste format
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
      createTable(model, "A2:B3");
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
    await click(fixture, '.o-dropdown-content [data-size="8"]');
    expect(fontSizeText.value.trim()).toBe("8");
    expect(getStyle(model, "A1").fontSize).toBe(8);
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
    topbarMenuRegistry.add("test", { name: "Test", sequence: 1 });
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
    topbarComponentRegistry.add("1", { component: Comp, sequence: 1 });
    await mountParent();
    expect(fixture.querySelectorAll(".o-topbar-test")).toHaveLength(1);
    topbarComponentRegistry.content = compDefinitions;
  });

  test("Can add multiple components to topbar with different visibilities", async () => {
    const compDefinitions = Object.assign({}, topbarComponentRegistry.content);
    let comp1Visibility = false;
    topbarComponentRegistry.add("first", {
      component: Comp1,
      isVisible: () => {
        return comp1Visibility;
      },
      sequence: 1,
    });
    topbarComponentRegistry.add("second", { component: Comp2, sequence: 2 });
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
    const composerStore = parent.env.getStore(ComposerStore);

    let composerEl = fixture.querySelector(".o-spreadsheet-topbar div.o-composer")!;
    expect(composerEl.attributes.getNamedItem("contentEditable")!.value).toBe("false");
    await simulateClick(composerEl);

    // Won't update the current content
    const content = composerStore.currentContent;
    expect(content).toBe("");
    composerEl = await typeInComposerTopBar("tabouret", false);
    expect(composerStore.currentContent).toBe(content);
  });

  test("Keep focus on the composer when clicked in readonly mode", async () => {
    ({ fixture } = await mountParent(new Model({}, { mode: "readonly" })));

    let composerEl = fixture.querySelector(".o-spreadsheet-topbar div.o-composer")! as HTMLElement;
    expect(document.activeElement).not.toBe(composerEl);
    await simulateClick(composerEl);
    expect(document.activeElement).toBe(composerEl);
  });

  test.each([
    ["Horizontal align", ".o-dropdown-content"],
    ["Vertical align", ".o-dropdown-content"],
    ["Wrapping", ".o-dropdown-content"],
    ["Font Size", ".o-dropdown-content"],
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
    "Clicking a static element inside the color picker '%s' don't close the color picker dropdown",
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
  topbarComponentRegistry.add("1", {
    component: Comp1,
    isVisible: (env) => true,
    sequence: 1,
  });
  topbarComponentRegistry.add("2", {
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
    await nextTick();
    height = getElComputedStyle(".o-popover", "maxHeight");
    expect(parseInt(height)).toBe(
      model.getters.getVisibleRect(model.getters.getActiveMainViewport()).height
    );
  });
});

test("The composer helper should be closed on toggle topbar context menu", async () => {
  const { parent, fixture } = await mountSpreadsheet();
  const composerStore = parent.env.getStore(ComposerStore);
  await typeInComposerTopBar("=sum(");
  expect(composerStore.editionMode).not.toBe("inactive");
  expect(fixture.querySelectorAll(".o-composer-assistant")).toHaveLength(1);
  await simulateClick(".o-topbar-topleft .o-topbar-menu");
  expect(composerStore.editionMode).toBe("inactive");
  expect(fixture.querySelectorAll(".o-composer-assistant")).toHaveLength(0);
});

test("The menu items are orderer by their sequence", async () => {
  topbarMenuRegistry.add("test", {
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
    await nextTick();

    const icon = fixture.querySelector(`.o-menu-item-button[title="${buttonTitle}"] svg`);
    expect(icon?.classList.contains(iconClass)).toBeTruthy();
  });
});
