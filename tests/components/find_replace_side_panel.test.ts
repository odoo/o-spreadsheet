import { App } from "@odoo/owl";
import { Model, Spreadsheet } from "../../src";
import { setCellContent } from "../test_helpers/commands_helpers";
import { setInputValueAndTrigger, triggerMouseEvent } from "../test_helpers/dom_helper";
import { makeTestFixture, mountSpreadsheet, nextTick, spyDispatch } from "../test_helpers/helpers";
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
  let parent: Spreadsheet;
  let app: App;
  beforeEach(async () => {
    fixture = makeTestFixture();
    ({ app, parent } = await mountSpreadsheet(fixture));
    model = parent.model;
    parent.env.openSidePanel("FindAndReplace");
    await nextTick();
  });

  afterEach(() => {
    fixture.remove();
    app.destroy();
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
      const dispatch = spyDispatch(parent);
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
      dispatch = spyDispatch(parent);
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

    test("search on empty string", async () => {
      jest.useFakeTimers();
      setInputValueAndTrigger(selectors.inputSearch, "", "input");
      jest.runAllTimers();
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("UPDATE_SEARCH", {
        searchOptions: { exactMatch: false, matchCase: false, searchFormulas: false },
        toSearch: "",
      });
      jest.useRealTimers();
    });
  });

  describe("search count match", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });
    test("search match count is displayed", async () => {
      setCellContent(model, "A1", "Hello");
      expect(fixture.querySelector(".o-input-count")).toBeNull();
      setInputValueAndTrigger(selectors.inputSearch, "Hel", "input");
      jest.runAllTimers();
      await nextTick();
      expect(fixture.querySelector(".o-input-count")?.innerHTML).toBe("1 / 1");
    });

    test("search match count is removed when input is cleared", async () => {
      setCellContent(model, "A1", "Hello");
      setInputValueAndTrigger(selectors.inputSearch, "Hel", "input");
      jest.runAllTimers();
      await nextTick();
      expect(fixture.querySelector(".o-input-count")?.innerHTML).toBe("1 / 1");
      setInputValueAndTrigger(selectors.inputSearch, "", "input");
      jest.runAllTimers();
      await nextTick();
      expect(fixture.querySelector(".o-input-count")).toBeNull();
    });
  });

  describe("search options", () => {
    test("Can search matching case", async () => {
      const dispatch = spyDispatch(parent);

      setInputValueAndTrigger(selectors.inputSearch, "Hell", "input");
      triggerMouseEvent(document.querySelector(selectors.checkBoxMatchingCase), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("UPDATE_SEARCH", {
        searchOptions: { exactMatch: false, matchCase: true, searchFormulas: false },
        toSearch: "Hell",
      });
    });

    test("Can search matching entire cell", async () => {
      const dispatch = spyDispatch(parent);

      setInputValueAndTrigger(selectors.inputSearch, "Hell", "input");
      triggerMouseEvent(document.querySelector(selectors.checkBoxExactMatch), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("UPDATE_SEARCH", {
        searchOptions: { exactMatch: true, matchCase: false, searchFormulas: false },
        toSearch: "Hell",
      });
    });

    test("can search in formulas", async () => {
      const dispatch = spyDispatch(parent);

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

    test("search in formulas should not show formula after closing the sidepanel", async () => {
      triggerMouseEvent(document.querySelector(selectors.checkBoxSearchFormulas), "click");
      await nextTick();
      triggerMouseEvent(document.querySelector(selectors.closeSidepanel), "click");
      await nextTick();
      expect(model.getters.shouldShowFormulas()).toBe(false);
    });
  });
  describe("replace options", () => {
    test("Can replace a simple text value", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch), "hello", "input");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "kikou", "input");
      const dispatch = spyDispatch(parent);
      triggerMouseEvent(document.querySelector(selectors.replaceButton), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("REPLACE_SEARCH", { replaceWith: "kikou" });
    });

    test("Can replace a value in a formula", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch), "2", "input");
      triggerMouseEvent(document.querySelector(selectors.checkBoxSearchFormulas), "click");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "4", "input");
      const dispatch = spyDispatch(parent);
      triggerMouseEvent(document.querySelector(selectors.replaceButton), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("REPLACE_SEARCH", { replaceWith: "4" });
    });

    test("formulas wont be modified if not looking in formulas or not modifying formulas", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch), "4", "input");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "2", "input");
      const dispatch = spyDispatch(parent);
      triggerMouseEvent(document.querySelector(selectors.replaceButton), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("REPLACE_SEARCH", { replaceWith: "2" });
    });

    test("can replace all", async () => {
      setInputValueAndTrigger(document.querySelector(selectors.inputSearch), "hell", "input");
      setInputValueAndTrigger(document.querySelector(selectors.inputReplace), "kikou", "input");
      const dispatch = spyDispatch(parent);
      triggerMouseEvent(document.querySelector(selectors.replaceAllButton), "click");
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("REPLACE_ALL_SEARCH", { replaceWith: "kikou" });
    });

    test("Can replace with Enter key", async () => {
      setInputValueAndTrigger(selectors.inputSearch, "hell", "input");
      setInputValueAndTrigger(selectors.inputReplace, "kikou", "input");
      const dispatch = spyDispatch(parent);
      document
        .querySelector(selectors.inputReplace)!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      await nextTick();
      expect(dispatch).toHaveBeenCalledWith("REPLACE_SEARCH", { replaceWith: "kikou" });
    });
  });
});
