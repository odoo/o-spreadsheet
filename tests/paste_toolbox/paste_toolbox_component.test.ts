import { Model, Spreadsheet } from "../../src";
import { PASTE_ACTION as pasteAction } from "../../src/actions/menu_items_actions";
import { MockClipboardData, getClipboardEvent } from "../test_helpers/clipboard";
import {
  copy,
  paste,
  pasteFromOSClipboard,
  setCellContent,
  setSelection,
} from "../test_helpers/commands_helpers";
import { click } from "../test_helpers/dom_helper";
import { getCell } from "../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";

describe("Paste toolbox", () => {
  let model: Model;
  let fixture: HTMLElement;
  let parent: Spreadsheet;
  beforeEach(async () => {
    // mount a spreadsheet with a paste toolbox
    ({ model, fixture, parent } = await mountSpreadsheet());
  });

  test("Activates on paste", async () => {
    setCellContent(model, "A1", "1");
    copy(model, "A1");
    paste(model, "A2");
    await nextTick();
    expect(fixture.querySelector(".o-paste")).not.toBeNull();
  });

  test("Activates on OS paste", async () => {
    pasteFromOSClipboard(model, "A2", { text: "1\n2" });
    await nextTick();
    expect(fixture.querySelector(".o-paste")).not.toBeNull();
  });

  test("Clicking the paste toolbox opens a menu", async () => {
    setCellContent(model, "A1", "1");
    copy(model, "A1");
    paste(model, "A2");
    await nextTick();
    await click(fixture, ".o-paste");
    expect(fixture.querySelector(".o-menu")).not.toBeNull();
  });

  test("closes when changing paste target (i.e. the selection)", async () => {
    setCellContent(model, "A1", "1");
    copy(model, "A1");
    paste(model, "A2");
    await nextTick();
    expect(fixture.querySelector(".o-paste")).not.toBeNull();
    model.selection.selectCell(1, 1);
    await nextTick();
    expect(fixture.querySelector(".o-paste")).toBeNull();
    paste(model, "A2");
    await nextTick();
    await click(fixture, ".o-paste");
    expect(fixture.querySelector(".o-menu")).not.toBeNull();
    model.selection.selectCell(1, 1);
    await nextTick();
    expect(fixture.querySelector(".o-menu")).toBeNull();
  });

  test("Menu items are correct", async () => {
    setCellContent(model, "A1", "1");
    copy(model, "A1");
    paste(model, "A2");
    await nextTick();
    await click(fixture, ".o-paste");
    expect(fixture.querySelector(".o-menu")).toMatchSnapshot();
  });

  test("Can cycle through the paste options", async () => {
    model.dispatch("UPDATE_CELL", {
      sheetId: model.getters.getActiveSheetId(),
      col: 0,
      row: 0,
      style: { bold: true },
      content: "1",
      format: "m/d/yyyy",
    });

    // required to polulate the os clipboard
    const clipboardData = new MockClipboardData();
    document.body.dispatchEvent(getClipboardEvent("copy", clipboardData));
    parent.env.clipboard.write(clipboardData.content);

    setSelection(model, ["A3"]);
    await pasteAction(parent.env);
    expect(getCell(model, "A3")).toMatchObject({
      content: "1",
      style: { bold: true },
      format: "m/d/yyyy",
    });
    await nextTick();

    // as Value
    await click(fixture, ".o-paste");
    await click(fixture, ".o-menu-item[data-name=paste_special_value]");
    expect(getCell(model, "A3")).toMatchObject({
      content: "1",
      style: undefined,
      format: "m/d/yyyy",
    });
    // as format only
    await nextTick();
    await click(fixture, ".o-paste");
    await click(fixture, ".o-menu-item[data-name=paste_special_format]");
    expect(getCell(model, "A3")).toMatchObject({
      content: "",
      style: { bold: true },
      format: "m/d/yyyy",
    });

    // as normal paste
    await nextTick();
    await click(fixture, ".o-paste");
    await click(fixture, ".o-menu-item[data-name=paste]");
    expect(getCell(model, "A3")).toMatchObject({
      content: "1",
      style: { bold: true },
      format: "m/d/yyyy",
    });
  });
});
