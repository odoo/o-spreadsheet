import { Component, xml } from "@odoo/owl";
import { Model, Spreadsheet } from "../../src";
import {
  COLLAPSED_SIDE_PANEL_SIZE,
  DEFAULT_SIDE_PANEL_SIZE,
  MIN_SHEET_VIEW_WIDTH,
  SidePanelStore,
} from "../../src/components/side_panel/side_panel/side_panel_store";
import { SidePanelContent, sidePanelRegistry } from "../../src/registries/side_panel_registry";
import { Store } from "../../src/store_engine";
import { createSheet } from "../test_helpers/commands_helpers";
import { click, clickAndDrag, doubleClick, simulateClick } from "../test_helpers/dom_helper";
import { addToRegistry, doAction, mountSpreadsheet, nextTick } from "../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../test_helpers/mock_helpers";

let spreadsheetWidth = 1000;

beforeEach(() => {
  extendMockGetBoundingClientRect({
    "o-spreadsheet": () => ({ x: 0, y: 0, width: spreadsheetWidth, height: 1000 }),
  });
});

let fixture: HTMLElement;
let parent: Spreadsheet;
let sidePanelContent: { [key: string]: SidePanelContent };
let model: Model;
let sidePanelStore: Store<SidePanelStore>;
let notifyUser = jest.fn();

class Body extends Component<any, any> {
  static template = xml`
    <div>
      <div class="main_body">test</div>
      <div class="props_body" t-if="props.text"><t t-esc="props.text"/></div>
      <input type="text" class="input" t-if="props.input" />
    </div>`;
  static props = {
    text: { type: String, optional: true },
    input: { type: Boolean, optional: true },
    onCloseSidePanel: Function,
  };
}

class Body2 extends Component<any, any> {
  static template = xml`
    <div>
      <div class="main_body_2">Hello</div>
      <div class="props_body_2" t-if="props.field"><t t-esc="props.field"/></div>
    </div>`;
  static props = { field: { type: String, optional: true }, onCloseSidePanel: Function };
}

class BodyWithoutProps extends Component<any, any> {
  static template = xml`
    <div>
      <div class="main_body_3">Hello</div>
    </div>`;
  static props = { onCloseSidePanel: Function };
}

beforeEach(async () => {
  spreadsheetWidth = 1000;
  notifyUser = jest.fn();
  ({ parent, fixture, model } = await mountSpreadsheet(undefined, { notifyUser }));
  sidePanelContent = Object.assign({}, sidePanelRegistry.content);
  sidePanelStore = parent.env.getStore(SidePanelStore);
  sidePanelStore.changeSpreadsheetWidth(spreadsheetWidth);
});

afterEach(() => {
  sidePanelRegistry.content = sidePanelContent;
});

describe("Side Panel", () => {
  test("Can open a custom side panel", async () => {
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL", {
      title: "Custom Panel",
      Body: Body,
    });
    parent.env.openSidePanel("CUSTOM_PANEL");
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
    expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe("Custom Panel");
    expect(document.querySelector(".main_body")!.textContent).toBe("test");
    expect(document.querySelector(".props_body")).toBeNull();
  });

  test("Can close a side panel", async () => {
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL", {
      title: "Custom Panel",
      Body: Body,
    });
    parent.env.openSidePanel("CUSTOM_PANEL");
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
    simulateClick(".o-sidePanelClose");
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(0);
  });

  test("Can toggle a side panel", async () => {
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL", {
      title: "Custom Panel",
      Body: Body,
    });
    parent.env.toggleSidePanel("CUSTOM_PANEL");
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
    parent.env.toggleSidePanel("CUSTOM_PANEL");
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(0);
  });

  test("Can toggle a side panel when another is already opened", async () => {
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL_1", {
      title: "Custom Panel 1",
      Body: Body,
    });
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL_2", {
      title: "Custom Panel 2",
      Body: Body,
    });
    parent.env.toggleSidePanel("CUSTOM_PANEL_1");
    await nextTick();
    expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe("Custom Panel 1");
    parent.env.toggleSidePanel("CUSTOM_PANEL_2");
    await nextTick();
    expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe("Custom Panel 2");
  });

  test("Can open a custom side panel with custom title and panelProps", async () => {
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL", {
      title: () => "Computed Title",
      Body: Body,
    });
    parent.env.openSidePanel("CUSTOM_PANEL", { text: "context" });
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
    expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe("Computed Title");
    expect(document.querySelector(".main_body")!.textContent).toBe("test");
    expect(document.querySelector(".props_body")).not.toBeNull();
    expect(document.querySelector(".props_body")!.textContent).toBe("context");
  });

  test("Can open a custom side panel with custom title based on props", async () => {
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL", {
      title: (env, props: any) => `Title: ${props.text}`,
      Body: Body,
    });
    parent.env.openSidePanel("CUSTOM_PANEL", { text: "1" });
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
    expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe("Title: 1");
  });

  test("Can open and close a custom side panel without any props", async () => {
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL", {
      title: "Title",
      Body: BodyWithoutProps,
      computeState: () => {
        return { isOpen: true };
      },
    });
    parent.env.openSidePanel("CUSTOM_PANEL");
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
    expect(document.querySelector(".main_body_3")).not.toBeNull();
    simulateClick(".o-sidePanelClose");
    await nextTick();
    expect(document.querySelector(".o-sidePanel")).toBeNull();
  });

  test("Can open a side panel when another one is open", async () => {
    addToRegistry(sidePanelRegistry, "PANEL_1", {
      title: "PANEL_1",
      Body: Body,
    });
    addToRegistry(sidePanelRegistry, "PANEL_2", {
      title: "PANEL_2",
      Body: Body2,
    });
    parent.env.openSidePanel("PANEL_1", { text: "test" });
    await nextTick();
    parent.env.openSidePanel("PANEL_2", { field: "field" });
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
    expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe("PANEL_2");
    expect(document.querySelector(".main_body_2")).not.toBeNull();
    expect(document.querySelector(".main_body_2")!.textContent).toBe("Hello");
    expect(document.querySelector(".props_body_2")).not.toBeNull();
    expect(document.querySelector(".props_body_2")!.textContent).toBe("field");
  });

  test("Closing a side panel focuses the grid hidden input", async () => {
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL", {
      title: "Custom Panel",
      Body: Body,
    });
    parent.env.openSidePanel("CUSTOM_PANEL");
    await nextTick();
    simulateClick(".o-sidePanelClose");
    await nextTick();
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer"));
  });

  test("Closing a side panel executes the onCloseSidePanel callback", async () => {
    const onCloseSidePanel = jest.fn();
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL", {
      title: "Custom Panel",
      Body: Body,
    });
    parent.env.openSidePanel("CUSTOM_PANEL", { onCloseSidePanel });
    await nextTick();
    simulateClick(".o-sidePanelClose");
    await nextTick();
    expect(onCloseSidePanel).toHaveBeenCalled();
  });

  test("Switching from one sidepanel to another executes the onCloseSidePanel callback", async () => {
    const onCloseSidePanel = jest.fn();
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL_1", {
      title: "Custom Panel 1",
      Body: Body,
    });
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL_2", {
      title: "Custom Panel 2",
      Body: Body,
    });
    parent.env.openSidePanel("CUSTOM_PANEL_1", { onCloseSidePanel });
    await nextTick();
    parent.env.openSidePanel("CUSTOM_PANEL_2");
    await nextTick();
    expect(onCloseSidePanel).toHaveBeenCalled();
  });

  test("Side panel does not lose focus upon sheet change", async () => {
    createSheet(model, { activate: true });
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL_1", {
      title: "Custom Panel 1",
      Body: Body,
    });
    parent.env.openSidePanel("CUSTOM_PANEL_1", { input: true });
    await nextTick();
    const inputTarget = document.querySelector(".o-sidePanel input")! as HTMLInputElement;
    inputTarget.focus();
    expect(document.activeElement).toBe(inputTarget);
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("ACTIVATE_NEXT_SHEET");
    await nextTick();
    expect(document.activeElement).toBe(inputTarget);
    expect(model.getters.getActiveSheetId()).not.toBe(sheetId);
  });

  test("Can compute side panel props with computeState of the registry", async () => {
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL", {
      title: "Custom Panel",
      Body: Body,
      computeState: () => ({ isOpen: true, props: { text: "test text" } }),
    });
    parent.env.openSidePanel("CUSTOM_PANEL", {});
    await nextTick();
    expect(document.querySelector(".props_body")!.textContent).toBe("test text");
  });

  test("Can close the side panel with computeState of the registry", async () => {
    let text = "test text";
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL", {
      title: "Custom Panel",
      Body: Body,
      computeState: () => (text ? { isOpen: true, props: { text } } : { isOpen: false }),
    });
    parent.env.openSidePanel("CUSTOM_PANEL", {});
    await nextTick();
    expect(document.querySelector(".o-sidePanel .props_body")!.textContent).toBe("test text");

    text = "";
    parent.render(true);
    await nextTick();
    expect(document.querySelector(".o-sidePanel")).toBeNull();
  });

  test("The onCloseSidePanel callback is called when computeState closes the side panel", async () => {
    const onCloseSidePanel = jest.fn();
    let text = "test text";
    addToRegistry(sidePanelRegistry, "CUSTOM_PANEL", {
      title: "Custom Panel",
      Body: Body,
      computeState: () =>
        text ? { isOpen: true, props: { text, onCloseSidePanel } } : { isOpen: false },
    });
    parent.env.openSidePanel("CUSTOM_PANEL", {});
    await nextTick();
    expect(document.querySelector(".o-sidePanel .props_body")!.textContent).toBe("test text");

    text = "";
    parent.render(true);
    await nextTick();
    expect(document.querySelector(".o-sidePanel")).toBeNull();
    expect(onCloseSidePanel).toHaveBeenCalled();

    text = "new text. This should not re-open the side panel";
    parent.render(true);
    await nextTick();
    expect(document.querySelector(".o-sidePanel")).toBeNull();
  });

  describe("Side panel resize", () => {
    beforeEach(async () => {
      addToRegistry(sidePanelRegistry, "CUSTOM_PANEL_2", { title: "title", Body: Body });
      parent.env.openSidePanel("CUSTOM_PANEL_2");
      await nextTick();
    });

    test("Can resize the side panel with the mouse", async () => {
      const spreadsheetEl = fixture.querySelector<HTMLElement>(".o-spreadsheet")!;
      expect(spreadsheetEl.style["grid-template-columns"]).toBe("auto 350px");

      await clickAndDrag(fixture.querySelector(".o-sidePanel-handle")!, { y: 0, x: -100 });
      await nextTick();
      expect(spreadsheetEl.style["grid-template-columns"]).toBe("auto 450px");
      expect(sidePanelStore.mainPanel?.size).toBe(450);
    });

    test("Can resize the side panel with the sidePanelStore", async () => {
      sidePanelStore.changePanelSize("mainPanel", 400);
      await nextTick();

      const spreadsheetEl = fixture.querySelector<HTMLElement>(".o-spreadsheet")!;
      expect(spreadsheetEl.style["grid-template-columns"]).toBe("auto 400px");
    });

    test("Cannot make the side panel smaller than its default size", () => {
      sidePanelStore.changePanelSize("mainPanel", 100);
      expect(sidePanelStore.mainPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE);
    });

    test("Cannot make the sheetView too small", () => {
      sidePanelStore.changePanelSize("mainPanel", 900);
      expect(sidePanelStore.mainPanel?.size).toBe(spreadsheetWidth - MIN_SHEET_VIEW_WIDTH);

      sidePanelStore.changePanelSize("mainPanel", 2000);
      expect(sidePanelStore.mainPanel?.size).toBe(spreadsheetWidth - MIN_SHEET_VIEW_WIDTH);
    });

    test("Side panel is resized when spreadsheet is resized", async () => {
      sidePanelStore.changePanelSize("mainPanel", 2000);

      spreadsheetWidth = 600;
      await nextTick();
      window.resizers.resize();
      expect(sidePanelStore.mainPanel?.size).toBe(600 - MIN_SHEET_VIEW_WIDTH);
    });

    test("Can double click to reset the panel size", async () => {
      sidePanelStore.changePanelSize("mainPanel", 400);
      await nextTick();

      await doubleClick(fixture.querySelector(".o-sidePanel-handle")!);
      await nextTick();
      expect(sidePanelStore.mainPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE);
    });
  });

  describe("Pin & collapse side panel", () => {
    beforeEach(async () => {
      addToRegistry(sidePanelRegistry, "CUSTOM_PANEL", { title: "Custom Panel", Body: Body });
      addToRegistry(sidePanelRegistry, "CUSTOM_PANEL_2", { title: "Custom Panel 2", Body: Body });
      parent.env.openSidePanel("CUSTOM_PANEL");
      await nextTick();
    });

    test("Can pin a side panel", async () => {
      expect(sidePanelStore.mainPanel?.isPinned).toBeFalsy();
      expect(".o-pin-panel").toHaveCount(0);

      doAction(["view", "toggle_pin_panel"], parent.env);
      await nextTick();
      expect(sidePanelStore.mainPanel?.isPinned).toBe(true);
      expect(".o-pin-panel").toHaveCount(1);

      parent.env.openSidePanel("CUSTOM_PANEL_2");
      await nextTick();

      const panels = fixture.querySelectorAll(".o-sidePanel");
      expect(panels).toHaveLength(2);
      expect(panels[1].querySelector(".o-sidePanelTitle")).toHaveText("Custom Panel");
      expect(panels[0].querySelector(".o-sidePanelTitle")).toHaveText("Custom Panel 2");
      expect(panels[0].querySelector(".o-pin-panel")).toBeNull();
    });

    test("Can unpin a side panel with the icon", async () => {
      doAction(["view", "toggle_pin_panel"], parent.env);
      await nextTick();
      expect(sidePanelStore.mainPanel?.isPinned).toBe(true);
      await click(fixture, ".o-pin-panel");
      expect(sidePanelStore.mainPanel?.isPinned).toBeFalsy();
    });

    test("Can unpin a side panel with the menu", async () => {
      doAction(["view", "toggle_pin_panel"], parent.env);
      expect(sidePanelStore.mainPanel?.isPinned).toBe(true);
      await nextTick();
      doAction(["view", "toggle_pin_panel"], parent.env);
      expect(sidePanelStore.mainPanel?.isPinned).toBeFalsy();
    });

    test("Unpinning a panel close it if another panel is open", async () => {
      sidePanelStore.togglePinPanel();
      parent.env.openSidePanel("CUSTOM_PANEL_2");
      await nextTick();

      expect(".o-sidePanel").toHaveCount(2);

      await click(fixture, ".o-pin-panel");
      expect(".o-sidePanel").toHaveCount(1);
      expect(".o-sidePanelTitle").toHaveText("Custom Panel 2");
    });

    test("Can collapse single panel", async () => {
      expect(".o-collapse-panel").toHaveCount(1);

      await click(fixture, ".o-collapse-panel");
      expect(".o-sidePanel").toHaveClass("collapsed");
      expect(sidePanelStore.mainPanel?.isCollapsed).toBe(true);
      expect(sidePanelStore.mainPanel?.size).toBe(COLLAPSED_SIDE_PANEL_SIZE);

      await click(fixture, ".o-collapse-panel");
      expect(".o-sidePanel").not.toHaveClass("collapsed");
      expect(sidePanelStore.mainPanel?.isCollapsed).toBe(false);
      expect(sidePanelStore.mainPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE);
    });

    test("Can collapse both panels", async () => {
      sidePanelStore.togglePinPanel();
      parent.env.openSidePanel("CUSTOM_PANEL_2");
      await nextTick();

      let panels = fixture.querySelectorAll(".o-sidePanel");
      const collapsePanelButtons = fixture.querySelectorAll(".o-collapse-panel");
      expect(panels[1]).not.toHaveClass("collapsed");
      expect(sidePanelStore.mainPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE);
      expect(panels[0]).not.toHaveClass("collapsed");
      expect(sidePanelStore.secondaryPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE);

      await click(collapsePanelButtons[0]);
      panels = fixture.querySelectorAll(".o-sidePanel");
      expect(panels[0]).toHaveClass("collapsed");
      expect(sidePanelStore.secondaryPanel?.size).toBe(COLLAPSED_SIDE_PANEL_SIZE);
      expect(panels[1]).not.toHaveClass("collapsed");
      expect(sidePanelStore.mainPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE);

      await click(collapsePanelButtons[1]);
      panels = fixture.querySelectorAll(".o-sidePanel");
      expect(panels[0]).toHaveClass("collapsed");
      expect(sidePanelStore.mainPanel?.size).toBe(COLLAPSED_SIDE_PANEL_SIZE);
      expect(panels[1]).toHaveClass("collapsed");
      expect(sidePanelStore.secondaryPanel?.size).toBe(COLLAPSED_SIDE_PANEL_SIZE);
    });

    test("Cannot open two panels with the same key", async () => {
      const panelKey = "myKey";
      addToRegistry(sidePanelRegistry, "OTHER_PANEL", {
        title: "Custom Panel",
        Body: Body,
        computeState: () => ({
          isOpen: true,
          key: "CUSTOM_PANEL", // This is the key of the first panel opened
        }),
      });

      doAction(["view", "toggle_pin_panel"], parent.env);
      parent.env.openSidePanel("OTHER_PANEL", { key: panelKey });
      await nextTick();
      expect(".o-sidePanel").toHaveCount(1);
      expect(".o-sidePanelTitle").toHaveText("Custom Panel");
    });

    test("Reopening main panel from secondary panel closes secondary panel", async () => {
      doAction(["view", "toggle_pin_panel"], parent.env);

      parent.env.openSidePanel("CUSTOM_PANEL_2");
      await nextTick();
      expect(".o-sidePanel").toHaveCount(2);

      parent.env.replaceSidePanel("CUSTOM_PANEL", "CUSTOM_PANEL_2");
      await nextTick();
      expect(".o-sidePanel").toHaveCount(1);
      expect(".o-sidePanelTitle").toHaveText("Custom Panel");
    });

    test("Reopening main panel directly does not close secondary panel", async () => {
      doAction(["view", "toggle_pin_panel"], parent.env);

      parent.env.openSidePanel("CUSTOM_PANEL_2");
      await nextTick();
      expect(".o-sidePanel").toHaveCount(2);

      parent.env.openSidePanel("CUSTOM_PANEL");
      await nextTick();
      expect(".o-sidePanel").toHaveCount(2);
    });

    test("Re-opening the same panel un-collapses it", async () => {
      doAction(["view", "toggle_pin_panel"], parent.env);
      await click(fixture, ".o-collapse-panel");

      expect(".o-sidePanel").toHaveClass("collapsed");
      expect(sidePanelStore.mainPanel?.size).toBe(COLLAPSED_SIDE_PANEL_SIZE);

      parent.env.openSidePanel("CUSTOM_PANEL");
      await nextTick();
      expect(".o-sidePanel").not.toHaveClass("collapsed");
      expect(sidePanelStore.mainPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE);
    });

    test("Reopening main panel from secondary panel should expand it if collapsed", async () => {
      doAction(["view", "toggle_pin_panel"], parent.env);
      await click(fixture, ".o-collapse-panel");

      expect(".o-sidePanel").toHaveClass("collapsed");
      expect(sidePanelStore.mainPanel?.size).toBe(COLLAPSED_SIDE_PANEL_SIZE);

      parent.env.openSidePanel("CUSTOM_PANEL_2");
      parent.env.replaceSidePanel("CUSTOM_PANEL", "CUSTOM_PANEL_2");
      await nextTick();
      expect(".o-sidePanel").not.toHaveClass("collapsed");
      expect(sidePanelStore.mainPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE);
    });

    test("Can resize panels when two panels are open", async () => {
      sidePanelStore.togglePinPanel();
      parent.env.openSidePanel("CUSTOM_PANEL_2");
      await nextTick();

      const handles = fixture.querySelectorAll(".o-sidePanel-handle");
      expect(handles).toHaveLength(2);

      await clickAndDrag(handles[0], { y: 0, x: -50 }, undefined, true);
      expect(sidePanelStore.mainPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE);
      expect(sidePanelStore.secondaryPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE + 50);

      await clickAndDrag(handles[1], { y: 0, x: -25 }, undefined, true);
      expect(sidePanelStore.mainPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE + 25);
      expect(sidePanelStore.secondaryPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE + 50);
    });

    test("Resizing the man panel reduces the size of the secondary panel if there is not enough space", async () => {
      sidePanelStore.togglePinPanel();
      parent.env.openSidePanel("CUSTOM_PANEL_2");
      await nextTick();

      const handles = fixture.querySelectorAll(".o-sidePanel-handle");
      expect(handles).toHaveLength(2);

      await clickAndDrag(handles[0], { y: 0, x: -150 }, undefined, true);
      expect(sidePanelStore.mainPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE);
      expect(sidePanelStore.secondaryPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE + 150);

      await clickAndDrag(handles[1], { y: 0, x: -1000 }, undefined, true);
      expect(sidePanelStore.mainPanel?.size).toBe(
        1000 - MIN_SHEET_VIEW_WIDTH - DEFAULT_SIDE_PANEL_SIZE
      );
      expect(sidePanelStore.secondaryPanel?.size).toBe(DEFAULT_SIDE_PANEL_SIZE);
    });

    test("Secondary side panel closes if the sheet is too small", async () => {
      sidePanelStore.togglePinPanel();
      parent.env.openSidePanel("CUSTOM_PANEL_2");
      await nextTick();
      expect(".o-sidePanel").toHaveCount(2);

      sidePanelStore.changeSpreadsheetWidth(600);
      await nextTick();

      expect(".o-sidePanel").toHaveCount(1);
      expect(".o-sidePanelTitle").toHaveText("Custom Panel");
    });

    test("Cannot open second size panel if the spreadsheet is too small", async () => {
      sidePanelStore.changeSpreadsheetWidth(600);
      sidePanelStore.togglePinPanel();
      parent.env.openSidePanel("CUSTOM_PANEL_2");
      await nextTick();

      expect(".o-sidePanel").toHaveCount(1);
      expect(notifyUser).toHaveBeenCalledWith({
        sticky: false,
        type: "warning",
        text: "The window is too small to display multiple side panels.",
      });
    });
  });
});
