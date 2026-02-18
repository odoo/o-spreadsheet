import { Model } from "../../src";
import { buildSheetLink } from "../../src/helpers/misc";
import { DEFAULT_LOCALE } from "../../src/types";
import { CellValueType } from "../../src/types/cells";
import {
  activateSheet,
  createSheet,
  merge,
  setCellContent,
  updateLocale,
} from "../test_helpers/commands_helpers";
import {
  clickCell,
  keyDown,
  rightClickCell,
  setInputValueAndTrigger,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import { getCell, getEvaluatedCell } from "../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";
import { extendMockGetBoundingClientRect } from "../test_helpers/mock_helpers";

extendMockGetBoundingClientRect({
  "o-special-link": () => ({ top: 100, left: 100, height: 50, width: 50 }),
});

describe("link editor component", () => {
  let fixture: HTMLElement;
  let model: Model;

  async function openLinkEditor(model: Model, xc: string) {
    await rightClickCell(model, xc);
    await simulateClick(".o-menu-item[data-name='insert_link']");
  }

  function labelInput(): HTMLInputElement {
    return fixture?.querySelector('input[title="Link label"]') as HTMLInputElement;
  }
  function urlInput(): HTMLInputElement {
    return fixture?.querySelector('input[title="Link URL"]') as HTMLInputElement;
  }

  beforeEach(async () => {
    ({ model, fixture } = await mountSpreadsheet());
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
      expect(labelInput().value).toBe(getEvaluatedCell(model, "A1").formattedValue);
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

  test("open link editor in a hyperlink formula cell with a url and a label", async () => {
    setCellContent(model, "A1", '=HYPERLINK("url.com", "label")');
    await openLinkEditor(model, "A1");
    expect(labelInput().value).toBe("label");
    expect(urlInput().value).toBe("https://url.com");
  });

  test("open link editor in a hyperlink formula cell without label", async () => {
    setCellContent(model, "B1", '=HYPERLINK("url2.com")');
    await openLinkEditor(model, "B1");
    expect(labelInput().value).toBe("url2.com");
    expect(urlInput().value).toBe("https://url2.com");
  });

  test("insert link with an url and a label", async () => {
    await openLinkEditor(model, "A1");
    await setInputValueAndTrigger(labelInput(), "my label");
    await setInputValueAndTrigger(urlInput(), "https://url.com");
    await simulateClick("button.o-save");
    const link = getEvaluatedCell(model, "A1").link;
    expect(link?.label).toBe("my label");
    expect(link?.url).toBe("https://url.com");
  });

  test("insert link with only an url and no label", async () => {
    await openLinkEditor(model, "A1");
    await setInputValueAndTrigger(urlInput(), "https://url.com");
    await simulateClick("button.o-save");
    const link = getEvaluatedCell(model, "A1").link;
    expect(link?.label).toBe("https://url.com");
    expect(link?.url).toBe("https://url.com");
  });

  test("insert sheet link", async () => {
    const sheetId = "42";
    createSheet(model, { sheetId });
    await openLinkEditor(model, "A1");
    await simulateClick(".suggestion-item[data-index='1']"); // click on the first proposal which should be the sheet link
    expect(labelInput().value).toBe("Sheet2");
    expect(urlInput().value).toBe("Sheet2");
    expect(urlInput().disabled).toBe(true);
  });

  test("Can filter link proposals", async () => {
    const sheetId = "42";
    const sheetName = "tabouret";
    createSheet(model, { sheetId, name: sheetName });
    await openLinkEditor(model, "A1");
    expect(fixture.querySelectorAll(".suggestion-item").length).toBe(2);
    await setInputValueAndTrigger(urlInput(), "tabou");
    expect(fixture.querySelectorAll(".suggestion-item").length).toBe(1);
  });

  test("Can select a proposal with arrow keys", async () => {
    const sheetId = "42";
    const sheetName = "tabouret";
    createSheet(model, { sheetId, name: sheetName });
    await openLinkEditor(model, "A1");
    await keyDown({ key: "ArrowDown" });
    expect(labelInput().value).toBe("");
    expect(urlInput().value).toBe("");
    await keyDown({ key: "Enter" });
    expect(labelInput().value).toBe("Sheet1");
    expect(urlInput().value).toBe("Sheet1");
    expect(urlInput().disabled).toBe(true);
    await keyDown({ key: "ArrowDown" });
    await keyDown({ key: "Enter" });
    expect(labelInput().value).toBe("tabouret");
    expect(urlInput().value).toBe("tabouret");
    expect(urlInput().disabled).toBe(true);
  });

  test("selecting a proposal does not reset the suggestions", async () => {
    const sheetId = "42";
    const sheetName = "tabouret";
    createSheet(model, { sheetId, name: sheetName });
    await openLinkEditor(model, "A1");
    await setInputValueAndTrigger(urlInput(), "tabou");
    expect(fixture.querySelectorAll(".suggestion-item").length).toBe(1);
    await simulateClick(".suggestion-item");
    expect(fixture.querySelectorAll(".suggestion-item").length).toBe(1);
  });

  test("label is changed to canonical form in model", async () => {
    updateLocale(model, {
      ...DEFAULT_LOCALE,
      formulaArgSeparator: ";",
      decimalSeparator: ",",
      thousandsSeparator: " ",
    });
    await openLinkEditor(model, "A1");
    await setInputValueAndTrigger(labelInput(), "3,15");
    await setInputValueAndTrigger(urlInput(), "https://url.com");
    await simulateClick("button.o-save");
    const evaluatedCell = getEvaluatedCell(model, "A1");
    expect(evaluatedCell).toMatchObject({
      type: CellValueType.number,
      value: 3.15,
      formattedValue: "3,15",
      link: {
        label: "3.15",
        url: "https://url.com",
      },
    });
  });

  test("remove current link", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await openLinkEditor(model, "A1");
    expect(urlInput().value).toBe("https://url.com");
    await simulateClick(".o-remove-url");
    expect(urlInput().value).toBe("");
  });

  test("remove link from HYPERLINK function", async () => {
    setCellContent(model, "B1", '=HYPERLINK("url.com", "label")');
    await openLinkEditor(model, "B1");
    expect(urlInput().value).toBe("https://url.com");
    await simulateClick(".o-remove-url");
    expect(urlInput().value).toBe("");
  });

  test("removing the link resets the proposals", async () => {
    const sheetId = "42";
    const sheetName = "tabouret";
    createSheet(model, { sheetId, name: sheetName });
    await openLinkEditor(model, "A1");
    expect(fixture.querySelectorAll(".suggestion-item").length).toBe(2);
    await setInputValueAndTrigger(urlInput(), "tabou");
    expect(fixture.querySelectorAll(".suggestion-item").length).toBe(1);
    await simulateClick(".suggestion-item");
    await simulateClick(".o-remove-url");
    expect(fixture.querySelectorAll(".suggestion-item").length).toBe(2);
  });

  test("clicking the cross button resets the search suggestions", async () => {
    const sheetId = "42";
    const sheetName = "tabouret";
    createSheet(model, { sheetId, name: sheetName });
    await openLinkEditor(model, "A1");
    expect(fixture.querySelectorAll(".suggestion-item").length).toBe(2);
    await setInputValueAndTrigger(urlInput(), "tabou");
    expect(fixture.querySelectorAll(".suggestion-item").length).toBe(1);
    await simulateClick(".o-remove-url");
    expect(fixture.querySelectorAll(".suggestion-item").length).toBe(2);
  });

  test("Double clicking a proposal saves the link", async () => {
    const sheetId = "42";
    const sheetName = "tabouret";
    createSheet(model, { sheetId, name: sheetName });
    await openLinkEditor(model, "A1");
    await simulateClick(".suggestion-item[data-index='1']");
    triggerMouseEvent(fixture.querySelector(".suggestion-item[data-index='1']"), "dblclick");
    const link = getEvaluatedCell(model, "A1").link;
    expect(link?.label).toBe("tabouret");
    expect(link?.url).toBe("o-spreadsheet://42");
  });

  test("save button is disabled while url input is empty", async () => {
    await openLinkEditor(model, "A1");
    const saveButton = fixture.querySelector("button.o-save")!;
    expect(saveButton.hasAttribute("disabled")).toBe(true);
    await setInputValueAndTrigger(labelInput(), "my label");
    expect(saveButton.hasAttribute("disabled")).toBe(true);
    await setInputValueAndTrigger(urlInput(), "https://url.com");
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

      await keyDown({ key: "Enter" });
      expect(fixture.querySelector(".o-link-editor")).toBeTruthy();
      expect(getCell(model, "A1")).toBeUndefined();

      await setInputValueAndTrigger(labelInput(), "my label");
      await keyDown({ key: "Enter" });
      expect(fixture.querySelector(".o-link-editor")).toBeTruthy();
      expect(getCell(model, "A1")).toBeUndefined();

      await setInputValueAndTrigger(urlInput(), "https://url.com");
      await keyDown({ key: "Enter" });
      expect(fixture.querySelector(".o-link-editor")).toBeFalsy();
      expect(getCell(model, "A1")).toBeDefined();
    }
  );
});
