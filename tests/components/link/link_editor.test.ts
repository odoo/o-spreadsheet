import { App } from "@odoo/owl";
import { Model, Spreadsheet } from "../../../src";
import { buildSheetLink } from "../../../src/helpers";
import { LinkCell } from "../../../src/types";
import {
  activateSheet,
  createSheet,
  merge,
  setCellContent,
} from "../../test_helpers/commands_helpers";
import {
  clickCell,
  rightClickCell,
  setInputValueAndTrigger,
  simulateClick,
} from "../../test_helpers/dom_helper";
import { getCell } from "../../test_helpers/getters_helpers";
import { makeTestFixture, mountSpreadsheet, nextTick } from "../../test_helpers/helpers";

describe("link editor component", () => {
  let fixture: HTMLElement;
  let model: Model;
  let grid: Spreadsheet;
  let app: App;

  async function openLinkEditor(model: Model, xc: string) {
    await rightClickCell(model, xc);
    await simulateClick(".o-menu-item[data-name='insert_link']");
  }

  function labelInput(): HTMLInputElement {
    const inputs = fixture?.querySelectorAll("input")!;
    return inputs[0];
  }
  function urlInput(): HTMLInputElement {
    const inputs = fixture?.querySelectorAll("input")!;
    return inputs[1];
  }

  beforeEach(async () => {
    fixture = makeTestFixture();
    ({ app, parent: grid } = await mountSpreadsheet(fixture));
    model = grid.model;
  });

  afterEach(() => {
    app.destroy();
    fixture.remove();
  });

  test("open link editor from cell context menu", async () => {
    await rightClickCell(model, "A1");
    await simulateClick(".o-menu-item[data-name='insert_link']");
    const editor = fixture.querySelector(".o-link-editor");
    expect(editor).toBeTruthy();
    expect(labelInput().value).toBe("");
    expect(urlInput().value).toBe("");
  });

  test("open existing link editor from top bar menu", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await simulateClick(".o-topbar-menu[data-id='insert']");
    await simulateClick(".o-menu-item[data-name='insert_link']");
    const editor = fixture.querySelector(".o-link-editor");
    expect(editor).toBeTruthy();
    expect(labelInput().value).toBe("label");
    expect(urlInput().value).toBe("https://url.com");
  });

  test("open link editor from top bar menu", async () => {
    await simulateClick(".o-topbar-menu[data-id='insert']");
    await simulateClick(".o-menu-item[data-name='insert_link']");
    const editor = fixture.querySelector(".o-link-editor");
    expect(editor).toBeTruthy();
    expect(labelInput().value).toBe("");
    expect(urlInput().value).toBe("");
  });

  test("open link editor in an empty cell", async () => {
    await openLinkEditor(model, "A1");
    expect(labelInput().value).toBe("");
    expect(urlInput().value).toBe("");
  });

  test.each(["hello", "4", "TRUE", "10/10/2021", "=4", '="hello"', "=TRUE", "=10/10/2021"])(
    "open link editor in a simple cell: %s",
    async (cellContent) => {
      setCellContent(model, "A1", cellContent);
      await openLinkEditor(model, "A1");
      expect(labelInput().value).toBe(getCell(model, "A1")?.formattedValue);
      expect(urlInput().value).toBe("");
    }
  );

  test("open link editor in a merged cell", async () => {
    merge(model, "A1:A2");
    setCellContent(model, "A1", "hello");
    await openLinkEditor(model, "A2");
    expect(labelInput().value).toBe("hello");
    expect(urlInput().value).toBe("");
  });

  test("open link editor in a web link cell", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await openLinkEditor(model, "A1");
    expect(labelInput().value).toBe("label");
    expect(urlInput().value).toBe("https://url.com");
  });

  test("open link editor in a sheet link cell", async () => {
    const sheetId = "42";
    createSheet(model, { sheetId });
    setCellContent(model, "A1", `[label](${buildSheetLink(sheetId)})`);
    await openLinkEditor(model, "A1");
    expect(labelInput().value).toBe("label");
    expect(urlInput().value).toBe(model.getters.getSheetName(sheetId));
    expect(urlInput().disabled).toBeTruthy();
  });

  test("insert link with an url and a label", async () => {
    await openLinkEditor(model, "A1");
    setInputValueAndTrigger(labelInput(), "my label", "input");
    setInputValueAndTrigger(urlInput(), "https://url.com", "input");
    await simulateClick("button.o-save");
    const cell = getCell(model, "A1") as LinkCell;
    expect(cell.link.label).toBe("my label");
    expect(cell.link.url).toBe("https://url.com");
  });

  test("insert link with only an url and no label", async () => {
    await openLinkEditor(model, "A1");
    setInputValueAndTrigger(urlInput(), "https://url.com", "input");
    await simulateClick("button.o-save");
    const cell = getCell(model, "A1") as LinkCell;
    expect(cell.link.label).toBe("https://url.com");
    expect(cell.link.url).toBe("https://url.com");
  });

  test("insert sheet link", async () => {
    const sheetId = "42";
    createSheet(model, { sheetId });
    await openLinkEditor(model, "A1");
    await simulateClick("button.o-special-link");
    await simulateClick(".o-menu-item[data-name='sheet']");
    await simulateClick(`.o-menu-item[data-name='${sheetId}']`);
    expect(labelInput().value).toBe("Sheet2");
    expect(urlInput().value).toBe("Sheet2");
    expect(urlInput().disabled).toBe(true);
  });

  test("clicking the main popover closes the special link menus", async () => {
    const sheetId = "42";
    createSheet(model, { sheetId });
    await openLinkEditor(model, "A1");
    await simulateClick("button.o-special-link");
    await simulateClick(".o-menu-item[data-name='sheet']");
    expect(fixture.querySelector(".o-menu")).not.toBeNull();
    await simulateClick(".o-link-editor");
    expect(fixture.querySelector(".o-menu")).toBeNull();
  });

  test("remove current link", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await openLinkEditor(model, "A1");
    expect(urlInput().value).toBe("https://url.com");
    await simulateClick(".o-remove-url");
    expect(urlInput().value).toBe("");
  });

  test("save button is disabled while url input is empty", async () => {
    await openLinkEditor(model, "A1");
    const saveButton = fixture.querySelector("button.o-save")!;
    expect(saveButton.hasAttribute("disabled")).toBe(true);
    setInputValueAndTrigger(labelInput(), "my label", "input");
    await nextTick();
    expect(saveButton.hasAttribute("disabled")).toBe(true);
    setInputValueAndTrigger(urlInput(), "https://url.com", "input");
    await nextTick();
    expect(saveButton.hasAttribute("disabled")).toBe(false);
  });

  test("clicking another cell closes the editor", async () => {
    await openLinkEditor(model, "A1");
    expect(fixture.querySelector(".o-link-editor")).toBeTruthy();
    await clickCell(model, "B2");
    expect(fixture.querySelector(".o-link-editor")).toBeNull();
  });

  test("switching sheet closes the editor", async () => {
    const sheetId = "42";
    createSheet(model, { sheetId });
    await openLinkEditor(model, "A1");
    expect(fixture.querySelector(".o-link-editor")).toBeTruthy();
    activateSheet(model, sheetId);
    await nextTick();
    expect(fixture.querySelector(".o-link-editor")).toBeNull();
  });

  test("clicking another link cell closes the editor", async () => {
    setCellContent(model, "B2", "[label](url.com)");
    await openLinkEditor(model, "A1");
    expect(fixture.querySelector(".o-link-editor")).toBeTruthy();
    await clickCell(model, "B2");
    expect(fixture.querySelector(".o-link-editor")).toBeNull();
  });

  test("clicking the same cell closes the editor", async () => {
    await openLinkEditor(model, "A1");
    expect(fixture.querySelector(".o-link-editor")).toBeTruthy();
    await clickCell(model, "A1");
    expect(fixture.querySelector(".o-link-editor")).toBeNull();
  });

  test.each([urlInput, labelInput])(
    "cannot save with enter while url input is empty",
    async (input) => {
      await openLinkEditor(model, "A1");

      input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await nextTick();
      expect(fixture.querySelector(".o-link-editor")).toBeTruthy();
      expect(getCell(model, "A1")).toBeUndefined();

      setInputValueAndTrigger(labelInput(), "my label", "input");
      await nextTick();
      input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await nextTick();
      expect(fixture.querySelector(".o-link-editor")).toBeTruthy();
      expect(getCell(model, "A1")).toBeUndefined();

      setInputValueAndTrigger(urlInput(), "https://url.com", "input");
      await nextTick();
      input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await nextTick();
      expect(fixture.querySelector(".o-link-editor")).toBeFalsy();
      expect(getCell(model, "A1")).toBeDefined();
    }
  );
});
