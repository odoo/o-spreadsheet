import { Model } from "../../src";
import { buildSheetLink } from "../../src/helpers";
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
} from "../test_helpers/dom_helper";
import { getCell, getEvaluatedCell } from "../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";
import { mockGetBoundingClientRect } from "../test_helpers/mock_helpers";

mockGetBoundingClientRect({
  "o-spreadsheet": () => ({ top: 0, left: 0, height: 1000, width: 1000 }),
});

describe("link editor component", () => {
  let fixture: HTMLElement;
  let model: Model;

  async function openLinkEditor(model: Model, xc: string) {
    await rightClickCell(model, xc);
    await simulateClick(".o-menu-item[data-name='insert_link']");
  }

  function labelInput(): HTMLInputElement {
    const inputs = fixture?.querySelector('input[title="Link label"]')! as HTMLInputElement;
    return inputs;
  }
  function urlInput(): HTMLInputElement {
    const inputs = fixture?.querySelector('input[title="Link URL"]')! as HTMLInputElement;
    return inputs;
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
    setInputValueAndTrigger(labelInput(), "my label");
    setInputValueAndTrigger(urlInput(), "https://url.com");
    await simulateClick("button.o-save");
    const link = getEvaluatedCell(model, "A1").link;
    expect(link?.label).toBe("my label");
    expect(link?.url).toBe("https://url.com");
  });

  test("insert link with only an url and no label", async () => {
    await openLinkEditor(model, "A1");
    setInputValueAndTrigger(urlInput(), "https://url.com");
    await simulateClick("button.o-save");
    const link = getEvaluatedCell(model, "A1").link;
    expect(link?.label).toBe("https://url.com");
    expect(link?.url).toBe("https://url.com");
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

  test("label is changed to canonical form in model", async () => {
    updateLocale(model, {
      ...DEFAULT_LOCALE,
      formulaArgSeparator: ";",
      decimalSeparator: ",",
      thousandsSeparator: " ",
    });
    await openLinkEditor(model, "A1");
    setInputValueAndTrigger(labelInput(), "3,15");
    setInputValueAndTrigger(urlInput(), "https://url.com");
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

  test("remove link from HYPERLINK function", async () => {
    setCellContent(model, "B1", '=HYPERLINK("url.com", "label")');
    await openLinkEditor(model, "B1");
    expect(urlInput().value).toBe("https://url.com");
    await simulateClick(".o-remove-url");
    expect(urlInput().value).toBe("");
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
