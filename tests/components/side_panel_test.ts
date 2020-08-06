import { Model } from "../../src/model";
import { makeTestFixture, nextTick } from "../helpers";
import { sidePanelRegistry } from "../../src/registries/index";
import { Component, tags, hooks } from "@odoo/owl";
import { SidePanelContent } from "../../src/registries/side_panel_registry";
import { simulateClick } from "../dom_helper";
import { Spreadsheet } from "../../src/components";
import { SpreadsheetEnv } from "../../src/types";

const { useRef } = hooks;
const { xml } = tags;

class Parent extends Component<any> {
  static template = xml`<Spreadsheet t-ref="spreadsheet" data="data"/>`;
  static components = { Spreadsheet };
  private spreadsheet: any = useRef("spreadsheet");
  get spreadsheetEnv(): SpreadsheetEnv {
    return this.spreadsheet.comp.env;
  }
  get model(): Model {
    return this.spreadsheet.comp.model;
  }
}

let fixture: HTMLElement;
let parent: Parent;
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
  fixture = makeTestFixture();
  parent = new Parent();
  await parent.mount(fixture);
  sidePanelContent = Object.assign({}, sidePanelRegistry.content);
});

afterEach(() => {
  fixture.remove();
  sidePanelRegistry.content = sidePanelContent;
});

describe("Side Panel", () => {
  test("Can open a custom side panel", async () => {
    sidePanelRegistry.add("CUSTOM_PANEL", {
      title: "Custom Panel",
      Body: Body,
    });
    parent.spreadsheetEnv.openSidePanel("CUSTOM_PANEL");
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
    parent.spreadsheetEnv.openSidePanel("CUSTOM_PANEL");
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
    parent.spreadsheetEnv.toggleSidePanel("CUSTOM_PANEL");
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
    parent.spreadsheetEnv.toggleSidePanel("CUSTOM_PANEL");
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
    parent.spreadsheetEnv.toggleSidePanel("CUSTOM_PANEL_1");
    await nextTick();
    expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe("Custom Panel 1");
    parent.spreadsheetEnv.toggleSidePanel("CUSTOM_PANEL_2");
    await nextTick();
    expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe("Custom Panel 2");
  });

  test("Can open a custom side panel with custom title and panelProps", async () => {
    sidePanelRegistry.add("CUSTOM_PANEL", {
      title: () => "Computed Title",
      Body: Body,
    });
    parent.spreadsheetEnv.openSidePanel("CUSTOM_PANEL", { text: "context" });
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
    expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe("Computed Title");
    expect(document.querySelector(".main_body")!.textContent).toBe("test");
    expect(document.querySelector(".props_body")).toBeDefined();
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
    parent.spreadsheetEnv.openSidePanel("PANEL_1", { text: "test" });
    await nextTick();
    parent.spreadsheetEnv.openSidePanel("PANEL_2", { field: "field" });
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
    expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe("PANEL_2");
    expect(document.querySelector(".main_body_2")).toBeDefined();
    expect(document.querySelector(".main_body_2")!.textContent).toBe("Hello");
    expect(document.querySelector(".props_body_2")).toBeDefined();
    expect(document.querySelector(".props_body_2")!.textContent).toBe("field");
  });
});
