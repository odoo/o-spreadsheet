import { Model } from "../../src/model";
import { GridParent, makeTestFixture, nextTick } from "../helpers";
import { sidePanelRegistry } from "../../src/components";
import { Component, tags } from "@odoo/owl";
import { SpreadsheetEnv } from "../../src/types";

const { xml } = tags;

let fixture: HTMLElement;

class Body extends Component<any, any> {
  static template = xml`
    <div>
      <div class="main_body">test</div>
      <div class="props_body" t-if="props.text"><t t-esc="props.text"/></div>
    </div>`;
}

beforeEach(() => {
  fixture = makeTestFixture();
});

afterEach(() => {
  fixture.remove();
});

describe("Side Panel", () => {
  test("Can open a custom side panel", async () => {
    sidePanelRegistry.add("CUSTOM_PANEL", {
      title: "Custom Panel",
      Body: Body,
    });
    const model = new Model();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    parent.env.openSidePanel("CUSTOM_PANEL");
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
    expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe("Custom Panel");
    expect(document.querySelector(".main_body")!.textContent).toBe("test");
    expect(document.querySelector(".props_body")).toBeNull();
  });

  test("Can open a custom side panel with custom title and panelProps", async () => {
    sidePanelRegistry.add("CUSTOM_PANEL", {
      title: (env: SpreadsheetEnv) => "Computed Title",
      Body: Body,
    });
    const model = new Model();
    const parent = new GridParent(model);
    await parent.mount(fixture);
    parent.env.openSidePanel("CUSTOM_PANEL", { text: "context" });
    await nextTick();
    expect(document.querySelectorAll(".o-sidePanel")).toHaveLength(1);
    expect(document.querySelector(".o-sidePanelTitle")!.textContent).toBe("Computed Title");
    expect(document.querySelector(".main_body")!.textContent).toBe("test");
    expect(document.querySelector(".props_body")).toBeDefined();
    expect(document.querySelector(".props_body")!.textContent).toBe("context");
  });
});
