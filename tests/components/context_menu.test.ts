import { Component, hooks, tags } from "@odoo/owl";
import { Menu } from "../../src/components/menu";
import { MENU_ITEM_HEIGHT, MENU_VERTICAL_PADDING, TOPBAR_HEIGHT } from "../../src/constants";
import { toXC, toZone } from "../../src/helpers";
import { Model } from "../../src/model";
import { createFullMenuItem, FullMenuItem } from "../../src/registries";
import { cellMenuRegistry } from "../../src/registries/menus/cell_menu_registry";
import { ConditionalFormat, SpreadsheetEnv } from "../../src/types";
import { setCellContent, setSelection } from "../test_helpers/commands_helpers";
import { simulateClick, triggerMouseEvent } from "../test_helpers/dom_helper";
import { getCell, getCellContent } from "../test_helpers/getters_helpers";
import {
  makeTestFixture,
  MockClipboard,
  mountSpreadsheet,
  nextTick,
  Touch,
} from "../test_helpers/helpers";

const { xml } = tags;
const { useSubEnv } = hooks;

let fixture: HTMLElement;
let parent: Component;
let model: Model;

beforeEach(async () => {
  const clipboard = new MockClipboard();
  Object.defineProperty(navigator, "clipboard", {
    get() {
      return clipboard;
    },
    configurable: true,
  });
  fixture = makeTestFixture();
  parent = await mountSpreadsheet(fixture);
  // @ts-ignore
  model = parent.model;
});

afterEach(() => {
  parent.destroy();
  fixture.remove();
});

jest.spyOn(HTMLDivElement.prototype, "clientWidth", "get").mockImplementation(() => 1000);
jest.spyOn(HTMLDivElement.prototype, "clientHeight", "get").mockImplementation(() => 1000);

function getActiveXc(model: Model): string {
  return toXC(...model.getters.getPosition());
}

function getPosition(element: string | Element): {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
} {
  const menu = typeof element === "string" ? fixture.querySelector(element)! : element;
  const {
    top,
    left,
    right,
    bottom,
    width,
    //@ts-ignore
    "max-width": maxWidth,
    height,
    //@ts-ignore
    "max-height": maxHeight,
  } = window.getComputedStyle(menu.parentElement!);

  const rect = {
    top: parseInt(top.replace("px", "")),
    left: parseInt(left.replace("px", "")),
    // In CSS, bottom/right are the distance until the end of the page, not the coordinates
    right: window.innerWidth - parseInt(right.replace("px", "")),
    bottom: window.innerHeight - parseInt(bottom.replace("px", "")),
    // max-width(height) is obviously not the real size of the component, but its the size that was used to compute
    // its position since we didn't know what was the real height before rendering
    width: parseInt(width.replace("px", "")) || parseInt(maxWidth.replace("px", "")),
    height: parseInt(height.replace("px", "")) || parseInt(maxHeight.replace("px", "")),
  };

  if (isNaN(rect.left)) {
    rect.left = rect.right - rect.width;
  }
  if (isNaN(rect.right)) {
    rect.right = rect.left + rect.width;
  }
  if (isNaN(rect.top)) {
    rect.top = rect.bottom - rect.height;
  }
  if (isNaN(rect.bottom)) {
    rect.bottom = rect.top + rect.height;
  }

  return rect;
}

function getMenuPosition() {
  const { left, top } = getPosition(".o-menu");
  return { left, top: top - TOPBAR_HEIGHT };
}

function getSubMenuPosition() {
  const { left, top } = getPosition(fixture.querySelectorAll(".o-menu")[1]);
  return { left, top: top - TOPBAR_HEIGHT };
}

function getItemSize() {
  return MENU_ITEM_HEIGHT;
}

function getSize(menuItemsCount: number): { width: number; height: number } {
  return {
    width: 200,
    height: getItemSize() * menuItemsCount + 2 * MENU_VERTICAL_PADDING,
  };
}

function getMenuSize() {
  const menu = fixture.querySelector(".o-menu");
  const menuItems = menu!.querySelectorAll(".o-menu-item");
  return getSize(menuItems.length);
}

function getSubMenuSize() {
  const menu = fixture.querySelectorAll(".o-menu")[1];
  const menuItems = menu!.querySelectorAll(".o-menu-item");
  return getSize(menuItems.length);
}

interface ContextMenuTestConfig {
  onClose?: () => void;
  menuItems?: FullMenuItem[];
}

async function renderContextMenu(
  x: number,
  y: number,
  testConfig: ContextMenuTestConfig = {},
  width = 1000,
  height = 1000
): Promise<[number, number]> {
  // x, y are relative to the upper left grid corner, but the menu
  // props must take the top bar into account.
  parent = new ContextMenuParent(x, y + TOPBAR_HEIGHT, width, height, new Model(), testConfig);
  //@ts-ignore
  window.innerHeight = height + TOPBAR_HEIGHT;
  //@ts-ignore
  window.innerWidth = width;
  await parent.mount(fixture);
  await nextTick();
  return [x, y];
}

const subMenu: FullMenuItem[] = [
  createFullMenuItem("root", {
    name: "root",
    sequence: 1,
    children: () => [
      createFullMenuItem("subMenu1", {
        name: "subMenu1",
        sequence: 1,
        action() {},
      }),
      createFullMenuItem("subMenu2", {
        name: "subMenu2",
        sequence: 1,
        action() {},
      }),
    ],
  }),
];

const originalGetBoundingClientRect = HTMLDivElement.prototype.getBoundingClientRect;
// @ts-ignore the mock should return a complete DOMRect, not only { top, left }
jest
  .spyOn(HTMLDivElement.prototype, "getBoundingClientRect")
  .mockImplementation(function (this: HTMLDivElement) {
    const menu = this.className.includes("o-menu");
    if (menu) {
      return getPosition(this);
    }
    return originalGetBoundingClientRect.call(this);
  });

class ContextMenuParent extends Component<any, SpreadsheetEnv> {
  static template = xml/* xml */ `
    <div class="o-spreadsheet">
      <Menu
        t-on-close="onClose"
        position="position"
        menuItems="menus"
      />
    </div>
  `;
  static components = { Menu };
  menus: FullMenuItem[];
  position: { x: number; y: number; width: number; height: number };
  onClose: () => void;

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    model: Model,
    { onClose, menuItems }: ContextMenuTestConfig = {}
  ) {
    super();
    useSubEnv({
      getters: model.getters,
    });
    this.onClose = onClose || (() => {});
    this.position = { x, y, width, height };
    this.menus = menuItems || [
      createFullMenuItem("Action", {
        name: "Action",
        sequence: 1,
        action() {},
      }),
    ];
    model.dispatch("RESIZE_VIEWPORT", { height, width });
  }
}

function simulateContextMenu(x, y) {
  triggerMouseEvent("canvas", "mousedown", x, y, { button: 1, bubbles: true });
  triggerMouseEvent("canvas", "mouseup", x, y, { button: 1, bubbles: true });
  triggerMouseEvent("canvas", "contextmenu", x, y, { button: 1, bubbles: true });
}

describe("Context Menu", () => {
  test("context menu simple rendering", async () => {
    simulateContextMenu(300, 200);
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toMatchSnapshot();
  });

  test("right click on a cell opens a context menu", async () => {
    expect(getActiveXc(model)).toBe("A1");
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
    simulateContextMenu(300, 200);
    expect(getActiveXc(model)).toBe("C8");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeTruthy();
  });

  test("right click on a cell, then left click elsewhere closes a context menu", async () => {
    simulateContextMenu(300, 200);
    expect(getActiveXc(model)).toBe("C8");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeTruthy();

    await simulateClick("canvas", 50, 50);
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
  });

  test("can copy/paste with context menu", async () => {
    setCellContent(model, "B1", "b1");

    // right click on B1
    simulateContextMenu(230, 30);
    expect(getActiveXc(model)).toBe("B1");
    await nextTick();

    // click on 'copy' menu item
    await simulateClick(".o-menu div[data-name='copy']");

    // right click on B2
    simulateContextMenu(230, 50);
    await nextTick();
    expect(getActiveXc(model)).toBe("B2");

    // click on 'paste' menu item
    await simulateClick(".o-menu div[data-name='paste']");
    expect(getCellContent(model, "B1")).toBe("b1");
    expect(getCellContent(model, "B2")).toBe("b1");
  });

  test("can cut/paste with context menu", async () => {
    setCellContent(model, "B1", "b1");

    // right click on B1
    simulateContextMenu(230, 30);
    expect(getActiveXc(model)).toBe("B1");
    await nextTick();

    // click on 'cut' menu item
    await simulateClick(".o-menu div[data-name='cut']");

    // right click on B2
    simulateContextMenu(230, 50);
    await nextTick();
    expect(getActiveXc(model)).toBe("B2");

    // click on 'paste' menu item
    await simulateClick(".o-menu div[data-name='paste']");

    expect(getCell(model, "B1")).toBeUndefined();
    expect(getCellContent(model, "B2")).toBe("b1");
  });

  test("menu does not close when right click elsewhere", async () => {
    simulateContextMenu(100, 100);
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeTruthy();
    simulateContextMenu(300, 300);
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeTruthy();
  });

  test("close contextmenu when clicking on menubar", async () => {
    simulateContextMenu(100, 100);
    await nextTick();
    expect(fixture.querySelector(".o-menu .o-menu-item[data-name='cut']")).toBeTruthy();
    triggerMouseEvent(".o-topbar-topleft", "click");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
  });

  test("close contextmenu when clicking on menubar item", async () => {
    simulateContextMenu(100, 100);
    await nextTick();
    expect(fixture.querySelector(".o-menu .o-menu-item[data-name='cut']")).toBeTruthy();
    triggerMouseEvent(".o-topbar-menu[data-id='insert']", "click");
    await nextTick();
    expect(fixture.querySelector(".o-menu .o-menu-item[data-name='cut']")).toBeFalsy();
  });
  test("close contextmenu when clicking on tools bar", async () => {
    simulateContextMenu(100, 100);
    await nextTick();
    expect(fixture.querySelector(".o-menu .o-menu-item[data-name='cut']")).toBeTruthy();
    const fontSizeTool = fixture.querySelector('.o-tool[title="Font Size"]')!;
    triggerMouseEvent(fontSizeTool, "click");
    await nextTick();
    expect(fixture.querySelector(".o-menu .o-menu-item[data-name='cut']")).toBeFalsy();
  });

  test("menu can be hidden/displayed based on the env", async () => {
    const menuDefinitions = Object.assign({}, cellMenuRegistry.content);
    cellMenuRegistry
      .add("visible_action", {
        name: "visible_action",
        sequence: 1,
        isVisible: (env) =>
          env.getters.getCell(env.getters.getActiveSheetId(), 1, 0)!.evaluated.value === "b1",
        action() {},
      })
      .add("hidden_action", {
        name: "hidden_action",
        sequence: 2,
        isVisible: (env) =>
          env.getters.getCell(env.getters.getActiveSheetId(), 1, 0)!.evaluated.value !== "b1",
        action() {},
      });
    setCellContent(model, "B1", "b1");
    simulateContextMenu(230, 30);
    await nextTick();
    expect(fixture.querySelector(".o-menu div[data-name='visible_action']")).toBeTruthy();
    expect(fixture.querySelector(".o-menu div[data-name='hidden_action']")).toBeFalsy();
    cellMenuRegistry.content = menuDefinitions;
  });

  test("submenu opens and close when (un)overed", async () => {
    const menuItems: FullMenuItem[] = [
      createFullMenuItem("action", {
        name: "action",
        sequence: 1,
        action() {},
      }),
      createFullMenuItem("root", {
        name: "root",
        sequence: 2,
        children: () => [
          createFullMenuItem("subMenu", {
            name: "subMenu",
            sequence: 1,
            action() {},
          }),
        ],
      }),
    ];
    await renderContextMenu(300, 300, { menuItems });
    triggerMouseEvent(".o-menu div[data-name='root']", "mouseover");
    await nextTick();
    expect(fixture.querySelector(".o-menu div[data-name='subMenu']")).toBeTruthy();
    triggerMouseEvent(".o-menu div[data-name='action']", "mouseover");
    await nextTick();
    expect(fixture.querySelector(".o-menu div[data-name='subMenu']")).toBeFalsy();
  });

  test("submenu does not open when disabled", async () => {
    const menuItems: FullMenuItem[] = [
      createFullMenuItem("root", {
        name: "root",
        sequence: 1,
        isEnabled: () => false,
        children: () => [
          createFullMenuItem("subMenu", {
            name: "subMenu",
            sequence: 1,
            action() {},
          }),
        ],
      }),
    ];
    await renderContextMenu(300, 300, { menuItems });
    expect(fixture.querySelector(".o-menu div[data-name='root']")!.classList).toContain("disabled");
    await simulateClick(".o-menu div[data-name='root']");
    expect(fixture.querySelector(".o-menu div[data-name='subMenu']")).toBeFalsy();
  });

  test("submenu does not close when sub item overed", async () => {
    await renderContextMenu(300, 300, { menuItems: subMenu });
    triggerMouseEvent(".o-menu div[data-name='root']", "mouseover");
    await nextTick();
    expect(fixture.querySelector(".o-menu div[data-name='subMenu1']")).toBeTruthy();
    triggerMouseEvent(".o-menu div[data-name='subMenu1']", "mouseover");
    await nextTick();
    expect(fixture.querySelector(".o-menu div[data-name='subMenu1']")).toBeTruthy();
  });

  test("menu does not close when root menu is clicked", async () => {
    await renderContextMenu(300, 300, { menuItems: subMenu });
    await simulateClick(".o-menu div[data-name='root']");
    expect(fixture.querySelector(".o-menu div[data-name='subMenu1']")).toBeTruthy();
    expect(fixture.querySelector(".o-menu div[data-name='root']")).toBeTruthy();
  });

  test("menu closed when sub menu item is clicked", async () => {
    const mockCallback = jest.fn(() => {});
    await renderContextMenu(300, 300, {
      onClose: mockCallback,
      menuItems: subMenu,
    });
    await simulateClick(".o-menu div[data-name='root']");
    await simulateClick(".o-menu div[data-name='subMenu1']");
    expect(fixture.querySelector(".o-menu div[data-name='subMenu1']")).toBeFalsy();
    expect(mockCallback).toHaveBeenCalled();
  });

  test("it renders subsubmenus", async () => {
    const menuItems: FullMenuItem[] = [
      createFullMenuItem("root1", {
        name: "root1",
        sequence: 1,
        children: () => [
          createFullMenuItem("root2", {
            name: "root2",
            sequence: 1,
            children: () => [
              createFullMenuItem("subMenu", {
                name: "subMenu",
                sequence: 1,
                action() {},
              }),
            ],
          }),
        ],
      }),
    ];
    await renderContextMenu(300, 990, { menuItems });
    await simulateClick("div[data-name='root1']");
    await simulateClick("div[data-name='root2']");
    expect(fixture.querySelector(".o-menu div[data-name='subMenu']")).toBeTruthy();
  });

  test("Menu with icon is correctly displayed", async () => {
    const menuItems: FullMenuItem[] = [
      createFullMenuItem("root1", {
        name: "root1",
        sequence: 1,
        icon: "not-displayed-class",
        children: () => [
          createFullMenuItem("root2", {
            name: "root2",
            sequence: 1,
            action() {},
            icon: "my-class",
          }),
        ],
      }),
    ];
    await renderContextMenu(300, 990, { menuItems });
    expect(fixture.querySelector("div[data-name='root1'] > i")).toBeNull();
    await simulateClick("div[data-name='root1']");
    expect(fixture.querySelector("div[data-name='root2'] > i")?.classList).toContain("my-class");
  });

  test("Submenus are correctly hidden", async () => {
    const menuItems: FullMenuItem[] = [
      createFullMenuItem("root_1", {
        name: "root_1",
        sequence: 1,
        children: () => [
          createFullMenuItem("root_1_1", {
            name: "root_1_1",
            sequence: 1,
            children: () => [
              createFullMenuItem("subMenu_1", {
                name: "subMenu_1",
                sequence: 1,
                action() {},
              }),
            ],
          }),
        ],
      }),
      createFullMenuItem("root_2", {
        name: "root_2",
        sequence: 2,
        children: () => [
          createFullMenuItem("root_2_1", {
            name: "root_2_1",
            sequence: 1,
            children: () => [
              createFullMenuItem("subMenu_2", {
                name: "subMenu_2",
                sequence: 1,
                action() {},
              }),
            ],
          }),
        ],
      }),
    ];
    await renderContextMenu(300, 300, { menuItems });

    triggerMouseEvent(".o-menu div[data-name='root_1']", "mouseover");
    await nextTick();
    triggerMouseEvent(".o-menu div[data-name='root_1_1']", "mouseover");
    await nextTick();
    expect(fixture.querySelector(".o-menu div[data-name='subMenu_1']")).toBeTruthy();
    triggerMouseEvent(".o-menu div[data-name='root_2']", "mouseover");
    await nextTick();
    expect(fixture.querySelector(".o-menu div[data-name='subMenu_1']")).toBeFalsy();
  });

  test("scroll through the menu with the wheel / scrollbar prevents the grid from scrolling", async () => {
    // @ts-ignore
    const verticalScrollBar = parent.grid.comp.vScrollbar;
    // @ts-ignore
    const horizontalScrollBar = parent.grid.comp.hScrollbar;
    expect(verticalScrollBar.scroll).toBe(0);
    expect(horizontalScrollBar.scroll).toBe(0);

    simulateContextMenu(300, 200);
    await nextTick();

    const menu = fixture.querySelector(".o-menu")!;
    // scroll
    menu.dispatchEvent(
      new WheelEvent("wheel", { deltaY: 300, deltaX: 300, deltaMode: 0, bubbles: true })
    );
    menu.dispatchEvent(new Event("scroll", { bubbles: true }));
    await nextTick();

    // grid always at (0, 0) scroll position
    expect(verticalScrollBar.scroll).toBe(0);
    expect(horizontalScrollBar.scroll).toBe(0);
  });

  test("scroll through the menu with the touch device prevents the grid from scrolling", async () => {
    // @ts-ignore
    const verticalScrollBar = parent.grid.comp.vScrollbar;
    // @ts-ignore
    const horizontalScrollBar = parent.grid.comp.hScrollbar;
    expect(verticalScrollBar.scroll).toBe(0);
    expect(horizontalScrollBar.scroll).toBe(0);

    simulateContextMenu(300, 200);
    await nextTick();

    const menu = fixture.querySelector(".o-menu")!;

    // start move at (310, 210) touch position
    menu.dispatchEvent(
      new TouchEvent("touchstart", {
        bubbles: true,
        cancelable: true,
        touches: [
          new Touch({
            clientX: 310,
            clientY: 210,
            identifier: 1,
            target: menu,
          }),
        ],
      })
    );
    // move down;
    menu.dispatchEvent(
      new TouchEvent("touchmove", {
        bubbles: true,
        cancelable: true,
        touches: [
          new Touch({
            clientX: 310,
            clientY: 180,
            identifier: 2,
            target: menu,
          }),
        ],
      })
    );

    await nextTick();
    // grid always at (0, 0) scroll position
    expect(verticalScrollBar.scroll).toBe(0);
    expect(horizontalScrollBar.scroll).toBe(0);
  });
});

describe("Context Menu position on large screen 1000px/1000px", () => {
  test("it renders menu on the bottom right if enough space", async () => {
    const [clickX, clickY] = await renderContextMenu(300, 300);
    const { left, top } = getMenuPosition();
    expect(left).toBe(clickX);
    expect(top).toBe(clickY);
  });

  test("it renders menu on the top right if not enough space", async () => {
    const [clickX, clickY] = await renderContextMenu(300, 990);
    const { left, top } = getMenuPosition();
    const { height } = getMenuSize();
    expect(left).toBe(clickX);
    expect(top).toBe(clickY - height);
  });

  test("it renders menu on the bottom left if not enough space", async () => {
    const [clickX, clickY] = await renderContextMenu(990, 300);
    const { left, top } = getMenuPosition();
    const { width } = getMenuSize();
    expect(left).toBe(clickX - width);
    expect(top).toBe(clickY);
  });

  test("it renders menu on the top left if not enough space", async () => {
    const [clickX, clickY] = await renderContextMenu(990, 990);
    const { left, top } = getMenuPosition();
    const { width, height } = getMenuSize();
    expect(left).toBe(clickX - width);
    expect(top).toBe(clickY - height);
  });

  test("it renders submenu on the bottom right if enough space", async () => {
    const [clickX, clickY] = await renderContextMenu(300, 300, { menuItems: subMenu });
    await simulateClick("div[data-name='root']");
    const { left, top } = getSubMenuPosition();
    const { width } = getMenuSize();
    expect(left).toBe(clickX + width);
    expect(top).toBe(clickY);
  });

  test("it renders submenu on the bottom left if not enough space", async () => {
    const [clickX, clickY] = await renderContextMenu(780, 300, { menuItems: subMenu });
    await simulateClick("div[data-name='root']");
    const { left, top } = getSubMenuPosition();
    const { width } = getMenuSize();
    const { left: rootLeft } = getMenuPosition();
    expect(rootLeft).toBe(clickX);
    expect(left).toBe(clickX - width);
    expect(top).toBe(clickY);
  });

  test("it renders all menus on the bottom left if not enough space", async () => {
    const [clickX, clickY] = await renderContextMenu(990, 300, { menuItems: subMenu });
    await simulateClick("div[data-name='root']");
    const { left, top } = getSubMenuPosition();
    const { width } = getMenuSize();
    const { left: rootLeft } = getMenuPosition();
    expect(rootLeft).toBe(clickX - width);
    expect(left).toBe(clickX - 2 * width);
    expect(top).toBe(clickY);
  });

  test("it renders submenu on the top right if not enough space", async () => {
    const [clickX, clickY] = await renderContextMenu(300, 960, { menuItems: subMenu });
    await simulateClick("div[data-name='root']");
    const { left, top } = getSubMenuPosition();
    const { height } = getSubMenuSize();
    const { width } = getMenuSize();
    expect(top).toBe(clickY - height + getItemSize());
    expect(left).toBe(clickX + width);
  });

  test("it renders all menus on the top right if not enough space", async () => {
    const [clickX, clickY] = await renderContextMenu(300, 990, { menuItems: subMenu });
    await simulateClick("div[data-name='root']");
    const { left, top } = getSubMenuPosition();
    const { top: rootTop } = getMenuPosition();
    const { height, width } = getSubMenuSize();
    const { height: rootHeight } = getMenuSize();
    expect(rootTop).toBe(clickY - rootHeight);
    expect(top).toBe(clickY - height);
    expect(left).toBe(clickX + width);
  });
});

describe("Context Menu - CF", () => {
  test("open sidepanel with no CF in selected zone", async () => {
    simulateContextMenu(240, 110);
    await nextTick();
    await simulateClick(".o-menu div[data-name='conditional_formatting']");
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeTruthy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeFalsy();
  });

  test("open sidepanel with one CF in selected zone", async () => {
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
    simulateContextMenu(240, 110); //click on C5
    await nextTick();
    await simulateClick(".o-menu div[data-name='conditional_formatting']");
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeFalsy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeTruthy();
  });

  test("open sidepanel with more then one CF in selected zone", async () => {
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
    simulateContextMenu(240, 110); //click on C5
    await nextTick();
    await simulateClick(".o-menu div[data-name='conditional_formatting']");
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeTruthy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeFalsy();
  });
  test("will update sidepanel if we reopen it from other cell", async () => {
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
    model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf: cfRule1,
      sheetId: model.getters.getActiveSheetId(),
      target: cfRule1.ranges.map(toZone),
    });
    setSelection(model, ["A1:A11"]);
    simulateContextMenu(80, 90);
    await nextTick();
    await simulateClick(".o-menu div[data-name='conditional_formatting']");
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeFalsy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeTruthy();

    setSelection(model, ["F6"]);
    simulateContextMenu(530, 125);
    await nextTick();
    await simulateClick(".o-menu div[data-name='conditional_formatting']");
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeTruthy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeFalsy();
  });
});
