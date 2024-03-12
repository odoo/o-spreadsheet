import { Component, xml } from "@odoo/owl";
import { Model } from "../../src";
import { SidePanel } from "../../src/components/side_panel/side_panel/side_panel";
import { TableStyleEditorPanelProps } from "../../src/components/side_panel/table_style_editor_panel/table_style_editor_panel";
import { TABLE_STYLES_TEMPLATES, generateTableCustomStyle } from "../../src/helpers/table_presets";
import { SpreadsheetChildEnv } from "../../src/types";
import { click, setInputValueAndTrigger } from "../test_helpers/dom_helper";
import { mountComponent, nextTick } from "../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

class Parent extends Component<{}, SpreadsheetChildEnv> {
  static components = { SidePanel };
  static template = xml/*xml*/ `
    <!-- Portal target -->
    <div class="o-spreadsheet">
      <SidePanel />
    </div>
    `;
}

async function mountPanel(partialProps: Partial<TableStyleEditorPanelProps> = {}) {
  ({ fixture, env } = await mountComponent(Parent, { model }));
  const props = { onCloseSidePanel: () => {}, ...partialProps };
  env.openSidePanel("TableStyleEditor", { ...props });
  await nextTick();
}

describe("Table style editor panel", () => {
  beforeEach(() => {
    model = new Model();
  });

  test("Can create a new table style", async () => {
    await mountPanel();
    await setInputValueAndTrigger(".o-sidePanel input", "New style that I made");
    click(fixture, ".o-sidePanel .o-confirm");
    expect(model.getters.getTableStyles()["New style that I made"]).not.toBeUndefined();
  });

  test("Default style name changes if there is already a style with the same name", async () => {
    model.dispatch("CREATE_TABLE_STYLE", {
      tableStyleId: "Custom Table Style",
      tableStyle: { category: "custom" },
    });
    await mountPanel();
    expect(fixture.querySelector<HTMLInputElement>(".o-sidePanel input")?.value).toEqual(
      "Custom Table Style 1"
    );
  });

  test("Can change the style primary color", async () => {
    await mountPanel();
    await click(fixture, ".o-color-picker-button");
    await click(fixture, 'div[data-color="#FF9900"]');
    click(fixture, ".o-sidePanel .o-confirm");
    expect(model.getters.getTableStyle("Custom Table Style")).toEqual(
      generateTableCustomStyle("#FF9900", TABLE_STYLES_TEMPLATES[0])
    );
  });

  test("Can change the style template", async () => {
    await mountPanel();
    const templatesItems = fixture.querySelectorAll(".o-table-style-list-item");
    expect(templatesItems[0].classList).toContain("selected");
    await click(templatesItems[1]);
    expect(templatesItems[1].classList).toContain("selected");
    click(fixture, ".o-sidePanel .o-confirm");
    expect(model.getters.getTableStyle("Custom Table Style")).toEqual(
      generateTableCustomStyle("#3C78D8", TABLE_STYLES_TEMPLATES[1])
    );
  });

  test("Props onStylePicked is called on confirm", async () => {
    const onStylePicked = jest.fn();
    await mountPanel({ onStylePicked });
    await click(fixture, ".o-sidePanel .o-confirm");
    expect(onStylePicked).toBeCalledWith("Custom Table Style");
  });
});
