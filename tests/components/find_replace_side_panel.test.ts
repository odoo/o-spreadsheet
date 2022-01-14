import { Model } from "../../src";
import { setInputValueAndTrigger, triggerMouseEvent } from "../test_helpers/dom_helper";
import { makeTestFixture, mountSpreadsheet, nextTick, Parent } from "../test_helpers/helpers";
jest.mock("../../src/helpers/uuid", () => require("../__mocks__/uuid"));

let model: Model;

const selectors = {
  closeSidepanel: ".o-sidePanel .o-sidePanelClose",
  inputSearch:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-input-search-container input",
  inputReplace: ".o-sidePanel .o-find-and-replace .o-section:nth-child(3) input",
  previousButton:
    ".o-sidePanel .o-find-and-replace .o-sidePanelButtons:nth-of-type(2) .o-sidePanelButton:nth-child(1)",
  nextButton:
    ".o-sidePanel .o-find-and-replace .o-sidePanelButtons:nth-of-type(2) .o-sidePanelButton:nth-child(2)",
  replaceButton:
    ".o-sidePanel .o-find-and-replace .o-sidePanelButtons:nth-of-type(4) .o-sidePanelButton:nth-child(1)",
  replaceAllButton:
    ".o-sidePanel .o-find-and-replace .o-sidePanelButtons:nth-of-type(4) .o-sidePanelButton:nth-child(2)",
  checkBoxMatchingCase:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-far-item:nth-child(1) input",
  checkBoxExactMatch:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-far-item:nth-child(2) input",
  checkBoxSearchFormulas:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(1) .o-far-item:nth-child(3) input",
  checkBoxReplaceFormulas:
    ".o-sidePanel .o-find-and-replace .o-section:nth-child(3) .o-far-item:nth-child(3) input",
};

describe("find and replace sidePanel component", () => {
  let fixture: HTMLElement;
  let parent: Parent;
  beforeEach(async () => {
    fixture = makeTestFixture();
    parent = await mountSpreadsheet(fixture);
    model = parent.model;
    parent.getSpreadsheetEnv().openSidePanel("FindAndReplace");
    await nextTick();
  });

  afterEach(() => {
    fixture.remove();
    parent.__owl__.destroy();
  });
  describe("Sidepanel", () => {
    test("Can close the find and replace side panel", async () => {
      expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
      triggerMouseEvent(document.querySelector(selectors.closeSidepanel), "click");
      await nextTick();
      expect(document.querySelectorAll(".o-sidePanel").length).toBe(0);
    });

    test("When opening sidepanel, focus will be on search input", async () => {
      expect(document.querySelectorAll(".o-sidePanel").length).toBe(1);
      await nextTick();
      expect(document.activeElement).toBe(document.querySelector(selectors.inputSearch));
    });

    test("focusing the sidepanel will update the search", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "hello", "input");
      await nextTick();
      const inputSearch: HTMLElement = document.activeElement as HTMLButtonElement;
      expect(document.activeElement).toBe(document.querySelector(selectors.inputSearch));

      inputSearch!.blur();
      expect(document.activeElement).toBe(document.querySelector("body"));

      const sidePanel = document.querySelector(".o-find-and-replace");
      const dispatch = parent.observeDispatch();
      sidePanel!.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("REFRESH_SEARCH");
    });

    test("disable next/previous/replace/replaceAll if searching on empty string", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "", "input");
      await nextTick();
      expect((document.querySelector(selectors.previousButton) as HTMLButtonElement).disabled).toBe(
        true
      );
      expect((document.querySelector(selectors.nextButton) as HTMLButtonElement).disabled).toBe(
        true
      );
      expect((document.querySelector(selectors.replaceButton) as HTMLButtonElement).disabled).toBe(
        true
      );
      expect(
        (document.querySelector(selectors.replaceAllButton) as HTMLButtonElement).disabled
      ).toBe(true);
    });
  });
  describe("basic search", () => {
    let dispatch;
    beforeEach(() => {
      dispatch = parent.observeDispatch();
    });

    test("simple search", async () => {
      /** Fake timers use to control debounceSearch in Find and Replace */
      jest.useFakeTimers();
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      jest.runAllTimers();
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("UPDATE_SEARCH", {
        searchOptions: { exactMatch: false, matchCase: false, searchFormulas: false },
        toSearch: "1",
      });
      jest.useRealTimers();
    });

    test("clicking on next", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      triggerMouseEvent(document.querySelector(selectors.nextButton), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("SELECT_SEARCH_NEXT_MATCH");
    });

    test("Going to next with Enter key", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      document
        .querySelector(selectors.inputSearch)!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("SELECT_SEARCH_NEXT_MATCH");
    });

    test("clicking on previous", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "1", "input");
      triggerMouseEvent(document.querySelector(selectors.previousButton), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("SELECT_SEARCH_PREVIOUS_MATCH");
    });

    test("won't search on empty string", async () => {
      dispatch = parent.observeDispatch();
      setInputValueAndTrigger(selectors.inputSearch, "", "input");
      await nextTick();
      expect(dispatch).not.toHaveBeenCalledWith();
    });
  });

  describe("search options", () => {
    test("Can search matching case", async () => {
      const dispatch = parent.observeDispatch();

      setInputValueAndTrigger(selectors.inputSearch, "Hell", "input");
      triggerMouseEvent(document.querySelector(selectors.checkBoxMatchingCase), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("UPDATE_SEARCH", {
        searchOptions: { exactMatch: false, matchCase: true, searchFormulas: false },
        toSearch: "Hell",
      });
    });

    test("Can search matching entire cell", async () => {
      const dispatch = parent.observeDispatch();

      setInputValueAndTrigger(selectors.inputSearch, "Hell", "input");
      triggerMouseEvent(document.querySelector(selectors.checkBoxExactMatch), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("UPDATE_SEARCH", {
        searchOptions: { exactMatch: true, matchCase: false, searchFormulas: false },
        toSearch: "Hell",
      });
    });

    test("can search in formulas", async () => {
      const dispatch = parent.observeDispatch();

      setInputValueAndTrigger(selectors.inputSearch, "Hell", "input");
      triggerMouseEvent(document.querySelector(selectors.checkBoxSearchFormulas), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("UPDATE_SEARCH", {
        searchOptions: { exactMatch: false, matchCase: false, searchFormulas: true },
        toSearch: "Hell",
      });
    });

    test("search in formulas shows formulas", async () => {
      triggerMouseEvent(document.querySelector(selectors.checkBoxSearchFormulas), "click");
      await nextTick();
      expect(model.getters.shouldShowFormulas()).toBe(true);
    });
  });
  describe("replace options", () => {
    test("Can replace a simple text value", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch), "hello", "input");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "kikou", "input");
      const dispatch = parent.observeDispatch();
      triggerMouseEvent(document.querySelector(selectors.replaceButton), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("REPLACE_SEARCH", {
        replaceOptions: { modifyFormulas: false },
        replaceWith: "kikou",
      });
    });

    test("Can replace a value in a formula", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch), "2", "input");
      triggerMouseEvent(document.querySelector(selectors.checkBoxSearchFormulas), "click");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "4", "input");
      const dispatch = parent.observeDispatch();
      triggerMouseEvent(document.querySelector(selectors.replaceButton), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("REPLACE_SEARCH", {
        replaceOptions: { modifyFormulas: true },
        replaceWith: "4",
      });
    });

    test("formulas will be overwritten if modify formula is checked", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch), "4", "input");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "2", "input");
      triggerMouseEvent(document.querySelector(selectors.checkBoxReplaceFormulas), "click");
      const dispatch = parent.observeDispatch();
      triggerMouseEvent(document.querySelector(selectors.replaceButton), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("REPLACE_SEARCH", {
        replaceOptions: { modifyFormulas: true },
        replaceWith: "2",
      });
    });

    test("formulas wont be modified if not looking in formulas or not modifying formulas", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch), "4", "input");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "2", "input");
      const dispatch = parent.observeDispatch();
      triggerMouseEvent(document.querySelector(selectors.replaceButton), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("REPLACE_SEARCH", {
        replaceOptions: { modifyFormulas: false },
        replaceWith: "2",
      });
    });

    test("can replace all", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch), "hell", "input");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "kikou", "input");
      const dispatch = parent.observeDispatch();
      triggerMouseEvent(document.querySelector(selectors.replaceAllButton), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("REPLACE_ALL_SEARCH", {
        replaceOptions: { modifyFormulas: false },
        replaceWith: "kikou",
      });
    });

    test("Can replace with Enter key", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "hell", "input");
      setInputValueAndTrigger(selectors.inputReplace, "kikou", "input");
      const dispatch = parent.observeDispatch();
      document
        .querySelector(selectors.inputReplace)!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("REPLACE_SEARCH", {
        replaceOptions: { modifyFormulas: false },
        replaceWith: "kikou",
      });
    });
  });
});
