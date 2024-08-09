import { Model } from "../../src";
import {
  TableStylesPopover,
  TableStylesPopoverProps,
} from "../../src/components/tables/table_styles_popover/table_styles_popover";
import { DEFAULT_TABLE_CONFIG } from "../../src/helpers/table_presets";
import { createTableStyle } from "../test_helpers/commands_helpers";
import { click, triggerMouseEvent } from "../test_helpers/dom_helper";
import { mountComponentWithPortalTarget, nextTick } from "../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let openSidePanel: jest.Mock;

async function mountPopover(partialProps: Partial<TableStylesPopoverProps> = {}) {
  const props: TableStylesPopoverProps = {
    tableConfig: DEFAULT_TABLE_CONFIG,
    closePopover: () => {},
    onStylePicked: () => {},
    popoverProps: {
      anchorRect: { x: 0, y: 0, width: 0, height: 0 },
      positioning: "TopRight",
      verticalOffset: 0,
    },
    ...partialProps,
  };
  openSidePanel = jest.fn();
  const env = { openSidePanel };
  ({ fixture } = await mountComponentWithPortalTarget(TableStylesPopover, { model, props, env }));
  await nextTick();
}

describe("Table style editor panel", () => {
  beforeEach(() => {
    model = new Model();
  });

  test("Can change displayed categories with the radio button", async () => {
    await mountPopover();
    const lightTableSelector = ".o-table-style-list-item[title='Red, TableStyleLight3']";
    const mediumTableSelector = ".o-table-style-list-item[title='Red, TableStyleMedium3']";
    expect(fixture.querySelector(mediumTableSelector)).toBeTruthy();
    expect(fixture.querySelector(lightTableSelector)).toBeFalsy();

    await click(fixture, ".o-notebook-tab[data-id='light']");
    expect(fixture.querySelector(mediumTableSelector)).toBeFalsy();
    expect(fixture.querySelector(lightTableSelector)).toBeTruthy();
  });

  test("The category of props.selectedStyleId is opened and the item is selected", async () => {
    await mountPopover({ selectedStyleId: "TableStyleDark1" });
    expect(fixture.querySelector(".o-notebook-tab[data-id='dark']")?.classList).toContain(
      "selected"
    );
    expect(
      fixture.querySelector(".o-table-style-list-item[title='Black, TableStyleDark1']")?.classList
    ).toContain("selected");
  });

  test("onStylePicked callback is called", async () => {
    const closePopover = jest.fn();
    const onStylePicked = jest.fn();
    await mountPopover({ closePopover, onStylePicked });
    await click(fixture, ".o-table-style-list-item[title='Red, TableStyleMedium3']");
    expect(onStylePicked).toHaveBeenCalledWith("TableStyleMedium3");
  });

  test("Can create custom style", async () => {
    const onStylePicked = jest.fn();
    await mountPopover({ onStylePicked });
    await click(fixture, ".o-notebook-tab[data-id='custom']");
    click(fixture, ".o-new-table-style");
    expect(openSidePanel).toHaveBeenCalledWith("TableStyleEditorPanel", { onStylePicked });
  });

  describe("Custom style context menu menu", () => {
    beforeEach(async () => {
      createTableStyle(model, "MyStyle");
      await mountPopover();
      await click(fixture, ".o-notebook-tab[data-id='custom']");
    });

    test("Can edit a custom table style with the top-right hover button", async () => {
      click(fixture, ".o-table-style-edit-button");
      expect(openSidePanel).toHaveBeenCalledWith("TableStyleEditorPanel", { styleId: "MyStyle" });
    });

    test("Can edit a custom table style with the context menu", async () => {
      triggerMouseEvent('.o-table-style-list-item[title="MyStyle"]', "contextmenu");
      await nextTick();
      expect(fixture.querySelectorAll(".o-menu-item")).toHaveLength(2);
      await click(fixture, ".o-menu-item[data-name='editTableStyle'");
      expect(openSidePanel).toHaveBeenCalledWith("TableStyleEditorPanel", { styleId: "MyStyle" });
    });

    test("Can delete a custom table style with the context menu", async () => {
      triggerMouseEvent('.o-table-style-list-item[title="MyStyle"]', "contextmenu");
      await nextTick();
      click(fixture, ".o-menu-item[data-name='deleteTableStyle'");
      expect(Object.keys(model.getters.getTableStyles())).not.toContain("MyStyle");
    });
  });
});
