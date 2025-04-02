import { Model } from "../../src";
import { click } from "../test_helpers/dom_helper";
import { getCellText } from "../test_helpers/getters_helpers";
import {
  mountSpreadsheet,
  nextTick,
  typeInComposerGrid,
  typeInComposerHelper,
} from "../test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;

beforeEach(async () => {
  ({ fixture, model } = await mountSpreadsheet({ model: new Model() }, { isSmall: true }));
});

describe("Small Bottom Bar", () => {
  // composer
  test("Clicking the validate button confirms the edition in the bottom bar composer", async () => {
    await typeInComposerGrid(`lop`);
    await click(fixture, ".o-spreadsheet-small-bottom-bar .o-composer");
    await nextTick();
    expect(fixture.querySelector(".o-selection-button")).not.toBeNull();

    await typeInComposerHelper(".o-spreadsheet-small-bottom-bar .o-composer", "c", false);
    await click(fixture, ".o-selection-button");
    expect(getCellText(model, "A1")).toBe("clop");
  });

  // ribbon menu
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
