import { Model, Spreadsheet } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { SearchOptions } from "../../src/types/find_and_replace";
import { activateSheet, createSheet, setCellContent } from "../test_helpers/commands_helpers";
import {
  click,
  focusAndKeyDown,
  setInputValueAndTrigger,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import { getCell, getCellContent } from "../test_helpers/getters_helpers";
import { mountSpreadsheet, nextTick } from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

const selectors = {
  closeSidepanel: ".o-sidePanel .o-sidePanelClose",
  inputSearch: ".o-sidePanel .o-find-and-replace .o-search",
  inputReplace: ".o-sidePanel .o-find-and-replace input.o-replace",
  previousButton: ".o-sidePanel .o-find-and-replace .arrow-up",
  nextButton: ".o-sidePanel .o-find-and-replace .arrow-down",
  replaceButton: ".o-sidePanel .o-find-and-replace button.o-replace",
  replaceAllButton: ".o-sidePanel .o-find-and-replace button.o-replace-all",
  checkBoxMatchingCase:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-checkbox:nth-child(1) input",
  checkBoxExactMatch:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-checkbox:nth-child(2) input",
  checkBoxSearchFormulas:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-checkbox:nth-child(3) input",
  checkBoxReplaceFormulas:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(3) .o-far-item:nth-child(3) input",
  searchRangeSelection:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-type-range-selector",
  searchRange: ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-selection-input input",
  resetSearchRange: ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-selection-ko",
  confirmSearchRange: ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-selection-ok",
  matchesCount: ".o-sidePanel .o-find-and-replace .o-matches-count",
};

function changeSearchScope(scope: SearchOptions["searchScope"]) {
  const selectRangeSelection = document.querySelector(
    selectors.searchRangeSelection
  ) as HTMLSelectElement;
  setInputValueAndTrigger(selectRangeSelection, scope);
}

async function inputSearchValue(value: string) {
  setInputValueAndTrigger(selectors.inputSearch, value);
  /** Fake timers use to control debounceSearch in Find and Replace */
  jest.runOnlyPendingTimers();
  await nextTick();
}

function getMatchesCountContent() {
  const countSpans = document.querySelectorAll(selectors.matchesCount + " span");
  return [...countSpans].map((div) => div.textContent).filter((text) => text !== "");
}

function getMatchesCount() {
  const counts = [...document.querySelectorAll(selectors.matchesCount + " div")].map(
    (div) => div.textContent
  );
  if (counts.length === 0) {
    return undefined;
  }

  const countAllSheets = parseInt(counts.find((text) => text?.includes("in all sheets")) || "0");
  const countCurrentSheet = parseInt(counts.find((text) => text?.includes("in")) || "0");
  const countSpecificRange = parseInt(counts.find((text) => text?.includes("in range")) || "0");

  return {
    allSheets: countAllSheets,
    currentSheet: countCurrentSheet,
    specificRange: countSpecificRange,
  };
}

function getSelectedMatchIndex() {
  return parseInt(document.querySelector("div.o-input-count")!.textContent || "");
}

describe("find and replace sidePanel component", () => {
  let fixture: HTMLElement;
  let parent: Spreadsheet;
  let model: Model;

  beforeEach(async () => {
    jest.useFakeTimers();
    ({ parent, model, fixture } = await mountSpreadsheet());
    parent.env.openSidePanel("FindAndReplace");
    await nextTick();
  });

  describe("Sidepanel", () => {
    test("When opening sidepanel, focus will be on search input", async () => {
      expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
      await nextTick();
      expect(document.activeElement).toBe(document.querySelector(selectors.inputSearch));
    });

    test("disable next/previous/replace/replaceAll if searching on empty string", async () => {
      await setInputValueAndTrigger(selectors.inputSearch, "");
      expect(document.querySelector(selectors.previousButton)).toBe(null);
      expect(document.querySelector(selectors.nextButton)).toBe(null);
      expect((document.querySelector(selectors.replaceButton) as HTMLButtonElement).disabled).toBe(
        true
      );
      expect(
        (document.querySelector(selectors.replaceAllButton) as HTMLButtonElement).disabled
      ).toBe(true);
    });
  });

  describe("basic search", () => {
    test("simple search", async () => {
      setCellContent(model, "A1", "1");
      await inputSearchValue("1");
      expect(getMatchesCount()).toMatchObject({ allSheets: 1, currentSheet: 1 });
    });

    test("clicking on next", async () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "1");
      await inputSearchValue("1");
      expect(getSelectedMatchIndex()).toBe(1);
      await click(fixture, selectors.nextButton);
      expect(getSelectedMatchIndex()).toBe(2);
    });

    test("Going to the next match with Enter key", async () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "1");
      await inputSearchValue("1");
      expect(getSelectedMatchIndex()).toBe(1);
      await focusAndKeyDown(selectors.inputSearch, { key: "Enter" });
      expect(getSelectedMatchIndex()).toBe(2);
    });

    test("Going to the previous match with Shift+Enter key", async () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "1");
      setCellContent(model, "A3", "1");
      await inputSearchValue("1");
      expect(getSelectedMatchIndex()).toBe(1);
      await focusAndKeyDown(selectors.inputSearch, { key: "Enter", shiftKey: true });
      expect(getSelectedMatchIndex()).toBe(3);
      await focusAndKeyDown(selectors.inputSearch, { key: "Enter", shiftKey: true });
      expect(getSelectedMatchIndex()).toBe(2);
    });

    test("clicking on previous", async () => {
      setCellContent(model, "A1", "1");
      setCellContent(model, "A2", "1");
      setCellContent(model, "A3", "1");
      await inputSearchValue("1");
      expect(getSelectedMatchIndex()).toBe(1);
      await click(fixture, selectors.previousButton);
      expect(getSelectedMatchIndex()).toBe(3);
    });

    test("search on empty string", async () => {
      await inputSearchValue("");
      expect(getMatchesCount()).toBeUndefined();
    });

    test("clicking on specific range and hitting confirm will search in the range", async () => {
      setCellContent(model, "A1", "1");
      inputSearchValue("1");

      expect(document.querySelector(selectors.searchRange)).toBeFalsy();
      changeSearchScope("specificRange");
      await nextTick();
      await nextTick(); // selection input need 2 nextTicks because ¯\_(ツ)_/¯

      expect(document.querySelector(selectors.searchRange)).toBeTruthy();
      await setInputValueAndTrigger(selectors.searchRange, "A1:B2", "onlyInput");
      expect(getMatchesCount()).toMatchObject({ specificRange: 0 });

      await click(fixture, selectors.confirmSearchRange);
      expect(getMatchesCount()).toMatchObject({ specificRange: 1 });
    });

    test("Ranges are properly updated by with several grid selections", async () => {
      setCellContent(model, "A1", "1");
      inputSearchValue("1");
      changeSearchScope("specificRange");
      await nextTick();
      await nextTick();
      (fixture.querySelector(selectors.searchRange) as HTMLInputElement).focus();
      triggerMouseEvent(
        ".o-grid-overlay",
        "pointerdown",
        DEFAULT_CELL_WIDTH / 2,
        DEFAULT_CELL_HEIGHT / 2
      );
      // let at least a rendering to mimic a realistic behaviour. The compopents could render between the events
      await nextTick();
      triggerMouseEvent(
        ".o-grid-overlay",
        "pointermove",
        DEFAULT_CELL_WIDTH / 2,
        (3 / 2) * DEFAULT_CELL_HEIGHT
      );
      await nextTick();

      expect(getMatchesCount()).toMatchObject({ specificRange: 0 });

      await click(fixture, selectors.confirmSearchRange);
      expect(getMatchesCount()).toMatchObject({ specificRange: 1 });
    });

    test.skip("Specific range is following the active sheet", async () => {
      //TODO : uh ? Is this test wrong ? The specific range doesn't follow the active sheet in master...
      createSheet(model, { sheetId: "sh2" });
      setCellContent(model, "A1", "1");

      inputSearchValue("1");
      changeSearchScope("specificRange");
      await nextTick();
      await nextTick(); // selection input need 2 nextTicks because ¯\_(ツ)_/¯
      await setInputValueAndTrigger(selectors.searchRange, "A1:B2");
      await click(fixture, selectors.confirmSearchRange);

      expect(getMatchesCount()).toMatchObject({ specificRange: 1 });

      activateSheet(model, "sh2");
      await nextTick();
      expect(getMatchesCount()).toMatchObject({ specificRange: 0 });

      setCellContent(model, "A1", "1", "sh2");
      await nextTick();
      expect(getMatchesCount()).toMatchObject({ specificRange: 1 });
    });

    test.each(["allSheets", "activeSheet"] as const)(
      "Specific range is persistent when changing scopes",
      async (scope) => {
        changeSearchScope("specificRange");
        await nextTick();
        await nextTick(); // selection input need 2 nextTicks because ¯\_(ツ)_/¯
        setInputValueAndTrigger(selectors.searchRange, "A1:B2");
        await nextTick();
        await click(fixture, selectors.confirmSearchRange);
        changeSearchScope(scope);
        await nextTick();
        expect(document.querySelector(selectors.searchRange)).toBeFalsy();
        changeSearchScope("specificRange");
        await nextTick();
        expect((document.querySelector(selectors.searchRange) as HTMLInputElement).value).toBe(
          "A1:B2"
        );
      }
    );

    test("Change in specific range selectionInput is confirmed when reselecting the search input", async () => {
      setCellContent(model, "A1", "1");
      changeSearchScope("specificRange");
      await inputSearchValue("1");
      await nextTick(); // selection input need 2 nextTicks because ¯\_(ツ)_/¯

      expect(fixture.querySelector(selectors.searchRange)).toBeTruthy();
      expect(getMatchesCount()).toMatchObject({ specificRange: 0 });

      await setInputValueAndTrigger(selectors.searchRange, "A1:B2", "onlyInput");
      expect(getMatchesCount()).toMatchObject({ specificRange: 0 });

      await click(fixture, selectors.confirmSearchRange);
      expect(getMatchesCount()).toMatchObject({ specificRange: 1 });
    });
  });

  describe("search count match", () => {
    test("search match count is displayed", async () => {
      setCellContent(model, "A1", "Hello");
      expect(fixture.querySelector(".o-input-count")).toBeNull();
      await inputSearchValue("Hel");
      expect(fixture.querySelector(".o-input-count")?.innerHTML).toBe("1 / 1");
    });

    test("search match count is removed when input is cleared", async () => {
      setCellContent(model, "A1", "Hello");
      await setInputValueAndTrigger(selectors.inputSearch, "Hel"); // wait the next render to check if the count is displayed
      expect(fixture.querySelector(".o-input-count")).toBeNull();
      jest.runOnlyPendingTimers();
      await nextTick();
      expect(fixture.querySelector(".o-input-count")?.innerHTML).toBe("1 / 1");
      await inputSearchValue("");
      expect(fixture.querySelector(".o-input-count")).toBeNull();
    });

    test("search without match displays no match count", async () => {
      expect(fixture.querySelector(".o-input-count")).toBeNull();
      await inputSearchValue("a search term");
      expect(fixture.querySelector(".o-input-count")?.innerHTML).toBe(" 0 / 0 ");
    });
  });

  describe("search options", () => {
    test("Can search matching case", async () => {
      setCellContent(model, "A1", "HELLO");
      await inputSearchValue("hello");
      expect(getMatchesCount()).toMatchObject({ currentSheet: 1 });
      await click(fixture, selectors.checkBoxMatchingCase);
      expect(getMatchesCount()).toMatchObject({ currentSheet: 0 });
    });

    test("Can search matching entire cell", async () => {
      setCellContent(model, "A1", "Hello there");
      await inputSearchValue("hello");
      expect(getMatchesCount()).toMatchObject({ currentSheet: 1 });
      await click(fixture, selectors.checkBoxExactMatch);
      expect(getMatchesCount()).toMatchObject({ currentSheet: 0 });
    });

    test("can search in formulas", async () => {
      setCellContent(model, "A1", "=SUM(2)");
      await inputSearchValue("sum");
      expect(getMatchesCount()).toMatchObject({ currentSheet: 0 });
      await click(fixture, selectors.checkBoxSearchFormulas);
      expect(getMatchesCount()).toMatchObject({ currentSheet: 1 });
    });

    test("search in formulas shows formulas", async () => {
      await click(document.querySelector(selectors.checkBoxSearchFormulas)!);
      expect(model.getters.shouldShowFormulas()).toBe(true);
    });

    test("closing the side panel reset the showFormula setting to its original value", async () => {
      await click(fixture, selectors.checkBoxSearchFormulas);
      expect(model.getters.shouldShowFormulas()).toBe(true);
      await click(fixture, selectors.closeSidepanel);
      expect(model.getters.shouldShowFormulas()).toBe(false);

      model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
      parent.env.openSidePanel("FindAndReplace");
      await nextTick();

      expect(model.getters.shouldShowFormulas()).toBe(true);
      const searchInFormulaCheckbox = document.querySelector(selectors.checkBoxSearchFormulas)!;
      expect((searchInFormulaCheckbox as HTMLInputElement).checked).toBe(true);
      await click(fixture, selectors.checkBoxSearchFormulas);
      expect((searchInFormulaCheckbox as HTMLInputElement).checked).toBe(false);
      expect(model.getters.shouldShowFormulas()).toBe(false);

      await click(fixture, selectors.closeSidepanel);
      expect(model.getters.shouldShowFormulas()).toBe(true);
    });

    test("Setting show formula from f&r should retain its state even it's changed via topbar", async () => {
      model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
      await nextTick();
      expect(model.getters.shouldShowFormulas()).toBe(true);
      expect(
        (document.querySelector(selectors.checkBoxSearchFormulas) as HTMLInputElement).checked
      ).toBe(true);
      await click(fixture, selectors.checkBoxSearchFormulas);
      expect(model.getters.shouldShowFormulas()).toBe(false);
      expect(
        (document.querySelector(selectors.checkBoxSearchFormulas) as HTMLInputElement).checked
      ).toBe(false);
    });
  });

  describe("replace options", () => {
    test("Can replace a simple text value", async () => {
      setCellContent(model, "A1", "hello");
      inputSearchValue("hello");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "kikou");
      await click(fixture, selectors.replaceButton);
      expect(getCellContent(model, "A1")).toBe("kikou");
    });

    test("Can replace a value in a formula", async () => {
      setCellContent(model, "A1", "=SUM(2)");
      inputSearchValue("2");
      await click(fixture, selectors.checkBoxSearchFormulas);
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "4");
      await click(fixture, selectors.replaceButton);
      expect(getCell(model, "A1")?.content).toBe("=SUM(4)");
    });

    test("formulas wont be modified if not looking in formulas or not modifying formulas", async () => {
      setCellContent(model, "A1", "=SUM(2)");
      inputSearchValue("4");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "2");
      await click(fixture, selectors.replaceButton);
      expect(getCell(model, "A1")?.content).toBe("=SUM(2)");
    });

    test("can replace all", async () => {
      setCellContent(model, "A1", "hello");
      setCellContent(model, "A2", "hell");
      inputSearchValue("hell");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "kikou");
      await click(fixture, selectors.replaceAllButton);
      expect(getCellContent(model, "A1")).toBe("kikouo");
      expect(getCellContent(model, "A2")).toBe("kikou");
    });

    test("Can replace with Enter key", async () => {
      setCellContent(model, "A1", "hell");
      inputSearchValue("hell");
      setInputValueAndTrigger(selectors.inputReplace, "kikou");
      await focusAndKeyDown(selectors.inputReplace, { key: "Enter" });
      expect(getCellContent(model, "A1")).toBe("kikou");
    });
  });

  describe("match counts checking", () => {
    test("match counts return number of search in allSheet, currentSheet and selected range", async () => {
      createSheet(model, { sheetId: "sheet2" });
      setCellContent(model, "A1", "Hello");
      setCellContent(model, "A3", "Hello");
      setCellContent(model, "B1", "Hello");
      setCellContent(model, "A1", "Hello", "sheet2");
      setCellContent(model, "A2", "Hello", "sheet2");
      expect(fixture.querySelector(".o-matches-count")).toBeNull();
      expect(getMatchesCountContent()).toEqual([]);
      await inputSearchValue("hello");
      expect(getMatchesCountContent()).toEqual(["3 matches in Sheet1", "5 matches in all sheets"]);
      changeSearchScope("specificRange");
      await nextTick();
      expect(getMatchesCountContent()).toEqual(["3 matches in Sheet1", "5 matches in all sheets"]);
      await simulateClick(selectors.searchRange);
      setInputValueAndTrigger(selectors.searchRange, "A1:B2");
      await nextTick();
      await click(fixture, selectors.confirmSearchRange);
      expect(getMatchesCountContent()).toEqual([
        "2 matches in range A1:B2 of Sheet1",
        "3 matches in Sheet1",
        "5 matches in all sheets",
      ]);
    });
  });
});
