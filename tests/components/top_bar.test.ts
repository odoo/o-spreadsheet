import { Component, onMounted, onWillUnmount, useState, xml } from "@odoo/owl";
import { ComposerFocusType } from "../../src/components/spreadsheet/spreadsheet";
import { TopBar } from "../../src/components/top_bar/top_bar";
import { DEFAULT_FONT_SIZE } from "../../src/constants";
import { toZone, zoneToXc } from "../../src/helpers";
import { Model } from "../../src/model";
import { topbarComponentRegistry } from "../../src/registries";
import { topbarMenuRegistry } from "../../src/registries/menus/topbar_menu_registry";
import { ConditionalFormat, Pixel, SpreadsheetChildEnv, Style } from "../../src/types";
import {
  addCellToSelection,
  createFilter,
  selectCell,
  setAnchorCorner,
  setCellContent,
  setSelection,
  setStyle,
} from "../test_helpers/commands_helpers";
import {
  click,
  getElComputedStyle,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import { getBorder, getCell, getFilterTable, getStyle } from "../test_helpers/getters_helpers";
import {
  getFigureIds,
  getNode,
  makeTestEnv,
  mountComponent,
  mountSpreadsheet,
  nextTick,
  toRangesData,
  typeInComposerTopBar,
} from "../test_helpers/helpers";
import { FileStore } from "../__mocks__/mock_file_store";

jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);
jest.mock("../../src/helpers/figures/images/image_provider", () =>
  require("./__mocks__/mock_image_provider")
);
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

let fixture: HTMLElement;

type Props = {
  focusComposer: ComposerFocusType;
};

class Parent extends Component<Props, SpreadsheetChildEnv> {
  static template = xml/* xml */ `
    <div class="o-spreadsheet">
      <TopBar
        focusComposer="state.focusComposer"
        onClick="() => {}"
        onComposerContentFocused="() => {}"
        dropdownMaxHeight="gridHeight"/>
    </div>
  `;
  static components = { TopBar };

  state = useState({ focusComposer: <ComposerFocusType>"inactive" });

  setup() {
    this.state.focusComposer = this.props.focusComposer;
    onMounted(() => this.env.model.on("update", this, () => this.render(true)));
    onWillUnmount(() => this.env.model.off("update", this));
  }

  get gridHeight(): Pixel {
    const { height } = this.env.model.getters.getSheetViewDimension();
    return height;
  }

  setFocusComposer(type: ComposerFocusType) {
    this.state.focusComposer = type;
  }
}

async function mountParent(
  model: Model = new Model(),
  focusComposer: ComposerFocusType = "inactive"
): Promise<{ parent: Parent; model: Model }> {
  const env = makeTestEnv({
    model,
    isDashboard: () => model.getters.isDashboard(),
  });
  let parent: Component;
  ({ parent, fixture } = await mountComponent(Parent, { props: { focusComposer }, env }));
  return { parent: parent as Parent, model };
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
    await click(fixture, ".o-tool[title='Borders']");
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    expect(fixture.querySelectorAll(".o-line-item").length).not.toBe(0);
    await click(fixture, ".o-tool[title='Horizontal align'] span");
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    expect(fixture.querySelectorAll(".o-color-line").length).toBe(0);
  });

  test("Menu should be closed while clicking on composer", async () => {
    await mountParent();
    expect(fixture.querySelectorAll(".o-menu").length).toBe(0);
    await click(fixture, ".o-topbar-menu[data-id='file']");
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
    const mergeTool = fixture.querySelector('.o-tool[title="Merge Cells"]')!;
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
  });

  test("undo/redo tools", async () => {
    const { model } = await mountParent();
    const undoTool = fixture.querySelector('.o-tool[title="Undo"]')!;
    const redoTool = fixture.querySelector('.o-tool[title="Redo"]')!;

    expect(undoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(redoTool.classList.contains("o-disabled")).toBeTruthy();
    setStyle(model, "A1", { bold: true });
    await nextTick();

    expect(undoTool.classList.contains("o-disabled")).toBeFalsy();
    expect(redoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(getCell(model, "A1")!.style).toBeDefined();

    await click(undoTool);
    expect(undoTool.classList.contains("o-disabled")).toBeTruthy();
    expect(redoTool.classList.contains("o-disabled")).toBeFalsy();

    expect(getCell(model, "A1")).toBeUndefined();
  });

  test("paint format tools", async () => {
    await mountParent();
    const paintFormatTool = fixture.querySelector('.o-tool[title="Paint Format"]')!;

    expect(paintFormatTool.classList.contains("active")).toBeFalsy();

    await click(paintFormatTool);

    expect(paintFormatTool.classList.contains("active")).toBeTruthy();
  });

  describe("Filter Tool", () => {
    let model: Model;

    beforeEach(async () => {
      ({ model } = await mountParent());
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

    test("Adjacent cells selection while applying filter on single cell", async () => {
      setCellContent(model, "A1", "A");
      setCellContent(model, "A2", "A3");
      setCellContent(model, "B2", "B");
      setCellContent(model, "B3", "3");
      setCellContent(model, "C3", "B4");
      setCellContent(model, "C4", "Hello");
      setCellContent(model, "D4", "2");
      selectCell(model, "A1");
      await simulateClick(".o-tool.o-filter-tool");
      await nextTick();
      const selection = model.getters.getSelectedZone();
      expect(zoneToXc(selection)).toEqual("A1:D4");
      expect(getFilterTable(model, "A1")!.zone).toEqual(toZone("A1:D4"));
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
    await mountParent(model);
    const clearFormatTool = fixture.querySelector('.o-tool[title="Clear Format"]')!;
    await click(clearFormatTool);
    expect(getCell(model, "B1")).toBeUndefined();
  });

  test("can set cell format", async () => {
    const { model } = await mountParent();
    expect(getCell(model, "A1")).toBeUndefined();
    const formatTool = fixture.querySelector('.o-tool[title="More formats"]')!;
    await click(formatTool);
    expect(fixture).toMatchSnapshot();
    await click(fixture, `[data-format="percent"]`);
    expect(getCell(model, "A1")!.format).toEqual("0.00%");
  });

  test("can set font size", async () => {
    const { model } = await mountParent();
    const fontSizeText = fixture.querySelector("input.o-font-size")! as HTMLInputElement;
    expect(fontSizeText.value.trim()).toBe(DEFAULT_FONT_SIZE.toString());
    const fontSizeTool = fixture.querySelector('span[title="Font Size"]')!;
    fontSizeTool.dispatchEvent(new Event("click"));
    await nextTick();
    const fontSizeList = fixture.querySelector(".o-font-size-editor div.o-dropdown-content")!;
    fontSizeList
      .querySelector('[data-size="8"]')!
      .dispatchEvent(new Event("click", { bubbles: true }));
    await nextTick();
    expect(fontSizeText.value.trim()).toBe("8");
    expect(getStyle(model, "A1").fontSize).toBe(8);
  });

  describe("horizontal align", () => {
    test.each([
      ["align-left", { align: "left" }],
      ["align-center", { align: "center" }],
      ["align-right", { align: "right" }],
    ])(
      "can set horizontal alignment with the toolbar (iconClass: %s)",
      async (iconClass, expectedStyle) => {
        const { model } = await mountParent();
        await click(fixture, ".o-tool[title='Horizontal align']");
        const alignButtons = fixture.querySelectorAll("div.o-dropdown-item")!;
        const button = [...alignButtons].find((element) =>
          element.children[0]!.classList.contains(iconClass)
        )!;
        await click(button);
        expect(model.getters.getCurrentStyle()).toEqual(expectedStyle);
      }
    );
    test.each([
      ["text", {}, "align-left"],
      ["0", {}, "align-right"],
      ["0", { align: "left" }, "align-left"],
      ["0", { align: "center" }, "align-center"],
      ["0", { align: "right" }, "align-right"],
    ])(
      "alignment icon in top bar matches the selected cell (content: %s, style: %s)",
      async (content, style, expectedIconClass) => {
        const model = new Model();
        setCellContent(model, "A1", content);
        setStyle(model, "A1", style as Style);
        await mountParent(model);
        const alignTool = fixture.querySelector('.o-tool[title="Horizontal align"]')!;
        expect(alignTool.querySelector("svg")!.classList).toContain(expectedIconClass);
      }
    );
  });

  describe("vertical align", () => {
    test.each([
      ["align-top", { verticalAlign: "top" }],
      ["align-middle", { verticalAlign: "middle" }],
      ["align-bottom", { verticalAlign: "bottom" }],
    ])(
      "can set vertical alignment with the toolbar (iconClass: %s)",
      async (iconClass, expectedStyle) => {
        const { model } = await mountParent();
        await click(fixture, ".o-tool[title='Vertical align']");
        const alignButtons = fixture.querySelectorAll("div.o-dropdown-item")!;
        const button = [...alignButtons].find((element) =>
          element.children[0]!.classList.contains(iconClass)
        )!;
        await click(button);
        expect(model.getters.getCurrentStyle()).toEqual(expectedStyle);
      }
    );
    test.each([
      ["text", {}, "align-middle"],
      ["0", {}, "align-middle"],
      ["0", { verticalAlign: "top" }, "align-top"],
      ["0", { verticalAlign: "middle" }, "align-middle"],
      ["0", { verticalAlign: "bottom" }, "align-bottom"],
    ])(
      "alignment icon in top bar matches the selected cell (content: %s, style: %s)",
      async (content, style, expectedIconClass) => {
        const model = new Model();
        setCellContent(model, "A1", content);
        setStyle(model, "A1", style as Style);
        await mountParent(model);
        const alignTool = fixture.querySelector('.o-tool[title="Vertical align"]')!;
        expect(alignTool.querySelector("svg")!.classList).toContain(expectedIconClass);
      }
    );
  });

  describe("text wrapping", () => {
    test.each([
      ["wrapping-overflow", { wrapping: "overflow" }],
      ["wrapping-wrap", { wrapping: "wrap" }],
      ["wrapping-clip", { wrapping: "clip" }],
    ])("can set the wrapping state '%s' with the toolbar", async (iconClass, expectedStyle) => {
      const { model } = await mountParent();
      await click(fixture, ".o-tool[title='Text wrapping']");
      const alignButtons = fixture.querySelectorAll("div.o-dropdown-item")!;
      const button = [...alignButtons].find((element) =>
        element.children[0]!.classList.contains(iconClass)
      )!;
      await click(button);
      expect(model.getters.getCurrentStyle()).toEqual(expectedStyle);
    });
    test.each([
      ["text", {}, "wrapping-overflow"],
      ["0", {}, "wrapping-overflow"],
      ["0", { wrapping: "overflow" }, "wrapping-overflow"],
      ["0", { wrapping: "wrap" }, "wrapping-wrap"],
      ["0", { wrapping: "clip" }, "wrapping-clip"],
    ])(
      "wrapping icon in top bar matches the selected cell (content: %s, style: %s)",
      async (content, style, expectedIconClass) => {
        const model = new Model();
        setCellContent(model, "A1", content);
        setStyle(model, "A1", style as Style);
        await mountParent(model);
        const wrapTool = fixture.querySelector('.o-tool[title="Text wrapping"]')!;
        expect(wrapTool.querySelector("svg")!.classList).toContain(expectedIconClass);
      }
    );
  });

  test("opening, then closing same menu", async () => {
    const model = new Model();
    setCellContent(model, "B2", "b2");
    await mountParent(model);

    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
    await click(fixture, '.o-tool[title="Borders"]');
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(1);
    await click(fixture, '.o-tool[title="Borders"]');
    expect(fixture.querySelectorAll(".o-dropdown-content").length).toBe(0);
  });

  test("Can open a Topbar menu", async () => {
    const { parent } = await mountParent();
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
    const items = topbarMenuRegistry.getMenuItems();
    const number = items.filter((item) => item.children(parent.env).length !== 0).length;
    expect(fixture.querySelectorAll(".o-topbar-menu")).toHaveLength(number);
    await click(fixture, ".o-topbar-menu[data-id='file']");
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    const file = getNode(["file"], topbarMenuRegistry);
    const numberChild = file
      .children(parent.env)
      .filter((item) => item.children.length !== 0 || item.action).length;
    expect(fixture.querySelectorAll(".o-menu-item")).toHaveLength(numberChild);
    await click(fixture, ".o-spreadsheet-topbar");
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
  });

  test("Can open a Topbar menu with mousemove", async () => {
    const { parent } = await mountParent();
    await click(fixture, ".o-topbar-menu[data-id='file']");
    const file = getNode(["file"], topbarMenuRegistry);
    let numberChild = file
      .children(parent.env)
      .filter((item) => item.children.length !== 0 || item.action).length;
    expect(fixture.querySelectorAll(".o-menu-item")).toHaveLength(numberChild);
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    triggerMouseEvent(".o-topbar-menu[data-id='insert']", "mouseover");
    await nextTick();
    const insert = getNode(["insert"], topbarMenuRegistry);
    numberChild = insert
      ?.children(parent.env)
      .filter(
        (item) => (item.children.length !== 0 || item.action) && item.isVisible(parent.env)
      ).length;
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
    await mountParent();
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
    expect(menuItem?.classList).not.toContain("o-topbar-menu-active");
    await click(fixture, ".o-topbar-menu[data-id='edit']");
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(1);
    expect(menuItem?.classList).toContain("o-topbar-menu-active");
    await click(fixture.querySelectorAll(".o-menu-item")[0]);
    expect(menuItem?.classList).not.toContain("o-topbar-menu-active");
    expect(fixture.querySelectorAll(".o-menu")).toHaveLength(0);
  });

  test("Can add a custom component to topbar", async () => {
    const compDefinitions = Object.assign({}, topbarComponentRegistry.content);
    class Comp extends Component {
      static template = xml`<div class="o-topbar-test">Test</div>`;
    }
    topbarComponentRegistry.add("1", { component: Comp });
    await mountParent();
    expect(fixture.querySelectorAll(".o-topbar-test")).toHaveLength(1);
    topbarComponentRegistry.content = compDefinitions;
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
    const { parent } = await mountParent(model);

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
  });

  test.each([
    ["Horizontal align", ".o-dropdown-content"],
    ["Vertical align", ".o-dropdown-content"],
    ["Text wrapping", ".o-dropdown-content"],
    ["Borders", ".o-dropdown-content"],
    ["Font Size", ".o-dropdown-content"],
    ["Fill Color", ".o-color-picker"],
    ["Text Color", ".o-color-picker"],
    ["More formats", ".o-dropdown-content"],
  ])(
    "Clicking a static element inside a dropdown '%s' don't close the dropdown",
    async (toolName: string, dropdownContentSelector: string) => {
      await mountParent();

      await simulateClick(`[title="${toolName}"]`);
      await nextTick();
      expect(fixture.querySelector(dropdownContentSelector)).toBeTruthy();
      await simulateClick(dropdownContentSelector);
      await nextTick();
      expect(fixture.querySelector(dropdownContentSelector)).toBeTruthy();
    }
  );

  test("can insert an image", async () => {
    const fileStore = new FileStore();
    const model = new Model({}, { external: { fileStore } });
    await mountSpreadsheet({ model });
    await nextTick();
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
  await mountParent();
  expect(fixture.querySelectorAll(".o-topbar-test1")).toHaveLength(1);
  expect(fixture.querySelectorAll(".o-topbar-test2")).toHaveLength(0);
  topbarComponentRegistry.content = compDefinitions;
});

describe("TopBar - Custom currency", () => {
  test("can open custom currency sidepanel from tool", async () => {
    const { fixture } = await mountSpreadsheet();
    await click(fixture, ".o-tool[title='More formats']");
    await click(fixture, ".o-format-tool div[data-custom='custom_currency']");
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
describe("Topbar - View", () => {
  test("Setting show formula from topbar should retain its state even it's changed via f&r side panel upon closing", async () => {
    const { parent, model, fixture } = await mountSpreadsheet();
    await click(fixture, ".o-topbar-menu[data-id='view']");
    await click(fixture, ".o-menu-item[data-name='view_formulas']");
    expect(model.getters.shouldShowFormulas()).toBe(true);
    parent.env.openSidePanel("FindAndReplace");
    await nextTick();
    expect(model.getters.shouldShowFormulas()).toBe(true);
    await nextTick();
    await click(
      fixture,
      ".o-sidePanel .o-sidePanelBody .o-find-and-replace .o-section:nth-child(1) .o-far-item:nth-child(3) input"
    );
    expect(model.getters.shouldShowFormulas()).toBe(false);
    await click(fixture, ".o-sidePanel .o-sidePanelHeader .o-sidePanelClose");
    expect(model.getters.shouldShowFormulas()).toBe(true);
  });
});

describe("Topbar - menu item resizing with viewport", () => {
  test("font size dropdown in top bar is resized with screen size change", async () => {
    const model = new Model();
    await mountParent(model);
    triggerMouseEvent('[title="Font Size"]', "click");
    await nextTick();
    let height = getElComputedStyle(".o-dropdown-content.o-text-options", "maxHeight");
    expect(parseInt(height)).toBe(
      model.getters.getVisibleRect(model.getters.getActiveMainViewport()).height
    );
    model.dispatch("RESIZE_SHEETVIEW", { width: 300, height: 100 });
    await nextTick();
    height = getElComputedStyle(".o-dropdown-content.o-text-options", "maxHeight");
    expect(parseInt(height)).toBe(
      model.getters.getVisibleRect(model.getters.getActiveMainViewport()).height
    );
  });

  test("color picker of fill color in top bar is resized with screen size change", async () => {
    const model = new Model();
    await mountParent(model);
    triggerMouseEvent('.o-tool[title="Fill Color"]', "click");
    await nextTick();
    let height = getElComputedStyle(".o-color-picker.right", "maxHeight");
    expect(parseInt(height)).toBe(
      model.getters.getVisibleRect(model.getters.getActiveMainViewport()).height
    );
    model.dispatch("RESIZE_SHEETVIEW", { width: 300, height: 100 });
    await nextTick();
    height = getElComputedStyle(".o-color-picker.right", "maxHeight");
    expect(parseInt(height)).toBe(
      model.getters.getVisibleRect(model.getters.getActiveMainViewport()).height
    );
  });

  test("color picker of text color in top bar is resized with screen size change", async () => {
    const model = new Model();
    await mountParent(model);
    triggerMouseEvent('.o-tool[title="Text Color"]', "click");
    await nextTick();
    let height = getElComputedStyle(".o-color-picker.right", "maxHeight");
    expect(parseInt(height)).toBe(
      model.getters.getVisibleRect(model.getters.getActiveMainViewport()).height
    );
    model.dispatch("RESIZE_SHEETVIEW", { width: 300, height: 100 });
    await nextTick();
    height = getElComputedStyle(".o-color-picker.right", "maxHeight");
    expect(parseInt(height)).toBe(
      model.getters.getVisibleRect(model.getters.getActiveMainViewport()).height
    );
  });
});
