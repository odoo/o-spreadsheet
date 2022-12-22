import { Component, xml } from "@odoo/owl";
import { Spreadsheet } from "../../src";
import { sidePanelRegistry } from "../../src/registries/index";
import { SidePanelContent } from "../../src/registries/side_panel_registry";
import { simulateClick } from "../test_helpers/dom_helper";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";

let fixture: HTMLElement;
let parent: Spreadsheet;
let sidePanelContent: { [key: string]: SidePanelContent };

class Body extends Component<any, any> {
  static template = xml`
    <div>
      <div class="main_body">test</div>
      <div class="props_body" t-if="props.text"><t t-esc="props.text"/></div>
    </div>`;
}

class Body2 extends Component<any, any> {
  static template = xml`
    <div>
      <div class="main_body_2">Hello</div>
      <div class="props_body_2" t-if="props.field"><t t-esc="props.field"/></div>
    </div>`;
}

beforeEach(async () => {
  ({ parent, fixture } = await mountSpreadsheet());
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
});
