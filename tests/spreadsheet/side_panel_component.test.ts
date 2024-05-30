import { Component, xml } from "@odoo/owl";
import { Model, Spreadsheet } from "../../src";
import {
  DEFAULT_SIDE_PANEL_SIZE,
  MIN_SHEET_VIEW_WIDTH,
  SidePanelStore,
} from "../../src/components/side_panel/side_panel/side_panel_store";
import { SidePanelContent, sidePanelRegistry } from "../../src/registries/side_panel_registry";
import { createSheet } from "../test_helpers/commands_helpers";
import { doubleClick, dragElement, simulateClick } from "../test_helpers/dom_helper";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../test_helpers/mock_helpers";

let spreadsheetWidth = 1000;
mockGetBoundingClientRect({
  "o-spreadsheet": () => ({ x: 0, y: 0, width: spreadsheetWidth, height: 1000 }),
});

let fixture: HTMLElement;
let parent: Spreadsheet;
let sidePanelContent: { [key: string]: SidePanelContent };
let model: Model;

class Body extends Component<any, any> {
  static template = xml`
    <div>
      <div class="main_body">test</div>
      <div class="props_body" t-if="props.text"><t t-esc="props.text"/></div>
      <input type="text" class="input" t-if="props.input" />
    </div>`;
}

class Body2 extends Component<any, any> {
  static template = xml`
    <div>
      <div class="main_body_2">Hello</div>
      <div class="props_body_2" t-if="props.field"><t t-esc="props.field"/></div>
    </div>`;
}

class BodyWithoutProps extends Component<any, any> {
  static template = xml`
    <div>
      <div class="main_body_3">Hello</div>
    </div>`;
}

beforeEach(async () => {
  ({ parent, fixture, model } = await mountSpreadsheet());
  sidePanelContent = Object.assign({}, sidePanelRegistry.content);
});

afterEach(() => {
  sidePanelRegistry.content = sidePanelContent;
});

describe("Side Panel", () => {
  test("Can open a custom side panel", async () => {
    sidePanelRegistry.add("CUSTOM_PANEL", {
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
    sidePanelRegistry.add("CUSTOM_PANEL", {
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
    sidePanelRegistry.add("CUSTOM_PANEL", {
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
    sidePanelRegistry.add("CUSTOM_PANEL_1", {
      title: "Custom Panel 1",
      Body: Body,
    });
    sidePanelRegistry.add("CUSTOM_PANEL_2", {
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
    sidePanelRegistry.add("CUSTOM_PANEL", {
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
    sidePanelRegistry.add("CUSTOM_PANEL", {
      title: (env, props: any) => `Title: ${props.text}`,
      Body: Body,
    });
    parent.env.openSidePanel("CUSTOM_PANEL", { text: "1" });
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
    expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe("Title: 1");
  });

  test("Can open and close a custom side panel without any props", async () => {
    sidePanelRegistry.add("CUSTOM_PANEL", {
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
    sidePanelRegistry.add("PANEL_1", {
      title: "PANEL_1",
      Body: Body,
    });
    sidePanelRegistry.add("PANEL_2", {
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
    sidePanelRegistry.add("CUSTOM_PANEL", {
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
    sidePanelRegistry.add("CUSTOM_PANEL", {
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
    sidePanelRegistry.add("CUSTOM_PANEL_1", {
      title: "Custom Panel 1",
      Body: Body,
    });
    sidePanelRegistry.add("CUSTOM_PANEL_2", {
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
    sidePanelRegistry.add("CUSTOM_PANEL_1", {
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
    sidePanelRegistry.add("CUSTOM_PANEL", {
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
    sidePanelRegistry.add("CUSTOM_PANEL", {
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
    sidePanelRegistry.add("CUSTOM_PANEL", {
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
      sidePanelRegistry.add("CUSTOM_PANEL_2", { title: "title", Body: Body });
      parent.env.openSidePanel("CUSTOM_PANEL_2");
      await nextTick();
    });

    test("Can resize the side panel with the mouse", async () => {
      const spreadsheetEl = fixture.querySelector<HTMLElement>(".o-spreadsheet")!;
      expect(spreadsheetEl.style["grid-template-columns"]).toBe("auto 350px");

      await dragElement(fixture.querySelector(".o-sidePanel-handle")!, { y: 0, x: -100 });
      await nextTick();
      expect(spreadsheetEl.style["grid-template-columns"]).toBe("auto 450px");
      expect(parent.env.getStore(SidePanelStore).panelSize).toBe(450);
    });

    test("Can resize the side panel with the sidePanelStore", async () => {
      const store = parent.env.getStore(SidePanelStore);
      store.changePanelSize(400, spreadsheetWidth);
      await nextTick();

      const spreadsheetEl = fixture.querySelector<HTMLElement>(".o-spreadsheet")!;
      expect(spreadsheetEl.style["grid-template-columns"]).toBe("auto 400px");
    });

    test("Cannot make the side panel smaller than its default size", () => {
      const store = parent.env.getStore(SidePanelStore);
      store.changePanelSize(100, spreadsheetWidth);
      expect(store.panelSize).toBe(DEFAULT_SIDE_PANEL_SIZE);
    });

    test("Cannot make the sheetView too small", () => {
      const store = parent.env.getStore(SidePanelStore);
      store.changePanelSize(900, spreadsheetWidth);
      expect(store.panelSize).toBe(spreadsheetWidth - MIN_SHEET_VIEW_WIDTH);

      store.changePanelSize(2000, spreadsheetWidth);
      expect(store.panelSize).toBe(spreadsheetWidth - MIN_SHEET_VIEW_WIDTH);
    });

    test("Side panel is resized when spreadsheet is resized", async () => {
      const store = parent.env.getStore(SidePanelStore);
      store.changePanelSize(850, spreadsheetWidth);

      spreadsheetWidth = 600;
      await nextTick();
      // @ts-ignore - trigger resize observers
      window.resizers.resize();
      expect(store.panelSize).toBe(600 - MIN_SHEET_VIEW_WIDTH);
    });

    test("Can double click to reset the panel size", async () => {
      const store = parent.env.getStore(SidePanelStore);
      store.changePanelSize(400, spreadsheetWidth);
      await nextTick();

      await doubleClick(fixture.querySelector(".o-sidePanel-handle")!);
      await nextTick();
      expect(store.panelSize).toBe(DEFAULT_SIDE_PANEL_SIZE);
    });
  });
});
