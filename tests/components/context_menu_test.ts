import { Model } from "../../src/model";
import { GridParent, makeTestFixture, nextTick, getCell } from "../helpers";
import { simulateClick, triggerMouseEvent } from "../dom_helper";
import { toXC } from "../../src/helpers";
import { Menu } from "../../src/components/menu";
import { cellMenuRegistry } from "../../src/registries/menus/cell_menu_registry";
import { Component, tags, hooks } from "@odoo/owl";
import { SpreadsheetEnv, ConditionalFormat } from "../../src/types";
import { FullMenuItem, createFullMenuItem } from "../../src/registries";

const { xml } = tags;
const { useSubEnv } = hooks;

let fixture: HTMLElement;

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

Object.defineProperty(HTMLDivElement.prototype, "clientWidth", {
  get() {
    return 1000;
  },
  configurable: true,
});
Object.defineProperty(HTMLDivElement.prototype, "clientHeight", {
  get() {
    return 1000;
  },
  configurable: true,
});

function getActiveXc(model: Model): string {
  return toXC(...model.getters.getPosition());
}

function getPosition(selector: string): { top: number; left: number } {
  const menu = fixture.querySelector(selector);
  const { top, left } = window.getComputedStyle(menu!);
  return {
    top: parseInt(top.replace("px", "")),
    left: parseInt(left.replace("px", "")),
  };
}

function getMenuPosition() {
  return getPosition(".o-menu");
}

function getSubMenuPosition() {
  return getPosition(".o-menu + div .o-menu");
}

function getItemSize() {
  return 32;
}

function getSize(menuItemsCount: number): { width: number; height: number } {
  return {
    width: 200,
    height: getItemSize() * menuItemsCount,
  };
}

function getMenuSize() {
  const menu = fixture.querySelector(".o-menu");
  const menuItems = menu!.querySelectorAll(".o-menu-item");
  return getSize(menuItems.length);
}

function getSubMenuSize() {
  const menu = fixture.querySelector(".o-menu + div .o-menu");
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
  testConfig: ContextMenuTestConfig = {}
): Promise<[number, number]> {
  const parent = new ContextMenuParent(x, y, new Model(), testConfig);
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

class ContextMenuParent extends Component<any, SpreadsheetEnv> {
  static template = xml/* xml */ `
      <Menu
        t-on-close="onClose"
        position="position"
        menuItems="menus"
      />
  `;
  static components = { Menu };
  menus: FullMenuItem[];
  position: { x: number; y: number; width: number; height: number };
  onClose: () => void;

  constructor(
    x: number,
    y: number,
    model: Model,
    { onClose, menuItems }: ContextMenuTestConfig = {}
  ) {
    super();
    useSubEnv({
      getters: model.getters,
    });
    this.onClose = onClose || (() => {});
    this.position = { x, y, width: 1000, height: 1000 };
    this.menus = menuItems || [
      createFullMenuItem("Action", {
        name: "Action",
        sequence: 1,
        action() {},
      }),
    ];
  }
}

function simulateContextMenu(x, y) {
  triggerMouseEvent("canvas", "mousedown", x, y, { button: 1, bubbles: true });
  triggerMouseEvent("canvas", "mouseup", x, y, { button: 1, bubbles: true });
  triggerMouseEvent("canvas", "contextmenu", x, y, { button: 1, bubbles: true });
}

describe("Context Menu", () => {
  test("context menu simple rendering", async () => {
    const model = new Model();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    simulateContextMenu(300, 200);
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toMatchSnapshot();
  });

  test("right click on a cell opens a context menu", async () => {
    const model = new Model();

    const parent = new GridParent(model);
    await parent.mount(fixture);

    expect(getActiveXc(model)).toBe("A1");
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
    simulateContextMenu(300, 200);
    expect(getActiveXc(model)).toBe("C8");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeTruthy();
  });

  test("right click on a cell, then left click elsewhere closes a context menu", async () => {
    const model = new Model();

    const parent = new GridParent(model);
    await parent.mount(fixture);

    simulateContextMenu(300, 200);
    expect(getActiveXc(model)).toBe("C8");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeTruthy();

    await simulateClick("canvas", 50, 50);
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
  });

  test("can copy/paste with context menu", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B1", text: "b1" });

    const parent = new GridParent(model);
    await parent.mount(fixture);

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
    expect(getCell(model, "B1")!.content).toBe("b1");
    expect(getCell(model, "B2")!.content).toBe("b1");
  });

  test("can cut/paste with context menu", async () => {
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B1", text: "b1" });

    const parent = new GridParent(model);
    await parent.mount(fixture);

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

    expect(getCell(model, "B1")).toBeNull();
    expect(getCell(model, "B2")!.content).toBe("b1");
  });

  test("menu does not close when right click elsewhere", async () => {
    const model = new Model();

    const parent = new GridParent(model);
    await parent.mount(fixture);
    simulateContextMenu(100, 100);
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeTruthy();
    simulateContextMenu(300, 300);
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeTruthy();
  });

  test("close contextmenu when clicking on menubar", async () => {
    const model = new Model();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    simulateContextMenu(100, 100);
    await nextTick();
    expect(fixture.querySelector(".o-menu .o-menu-item[data-name='cut']")).toBeTruthy();
    triggerMouseEvent(".o-topbar-topleft", "click");
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeFalsy();
  });

  test("close contextmenu when clicking on menubar item", async () => {
    const model = new Model();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    simulateContextMenu(100, 100);
    await nextTick();
    expect(fixture.querySelector(".o-menu .o-menu-item[data-name='cut']")).toBeTruthy();
    triggerMouseEvent(".o-topbar-menu[data-id='insert']", "click");
    await nextTick();
    expect(fixture.querySelector(".o-menu .o-menu-item[data-name='cut']")).toBeFalsy();
  });
  test("close contextmenu when clicking on tools bar", async () => {
    const model = new Model();
    const parent = new GridParent(model);
    await parent.mount(fixture);
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
        isVisible: (env) => env.getters.getCell(1, 0)!.value === "b1",
        action() {},
      })
      .add("hidden_action", {
        name: "hidden_action",
        sequence: 2,
        isVisible: (env) => env.getters.getCell(1, 0)!.value !== "b1",
        action() {},
      });
    const model = new Model();
    model.dispatch("SET_VALUE", { xc: "B1", text: "b1" });
    const parent = new GridParent(model);
    await parent.mount(fixture);
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
});

describe("Context Menu position", () => {
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
    const { height } = getSubMenuSize();
    const { height: rootHeight } = getMenuSize();
    const { width } = getSubMenuSize();
    expect(rootTop).toBe(clickY - rootHeight);
    expect(top).toBe(clickY - rootHeight - height);
    expect(left).toBe(clickX + width);
  });
});

describe("Context Menu - CF", () => {
  test("open sidepanel with no CF in selected zone", async () => {
    const model = new Model();
    const parent = new GridParent(model);
    await parent.mount(fixture);
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
    const model = new Model();
    const parent = new GridParent(model);
    await parent.mount(fixture);

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
      sheet: model.getters.getActiveSheet(),
    });
    let zone = { left: 0, top: 0, bottom: 10, right: 0 };
    model.dispatch("SET_SELECTION", { zones: [zone], anchor: [0, 0] });
    simulateContextMenu(80, 90);
    await nextTick();
    await simulateClick(".o-menu div[data-name='conditional_formatting']");
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-preview-list")
    ).toBeFalsy();
    expect(
      fixture.querySelector(".o-sidePanel .o-sidePanelBody .o-cf .o-cf-ruleEditor")
    ).toBeTruthy();

    zone = { left: 5, top: 5, bottom: 5, right: 5 };
    model.dispatch("SET_SELECTION", { zones: [zone], anchor: [5, 5] });
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
