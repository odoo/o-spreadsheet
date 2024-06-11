import { Model } from "../../src";
import { SidePanel } from "../../src/components/side_panel/side_panel/side_panel";
import { TableStyleEditorPanelProps } from "../../src/components/side_panel/table_style_editor_panel/table_style_editor_panel";
import { buildTableStyle } from "../../src/helpers/table_presets";
import { SpreadsheetChildEnv, TableStyle } from "../../src/types";
import { createTableStyle } from "../test_helpers/commands_helpers";
import { click, setInputValueAndTrigger } from "../test_helpers/dom_helper";
import { mountComponentWithPortalTarget, nextTick } from "../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let env: SpreadsheetChildEnv;

async function mountPanel(partialProps: Partial<TableStyleEditorPanelProps> = {}) {
  ({ fixture, env } = await mountComponentWithPortalTarget(SidePanel, { model }));
  const props = { onCloseSidePanel: () => {}, ...partialProps };
  env.openSidePanel("TableStyleEditorPanel", { ...props });
  await nextTick();
}

function getTableStyleIdFromName(name: string): string | undefined {
  const styles = model.getters.getTableStyles();
  return Object.keys(styles).find((id) => styles[id].displayName === name);
}

function getTableStyleFromName(name: string): TableStyle | undefined {
  return Object.values(model.getters.getTableStyles()).find((style) => style.displayName === name);
}

describe("Table style editor panel", () => {
  beforeEach(() => {
    model = new Model();
  });

  test("Can create a new table style", async () => {
    await mountPanel();
    await setInputValueAndTrigger(".o-sidePanel input", "New style that I made");
    click(fixture, ".o-sidePanel .o-confirm");
    expect(getTableStyleFromName("New style that I made")).not.toBeUndefined();
  });

  test("Default style name changes if there is already a style with the same name", async () => {
    createTableStyle(model, "Custom Table Style");
    await mountPanel();
    expect(fixture.querySelector<HTMLInputElement>(".o-sidePanel input")?.value).toEqual(
      "Custom Table Style 2"
    );
  });

  test("Can change the style primary color", async () => {
    await mountPanel();
    await click(fixture, ".o-round-color-picker-button");
    await click(fixture, 'div[data-color="#FF9900"]');
    click(fixture, ".o-sidePanel .o-confirm");
    expect(getTableStyleFromName("Custom Table Style")).toMatchObject(
      buildTableStyle("Custom Table Style", "lightColoredText", "#FF9900")
    );
  });

  test("Can change the style template", async () => {
    await mountPanel();
    const templatesItems = fixture.querySelectorAll(".o-table-style-list-item");
    expect(templatesItems[0].classList).toContain("selected");
    await click(templatesItems[1]);
    expect(templatesItems[1].classList).toContain("selected");
    click(fixture, ".o-sidePanel .o-confirm");
    expect(getTableStyleFromName("Custom Table Style")).toMatchObject(
      buildTableStyle("Custom Table Style", "lightAllBorders", "#3C78D8")
    );
  });

  test("Props onStylePicked is called on confirm", async () => {
    const onStylePicked = jest.fn();
    await mountPanel({ onStylePicked });
    await click(fixture, ".o-sidePanel .o-confirm");
    expect(onStylePicked).toBeCalledWith(getTableStyleIdFromName("Custom Table Style"));
  });

  test("Can delete table style from the panel", async () => {
    createTableStyle(model, "Custom Table Style");
    expect(getTableStyleFromName("Custom Table Style")).not.toBeUndefined();

    await mountPanel({ styleId: "Custom Table Style" });
    click(fixture, ".o-sidePanel .o-delete");
    expect(getTableStyleFromName("Custom Table Style")).toBeUndefined();
  });

  test("Delete button is not present when creating a new table style", async () => {
    await mountPanel();
    expect(fixture.querySelector(".o-sidePanel .o-delete")).toBeNull();
  });
});
