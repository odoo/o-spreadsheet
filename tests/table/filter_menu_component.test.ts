import { Model } from "../../src";
import { UID } from "../../src/types";
import {
  createDynamicTable,
  createTableWithFilter,
  hideRows,
  setCellContent,
  setFormat,
  updateFilter,
} from "../test_helpers/commands_helpers";
import {
  focusAndKeyDown,
  keyDown,
  setInputValueAndTrigger,
  simulateClick,
} from "../test_helpers/dom_helper";
import { getCellsObject, mountSpreadsheet, nextTick } from "../test_helpers/helpers";

async function openFilterMenu() {
  await simulateClick(".o-filter-icon");
}

describe("Filter menu component", () => {
  let fixture: HTMLElement;
  let model: Model;
  let sheetId: UID;

  function getFilterMenuValues() {
    const values: { value: string; isChecked: boolean }[] = [];
    const filterValueEls = fixture.querySelectorAll(".o-filter-menu-value");
    for (const filterValue of filterValueEls) {
      const isChecked = !!filterValue.querySelector(".o-filter-menu-value-checked span")
        ?.textContent;
      const value = filterValue.querySelector(".o-filter-menu-value-text")!.textContent!;
      values.push({ value, isChecked });
    }
    return values;
  }

  beforeEach(async () => {
    ({ model, fixture } = await mountSpreadsheet());
    sheetId = model.getters.getActiveSheetId();
  });

  describe("Filter Tests", () => {
    beforeEach(async () => {
      createTableWithFilter(model, "A1:A5");
      setCellContent(model, "A1", "header");
      setCellContent(model, "A2", "1");
      setCellContent(model, "A3", "1");
      setCellContent(model, "A4", "2");

      createTableWithFilter(model, "B1:B4");
      setCellContent(model, "B2", "B2");
      setCellContent(model, "B3", "B3");
      setCellContent(model, "B4", "B4");
      await nextTick();
    });

    test("Filter menu is correctly rendered", async () => {
      await openFilterMenu();
      expect(fixture.querySelector(".o-filter-menu")).toMatchSnapshot();
    });

    test("Duplicates values are not displayed twice", async () => {
      await openFilterMenu();
      const values = getFilterMenuValues();
      expect(values.map((val) => val.value)).toEqual(["(Blanks)", "1", "2"]);
    });

    test("Opening the filter menu of another filter update the values", async () => {
      const filterIcons = fixture.querySelectorAll(".o-filter-icon");
      await simulateClick(filterIcons[0]);
      let values = getFilterMenuValues();
      expect(values.map((val) => val.value)).toEqual(["(Blanks)", "1", "2"]);

      await simulateClick(filterIcons[1]);
      values = getFilterMenuValues();
      expect(values.map((val) => val.value)).toEqual(["B2", "B3", "B4"]);
    });

    test("Uppercase/Lowercase are not displayed twice. Only the first occurrence is displayed", async () => {
      setCellContent(model, "A2", "PercevaL");
      setCellContent(model, "A3", "perceval");
      setCellContent(model, "A4", "gauviN");
      setCellContent(model, "A5", "Gauvin");

      await openFilterMenu();
      const values = getFilterMenuValues();
      expect(values.map((val) => val.value)).toEqual(["gauviN", "PercevaL"]);
    });

    test("Displayed values are sorted using natural sorting", async () => {
      // Sort order should be 2,10,a,B and not 10,2,B,a (the default string comparison)
      setCellContent(model, "A2", "10");
      setCellContent(model, "A3", "2");
      setCellContent(model, "A4", "B");
      setCellContent(model, "A5", "a");

      await openFilterMenu();
      const values = getFilterMenuValues();
      expect(values.map((val) => val.value)).toEqual(["2", "10", "a", "B"]);
    });

    test("We display the formated value of the cells", async () => {
      setFormat(model, "A4", "m/d/yyyy");
      await openFilterMenu();
      const values = getFilterMenuValues();
      expect(values.map((val) => val.value)).toEqual(["(Blanks)", "1", "1/1/1900"]);
    });

    test("Repeated character in format is not shown", async () => {
      setFormat(model, "A4", "$* 0");
      await openFilterMenu();
      const values = getFilterMenuValues();
      expect(values.map((val) => val.value)).toEqual(["(Blanks)", "$2", "1"]);
    });

    test("Values are checked depending on the filter state", async () => {
      updateFilter(model, "A1", ["1"]);
      await openFilterMenu();
      const values = getFilterMenuValues();
      expect(values).toEqual([
        { value: "(Blanks)", isChecked: true },
        { value: "1", isChecked: false },
        { value: "2", isChecked: true },
      ]);
    });

    test("Hidden values are not displayed", async () => {
      hideRows(model, [3]);
      await openFilterMenu();
      const values = getFilterMenuValues();
      expect(values.map((val) => val.value)).toEqual(["(Blanks)", "1"]);
    });

    test("Values hidden by another filter are not displayed", async () => {
      updateFilter(model, "B1", ["B2", "B3"]);
      await openFilterMenu();
      const values = getFilterMenuValues();
      expect(values.map((val) => val.value)).toEqual(["(Blanks)", "2"]);
    });

    test("Can hover mouse to select items", async () => {
      await openFilterMenu();
      const listItems = fixture.querySelectorAll(".o-filter-menu-value");
      expect(listItems[0].classList.contains("selected")).toBeFalsy();

      listItems[0].dispatchEvent(new Event("pointermove", { bubbles: true }));
      await nextTick();
      expect(listItems[0].classList.contains("selected")).toBeTruthy();
    });

    test("Clicking on values check and uncheck them", async () => {
      await openFilterMenu();
      expect(getFilterMenuValues()[0]).toEqual({ value: "(Blanks)", isChecked: true });
      await simulateClick(".o-filter-menu-value");
      expect(getFilterMenuValues()[0]).toEqual({ value: "(Blanks)", isChecked: false });
      await simulateClick(".o-filter-menu-value");
      expect(getFilterMenuValues()[0]).toEqual({ value: "(Blanks)", isChecked: true });
    });

    test("Confirm button updates the filter with formatted cell value", async () => {
      setFormat(model, "A4", "m/d/yyyy");
      expect(model.getters.getFilterHiddenValues({ sheetId, col: 0, row: 0 })).toEqual([]);
      await openFilterMenu();
      await simulateClick(".o-filter-menu-value:nth-of-type(2)");
      await simulateClick(".o-filter-menu-value:nth-of-type(3)");
      await simulateClick(".o-filter-menu-confirm");
      expect(model.getters.getFilterHiddenValues({ sheetId, col: 0, row: 0 })).toEqual([
        "1",
        "1/1/1900",
      ]);
    });

    test("Cancel button don't save the changes", async () => {
      expect(model.getters.getFilterHiddenValues({ sheetId, col: 0, row: 0 })).toEqual([]);
      await openFilterMenu();
      await simulateClick(".o-filter-menu-value:nth-of-type(1)");
      await simulateClick(".o-filter-menu-value:nth-of-type(2)");
      await simulateClick(".o-filter-menu-cancel");
      expect(model.getters.getFilterHiddenValues({ sheetId, col: 0, row: 0 })).toEqual([]);
    });

    test("Can clear and select all", async () => {
      await openFilterMenu();
      expect(getFilterMenuValues()).toEqual([
        { value: "(Blanks)", isChecked: true },
        { value: "1", isChecked: true },
        { value: "2", isChecked: true },
      ]);
      await simulateClick(".o-filter-menu-action-text:nth-of-type(2)");
      expect(getFilterMenuValues()).toEqual([
        { value: "(Blanks)", isChecked: false },
        { value: "1", isChecked: false },
        { value: "2", isChecked: false },
      ]);
      await simulateClick(".o-filter-menu-action-text:nth-of-type(1)");
      expect(getFilterMenuValues()).toEqual([
        { value: "(Blanks)", isChecked: true },
        { value: "1", isChecked: true },
        { value: "2", isChecked: true },
      ]);
    });

    test("Clear all work on the displayed values", async () => {
      await openFilterMenu();
      await setInputValueAndTrigger(".o-filter-menu input", "1");
      await simulateClick(".o-filter-menu-action-text:nth-of-type(2)");
      await setInputValueAndTrigger(".o-filter-menu input", "");
      expect(getFilterMenuValues()).toEqual([
        { value: "(Blanks)", isChecked: true },
        { value: "1", isChecked: false },
        { value: "2", isChecked: true },
      ]);
    });

    test("Select all work on the displayed values", async () => {
      await openFilterMenu();
      await simulateClick(".o-filter-menu-action-text:nth-of-type(2)");
      await setInputValueAndTrigger(".o-filter-menu input", "1");
      await simulateClick(".o-filter-menu-action-text:nth-of-type(1)");
      await setInputValueAndTrigger(".o-filter-menu input", "");
      expect(getFilterMenuValues()).toEqual([
        { value: "(Blanks)", isChecked: false },
        { value: "1", isChecked: true },
        { value: "2", isChecked: false },
      ]);
    });

    test("Hitting esc key correctly closes the filter menu", async () => {
      await openFilterMenu();
      expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(1);
      await keyDown({ key: "Escape" });
      expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(0);
    });

    describe("Search bar", () => {
      test("Can filter values with the search bar", async () => {
        await openFilterMenu();
        await setInputValueAndTrigger(".o-filter-menu input", "1");
        expect(getFilterMenuValues().map((v) => v.value)).toEqual(["1"]);
      });

      test("Clicking on values focus the search input", async () => {
        await openFilterMenu();
        const searchInput = fixture.querySelector(".o-filter-menu input");
        expect(document.activeElement).not.toBe(searchInput);
        await simulateClick(".o-filter-menu-value");
        expect(document.activeElement).toBe(searchInput);
      });

      test("Search bar uses fuzzy search", async () => {
        setCellContent(model, "A2", "Florida");
        setCellContent(model, "A3", "Alaska");
        setCellContent(model, "A4", "Texas");
        setCellContent(model, "A5", "Illinois");

        await openFilterMenu();
        await setInputValueAndTrigger(".o-filter-menu input", "lo");
        expect(getFilterMenuValues().map((v) => v.value)).toEqual(["Florida", "Illinois"]);
      });

      test("Can use up/down arrow keys to select items", async () => {
        await openFilterMenu();

        await focusAndKeyDown(".o-filter-menu input", { key: "ArrowDown" });
        const listItems = fixture.querySelectorAll(".o-filter-menu-value");
        expect(listItems[0].classList.contains("selected")).toBeTruthy();

        await keyDown({ key: "ArrowDown" });
        expect(listItems[1].classList.contains("selected")).toBeTruthy();

        await keyDown({ key: "ArrowUp" });
        expect(listItems[0].classList.contains("selected")).toBeTruthy();
      });

      test("Can press enter to select/unselect items", async () => {
        await openFilterMenu();

        await focusAndKeyDown(".o-filter-menu input", { key: "ArrowDown" });
        await keyDown({ key: "Enter" });
        expect(getFilterMenuValues()[0].isChecked).toBeFalsy();

        await keyDown({ key: "Enter" });
        expect(getFilterMenuValues()[0].isChecked).toBeTruthy();
      });
    });
  });

  test("Sort filter", async () => {
    createTableWithFilter(model, "A10:B15");
    setCellContent(model, "A10", "header");
    setCellContent(model, "A11", "olà");
    setCellContent(model, "A12", "1");
    setCellContent(model, "A13", "-1");
    setCellContent(model, "A14", "2");

    setCellContent(model, "B10", "header");
    setCellContent(model, "B11", "");
    setCellContent(model, "B12", "ab");
    setCellContent(model, "B13", "ba");
    setCellContent(model, "B14", "ca");
    await nextTick();

    await openFilterMenu();
    await simulateClick(".o-filter-menu-item:nth-of-type(1)");
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A10: { content: "header" },
      A11: { content: "-1" },
      // A12 : empty cell, we give it a value of 0
      A13: { content: "1" },
      A14: { content: "2" },
      A15: { content: "olà" },
      B10: { content: "header" },
      B11: { content: "ba" },
      B13: { content: "ab" },
      B14: { content: "ca" },
    });

    await openFilterMenu();
    await simulateClick(".o-filter-menu-item:nth-of-type(2)");
    expect(getCellsObject(model, sheetId)).toMatchObject({
      A10: { content: "header" },
      A11: { content: "olà" },
      A12: { content: "2" },
      A13: { content: "1" },
      A15: { content: "-1" },
      B10: { content: "header" },
      B12: { content: "ca" },
      B13: { content: "ab" },
      B15: { content: "ba" },
    });
  });

  test.each(["readonly", "dashboard"] as const)(
    "can sort filter table in %s mode",
    async (mode) => {
      createTableWithFilter(model, "A10:A13");
      setCellContent(model, "A10", "letters");
      setCellContent(model, "A11", "A");
      setCellContent(model, "A12", "B");
      setCellContent(model, "A13", "C");
      model.updateMode(mode);
      await nextTick();
      await openFilterMenu();
      await simulateClick(".o-filter-menu-item:nth-of-type(2)");
      await nextTick();
      expect(getCellsObject(model, sheetId)).toMatchObject({
        A10: { content: "letters" },
        A11: { content: "C" },
        A12: { content: "B" },
        A13: { content: "A" },
      });
    }
  );

  test("cannot sort dynamic table", async () => {
    setCellContent(model, "A10", "=MUNIT(2)");
    createDynamicTable(model, "A10", { hasFilters: true });
    await nextTick();
    await openFilterMenu();
    expect(
      [...fixture.querySelectorAll(".o-filter-menu-item")].map((el) => el.textContent?.trim())
    ).not.toContain("Sort ascending (A ⟶ Z)");
  });
});
