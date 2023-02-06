import { Model } from "../../src";
import { UID } from "../../src/types";
import {
  createFilter,
  hideRows,
  setCellContent,
  setFormat,
  updateFilter,
} from "../test_helpers/commands_helpers";
import { keyDown, simulateClick } from "../test_helpers/dom_helper";
import { getCellsObject, mountSpreadsheet, nextTick, target } from "../test_helpers/helpers";

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
      createFilter(model, "A1:A5");
      setCellContent(model, "A1", "header");
      setCellContent(model, "A2", "1");
      setCellContent(model, "A3", "1");
      setCellContent(model, "A4", "2");

      createFilter(model, "B1:B4");
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
      setFormat(model, "m/d/yyyy", target("A4"));
      await openFilterMenu();
      const values = getFilterMenuValues();
      expect(values.map((val) => val.value)).toEqual(["(Blanks)", "1", "1/1/1900"]);
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

      listItems[0].dispatchEvent(new Event("mousemove", { bubbles: true }));
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
      setFormat(model, "m/d/yyyy", target("A4"));
      expect(model.getters.getFilterValues({ sheetId, col: 0, row: 0 })).toEqual([]);
      await openFilterMenu();
      await simulateClick(".o-filter-menu-value:nth-of-type(2)");
      await simulateClick(".o-filter-menu-value:nth-of-type(3)");
      await simulateClick(".o-filter-menu-button-primary");
      expect(model.getters.getFilterValues({ sheetId, col: 0, row: 0 })).toEqual(["1", "1/1/1900"]);
    });

    test("Cancel button don't save the changes", async () => {
      expect(model.getters.getFilterValues({ sheetId, col: 0, row: 0 })).toEqual([]);
      await openFilterMenu();
      await simulateClick(".o-filter-menu-value:nth-of-type(1)");
      await simulateClick(".o-filter-menu-value:nth-of-type(2)");
      await simulateClick(".o-filter-menu-button-cancel");
      expect(model.getters.getFilterValues({ sheetId, col: 0, row: 0 })).toEqual([]);
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

    test("Hitting esc key correctly closes the filter menu", async () => {
      await openFilterMenu();
      expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(1);
      await keyDown("Escape");
      expect(fixture.querySelectorAll(".o-filter-menu")).toHaveLength(0);
    });

    describe("Search bar", () => {
      test("Can filter values with the search bar", async () => {
        await openFilterMenu();
        const searchInput = fixture.querySelector(".o-filter-menu input") as HTMLInputElement;
        searchInput.value = "1";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        await nextTick();
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
        const searchInput = fixture.querySelector(".o-filter-menu input") as HTMLInputElement;
        searchInput.value = "lo";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        await nextTick();
        expect(getFilterMenuValues().map((v) => v.value)).toEqual(["Florida", "Illinois"]);
      });

      test("Can use up/down arrow keys to select items", async () => {
        await openFilterMenu();
        const searchInput = fixture.querySelector(".o-filter-menu input") as HTMLInputElement;

        searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
        await nextTick();
        const listItems = fixture.querySelectorAll(".o-filter-menu-value");
        expect(listItems[0].classList.contains("selected")).toBeTruthy();

        searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
        await nextTick();
        expect(listItems[1].classList.contains("selected")).toBeTruthy();

        searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
        await nextTick();
        expect(listItems[0].classList.contains("selected")).toBeTruthy();
      });

      test("Can press enter to select/unselect items", async () => {
        await openFilterMenu();
        const searchInput = fixture.querySelector(".o-filter-menu input") as HTMLInputElement;

        searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
        await nextTick();

        searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
        await nextTick();
        expect(getFilterMenuValues()[0].isChecked).toBeFalsy();

        searchInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
        await nextTick();
        expect(getFilterMenuValues()[0].isChecked).toBeTruthy();
      });
    });
  });

  test("Sort filter", async () => {
    createFilter(model, "A10:B15");
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
});
