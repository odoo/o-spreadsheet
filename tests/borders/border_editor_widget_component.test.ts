import { Component, useState, xml } from "@odoo/owl";
import { BorderPosition, BorderStyle, Color, Model, SpreadsheetChildEnv } from "../../src";
import { BorderEditorWidget } from "../../src/components/border_editor/border_editor_widget";
import { toHex, toZone } from "../../src/helpers";
import { simulateClick } from "../test_helpers/dom_helper";
import { mountComponent } from "../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../test_helpers/mock_helpers";

mockGetBoundingClientRect({
  "o-spreadsheet": () => ({ x: 0, y: 0, width: 1000, height: 1000 }),
  "border-widget": () => ({ x: 10, y: 10, width: 300, height: 300 }),
});

let fixture: HTMLElement;
let model: Model;
type Props = BorderEditorWidget["props"];

async function setBorder({
  position,
  color,
  style,
}: {
  position: BorderPosition;
  color?: Color;
  style?: BorderStyle;
}) {
  if (position !== "clear") {
    if (color) {
      await simulateClick('div[title="Border color"]');
      await simulateClick(`div[data-color="${color}"]`);
    }
    if (style) {
      await simulateClick('div[title="Line style"]');
      await simulateClick(`div[title="${style}"]`);
    }
  }
  await simulateClick(`.o-line-item[name="${position}"]`);
}

class BorderWidgetContainer extends Component<Props, SpreadsheetChildEnv> {
  static template = xml/* xml */ `
    <div class="o-spreadsheet">
      <div class="container">
        <BorderEditorWidget t-props="borderWidgetProps"/>
      </div>
    </div>
  `;
  static components = { BorderEditorWidget };
  static props = {};
  state!: { showBorderEditor: boolean };

  setup() {
    this.state = useState({
      showBorderEditor: false,
    });
  }

  get borderWidgetProps(): Props {
    return {
      toggleBorderEditor: () => {
        this.state.showBorderEditor = !this.state.showBorderEditor;
      },
      showBorderEditor: this.state.showBorderEditor,
      class: "border-widget",
    };
  }
}

async function mountBorderWidgetContainer() {
  ({ fixture, model } = await mountComponent(BorderWidgetContainer));
}

describe("BorderEditorWidget", () => {
  test("Clicking the widget toggles the border editor", async () => {
    await mountBorderWidgetContainer();
    expect(fixture.querySelector(".o-border-selector")).toBeNull();
    await simulateClick(".border-widget");
    expect(fixture.querySelector(".o-border-selector")).not.toBeNull();
    await simulateClick(".border-widget");
    expect(fixture.querySelector(".o-border-selector")).toBeNull();
  });

  test("The border style and color are persistent when toggling the editor", async () => {
    await mountBorderWidgetContainer();
    const sheetId = model.getters.getActiveSheetId();
    const dispatch = jest.spyOn(model, "dispatch");
    await simulateClick(".border-widget");
    await setBorder({ position: "all", color: toHex("#ff0000"), style: "dashed" });
    expect(dispatch).toHaveBeenCalledWith("SET_ZONE_BORDERS", {
      border: { color: "#FF0000", position: "all", style: "dashed" },
      sheetId,
      target: [toZone("A1")],
    });
    // close the menu
    await simulateClick(".border-widget");
    expect(fixture.querySelector(".o-border-selector") as HTMLElement).toBeNull();
    // reopen the menu
    await simulateClick(".border-widget");
    await setBorder({ position: "external" });
    expect(dispatch).toHaveBeenCalledWith("SET_ZONE_BORDERS", {
      border: { color: "#FF0000", position: "external", style: "dashed" },
      sheetId,
      target: [toZone("A1")],
    });
  });

  test("The border position is reset when toggling the editor", async () => {
    await mountBorderWidgetContainer();
    const sheetId = model.getters.getActiveSheetId();
    const dispatch = jest.spyOn(model, "dispatch");
    await simulateClick(".border-widget");
    await setBorder({ position: "all", color: toHex("#ff0000"), style: "dashed" });
    expect(dispatch).toHaveBeenCalledWith("SET_ZONE_BORDERS", {
      border: { color: "#FF0000", position: "all", style: "dashed" },
      sheetId,
      target: [toZone("A1")],
    });
    expect(fixture.querySelector('span[name="all"].active')).not.toBeNull();

    // close the menu
    await simulateClick(".border-widget");
    // reopen the menu
    await simulateClick(".border-widget");
    expect(fixture.querySelector('span[name="all"].active')).toBeNull();
  });
});
