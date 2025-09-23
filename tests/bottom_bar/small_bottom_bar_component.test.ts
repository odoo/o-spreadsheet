import { Model } from "../../src";
import { setCellContent } from "../test_helpers/commands_helpers";
import { click } from "../test_helpers/dom_helper";
import { getCellText } from "../test_helpers/getters_helpers";
import {
  mountSpreadsheet,
  nextTick,
  setMobileMode,
  typeInComposerGrid,
  typeInComposerHelper,
} from "../test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;

beforeEach(async () => {
  ({ fixture, model } = await mountSpreadsheet({ model: new Model() }, { isSmall: true }));
});

const composerSelector = ".o-spreadsheet-small-bottom-bar .o-composer";

describe("Small Bottom Bar", () => {
  describe("Composer", () => {
    test("Clicking the validate button confirms the edition in the bottom bar composer", async () => {
      setCellContent(model, "A1", "lop");
      await click(fixture, composerSelector);
      expect(fixture.querySelector(".o-selection-button")).not.toBeNull();

      await typeInComposerHelper(composerSelector, "c", false);
      await click(fixture, ".o-selection-button");
      expect(getCellText(model, "A1")).toBe("clop");
    });

    test("Can insert symbols in the composer", async () => {
      await click(fixture, composerSelector);
      expect(
        fixture.querySelector(".o-spreadsheet-small-bottom-bar .o-spreadsheet-editor-symbol")
      ).not.toBeNull();
      const composerEl = fixture.querySelector(composerSelector) as HTMLInputElement;

      await click(fixture, ".o-spreadsheet-editor-symbol[title='=']");
      expect(composerEl.textContent).toBe("=");

      await click(fixture, ".o-spreadsheet-editor-symbol[title='(']");
      expect(composerEl.textContent).toBe("=(");

      await click(fixture, ".o-spreadsheet-editor-symbol[title='-']");
      expect(composerEl.textContent).toBe("=(-");
    });
  });

  describe("Ribbon Menu", () => {
    test("Navigate through ribbon menu", async () => {
      await click(fixture, ".bottom-bar-menu .ribbon-toggler");
      expect(fixture.querySelector(".o-ribbon-menu")).not.toBeNull();
      expect(fixture.querySelector(".o-ribbon-menu .o-ribbon-title")?.textContent).toBe("Menu Bar");

      await click(fixture, ".o-ribbon-menu .o-menu-item[title='View']");
      expect(fixture.querySelector(".o-ribbon-menu .o-ribbon-title")?.textContent).toBe("View");
      expect(fixture.querySelectorAll(".o-ribbon-menu .o-menu-item")).toHaveLength(4);

      await click(fixture, ".o-ribbon-menu .o-menu-item[title='Freeze']");
      expect(fixture.querySelector(".o-ribbon-menu .o-ribbon-title")?.textContent).toBe("Freeze");
      expect(fixture.querySelectorAll(".o-ribbon-menu .o-menu-item")).toHaveLength(6);

      await click(fixture, ".o-ribbon-menu .o-previous-button");
      expect(fixture.querySelector(".o-ribbon-menu .o-ribbon-title")?.textContent).toBe("View");
      expect(fixture.querySelectorAll(".o-ribbon-menu .o-menu-item")).toHaveLength(4);

      await click(fixture, ".o-ribbon-menu .o-previous-button");
      expect(fixture.querySelector(".o-ribbon-menu .o-ribbon-title")?.textContent).toBe("Menu Bar");

      await click(fixture, ".o-ribbon-menu .o-previous-button");
      expect(fixture.querySelector(".o-ribbon-menu")).toBeNull();
    });

    test("clicking the grid closes the ribbon menu", async () => {
      await click(fixture, ".bottom-bar-menu .ribbon-toggler");
      expect(fixture.querySelector(".o-ribbon-menu")).not.toBeNull();

      await click(fixture, ".o-grid");
      expect(fixture.querySelector(".o-ribbon-menu")).toBeNull();
    });

    test("clicking on a menu action closes the ribbon menu", async () => {
      await click(fixture, ".bottom-bar-menu .ribbon-toggler");
      expect(fixture.querySelector(".o-ribbon-menu")).not.toBeNull();

      await click(fixture, ".o-ribbon-menu .o-menu-item[title='Edit']");
      await click(fixture, ".o-ribbon-menu .o-menu-item[title='Copy']");
      expect(fixture.querySelector(".o-ribbon-menu")).toBeNull();
    });
  });

  test("scroll is reset when navigating through ribbon menu", async () => {
    await click(fixture, ".bottom-bar-menu .ribbon-toggler");
    const ribbonMenuWrapper = fixture.querySelector<HTMLElement>(".o-ribbon-menu-wrapper")!;
    expect(ribbonMenuWrapper).not.toBeNull();

    expect(fixture.querySelector(".o-ribbon-menu-wrapper")?.scrollTop).toBe(0);
    ribbonMenuWrapper.scrollTop = 10;
    await nextTick();

    await click(fixture, ".o-ribbon-menu .o-menu-item[title='View']");
    expect(ribbonMenuWrapper.scrollTop).toBe(0);
  });
});

describe("Small Bottom Bar - Mobile Mode", () => {
  test("the bottombar composer is auto focused on edition in mobile mode", async () => {
    setMobileMode();
    await nextTick();
    await typeInComposerGrid(`=SUM(`);
    expect(fixture.querySelector(".o-spreadsheet-small-bottom-bar .o-composer")).toBe(
      document.activeElement
    );
  });
});
