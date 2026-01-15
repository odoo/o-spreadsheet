import { Model } from "../../src";
import {
  filterDateCriterionOperators,
  filterNumberCriterionOperators,
  filterTextCriterionOperators,
  UID,
} from "../../src/types";
import {
  createDynamicTable,
  createTableWithFilter,
  hideRows,
  setCellContent,
  setFormat,
  updateFilter,
  updateFilterCriterion,
} from "../test_helpers/commands_helpers";
import {
  clickGridIcon,
  editSelectComponent,
  focusAndKeyDown,
  keyDown,
  setInputValueAndTrigger,
  simulateClick,
} from "../test_helpers/dom_helper";
import { getCellsObject, mountSpreadsheet, nextTick, setGrid } from "../test_helpers/helpers";

describe("Filter menu component", () => {
  let fixture: HTMLElement;
  let model: Model;
  let sheetId: UID;

  async function openFilterMenu(xc = "A1") {
    await clickGridIcon(model, xc);
  }

  function getFilterMenuValues() {
    const values: { value: string; isChecked: boolean }[] = [];
    const filterValueEls = fixture.querySelectorAll(".o-filter-menu-value");
    for (const filterValue of filterValueEls) {
      const isChecked = !!filterValue.querySelector("input")?.checked;
      const value = filterValue.querySelector("label")!.textContent!;
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
      await openFilterMenu("A1");
      let values = getFilterMenuValues();
      expect(values.map((val) => val.value)).toEqual(["(Blanks)", "1", "2"]);

      await openFilterMenu("B1");
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

    test("All values are displayed and unchecked if a criterion is active", async () => {
      updateFilterCriterion(model, "A1", { type: "isEmpty", values: [] });
      await openFilterMenu();
      expect(getFilterMenuValues()).toEqual([
        { value: "(Blanks)", isChecked: false },
        { value: "1", isChecked: false },
        { value: "2", isChecked: false },
      ]);
    });

    test("Updating the list of value when a criterion filter is active replace the criterion filter with a value filter", async () => {
      updateFilterCriterion(model, "A1", { type: "isEmpty", values: [] });
      await openFilterMenu();
      await simulateClick(".o-filter-menu-value .o-checkbox");
      await simulateClick(".o-filter-menu-confirm");
      expect(model.getters.getFilterValue({ sheetId, col: 0, row: 0 })).toEqual({
        filterType: "values",
        hiddenValues: ["1", "2"],
      });
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
      await simulateClick(".o-filter-menu-value .o-checkbox");
      expect(getFilterMenuValues()[0]).toEqual({ value: "(Blanks)", isChecked: false });
      await simulateClick(".o-filter-menu-value .o-checkbox");
      expect(getFilterMenuValues()[0]).toEqual({ value: "(Blanks)", isChecked: true });
    });

    test("Confirm button updates the filter with formatted cell value", async () => {
      setFormat(model, "A4", "m/d/yyyy");
      expect(model.getters.getFilterHiddenValues({ sheetId, col: 0, row: 0 })).toEqual([]);
      await openFilterMenu();
      await simulateClick(".o-filter-menu-value:nth-of-type(2) .o-checkbox");
      await simulateClick(".o-filter-menu-value:nth-of-type(3) .o-checkbox");
      await simulateClick(".o-filter-menu-confirm");
      expect(model.getters.getFilterHiddenValues({ sheetId, col: 0, row: 0 })).toEqual([
        "1",
        "1/1/1900",
      ]);
    });

    test("Cancel button don't save the changes", async () => {
      expect(model.getters.getFilterHiddenValues({ sheetId, col: 0, row: 0 })).toEqual([]);
      await openFilterMenu();
      await simulateClick(".o-filter-menu-value:nth-of-type(1) .o-checkbox");
      await simulateClick(".o-filter-menu-value:nth-of-type(2) .o-checkbox");
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
      await simulateClick(".o-filter-menu-actions .o-button-link:nth-of-type(2)");
      expect(getFilterMenuValues()).toEqual([
        { value: "(Blanks)", isChecked: false },
        { value: "1", isChecked: false },
        { value: "2", isChecked: false },
      ]);
      await simulateClick(".o-filter-menu-actions .o-button-link:nth-of-type(1)");
      expect(getFilterMenuValues()).toEqual([
        { value: "(Blanks)", isChecked: true },
        { value: "1", isChecked: true },
        { value: "2", isChecked: true },
      ]);
    });

    test("Clear all work on the displayed values", async () => {
      await openFilterMenu();
      await setInputValueAndTrigger(".o-filter-menu input", "1");
      await simulateClick(".o-filter-menu-actions .o-button-link:nth-of-type(2)");
      await setInputValueAndTrigger(".o-filter-menu input", "");
      expect(getFilterMenuValues()).toEqual([
        { value: "(Blanks)", isChecked: true },
        { value: "1", isChecked: false },
        { value: "2", isChecked: true },
      ]);
    });

    test("Select all work on the displayed values", async () => {
      await openFilterMenu();
      await simulateClick(".o-filter-menu-actions .o-button-link:nth-of-type(2)");
      await setInputValueAndTrigger(".o-filter-menu input", "1");
      await simulateClick(".o-filter-menu-actions .o-button-link:nth-of-type(1)");
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

    test("All the values are unchecked if a criterion filter is active", async () => {
      updateFilterCriterion(model, "A1", { type: "isEmpty", values: [] });
      await openFilterMenu();
      expect(getFilterMenuValues()).toEqual([
        { value: "(Blanks)", isChecked: false },
        { value: "1", isChecked: false },
        { value: "2", isChecked: false },
      ]);
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
        await simulateClick(".o-filter-menu-value .o-checkbox");
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

    await openFilterMenu("A10");
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

    await openFilterMenu("A10");
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

  test("cannot sort filter table in readonly mode", async () => {
    createTableWithFilter(model, "A10:B15");
    await nextTick();
    await openFilterMenu("A10");
    expect(
      [...fixture.querySelectorAll(".o-filter-menu-item")].map((el) => el.textContent?.trim())
    ).toEqual(["Sort ascending (A ⟶ Z)", "Sort descending (Z ⟶ A)", "(Blanks)"]);
    model.updateMode("readonly");
    await nextTick();
    expect(
      [...fixture.querySelectorAll(".o-filter-menu-item")].map((el) => el.textContent?.trim())
    ).toEqual(["(Blanks)"]);
  });

  test("cannot sort dynamic table", async () => {
    setCellContent(model, "A10", "=MUNIT(2)");
    createDynamicTable(model, "A10", { hasFilters: true });
    await nextTick();
    await openFilterMenu("A10");
    expect(
      [...fixture.querySelectorAll(".o-filter-menu-item")].map((el) => el.textContent?.trim())
    ).not.toContain("Sort ascending (A ⟶ Z)");
  });

  test("Only the first 50 values are displayed by default", async () => {
    for (let i = 1; i < 61; i++) {
      setCellContent(model, `A${i}`, `${i}`);
    }
    createTableWithFilter(model, "A1:A61");
    await nextTick();
    await openFilterMenu();

    expect(fixture.querySelectorAll(".o-filter-menu-value")).toHaveLength(50);

    await simulateClick(".o-filter-load-more");
    expect(fixture.querySelectorAll(".o-filter-menu-value")).toHaveLength(60);
  });

  test("Search/Clear/Select all all works when some values are not displayed", async () => {
    for (let i = 1; i < 61; i++) {
      setCellContent(model, `A${i}`, `${i}`);
    }
    createTableWithFilter(model, "A1:A61");
    await nextTick();
    await openFilterMenu();
    expect(fixture.querySelectorAll(".o-filter-menu-value")).toHaveLength(50); // Only 50 values are displayed

    await simulateClick(".o-filter-menu-actions .o-button-link:nth-of-type(2)");
    expect(getFilterMenuValues().every((val) => !val.isChecked)).toBe(true);
    await simulateClick(".o-filter-menu-confirm");
    expect(model.getters.getFilterHiddenValues({ sheetId, col: 0, row: 0 })).toHaveLength(60);

    await openFilterMenu();
    expect(getFilterMenuValues().every((val) => !val.isChecked)).toBe(true);
    await simulateClick(".o-filter-menu-actions .o-button-link:nth-of-type(1)");
    expect(getFilterMenuValues().every((val) => val.isChecked)).toBe(true);
    await simulateClick(".o-filter-menu-confirm");
    expect(model.getters.getFilterHiddenValues({ sheetId, col: 0, row: 0 })).toHaveLength(0);

    await openFilterMenu();
    await setInputValueAndTrigger(".o-filter-menu input", "59");
    expect(getFilterMenuValues().map((val) => val.value)).toEqual(["59"]);
  });

  describe("Filter criterion tests", () => {
    beforeEach(async () => {
      createTableWithFilter(model, "A1:A5");
      await nextTick();
    });

    test("Can edit filter criterion", async () => {
      await openFilterMenu();

      await editSelectComponent(".o-filter-criterion-type", "containsText");
      expect(document.activeElement).toBe(fixture.querySelector(".o-dv-input input"));
      await setInputValueAndTrigger(".o-dv-input input", "hello");
      await simulateClick(".o-filter-menu-confirm");

      expect(model.getters.getFilterValue({ sheetId, col: 0, row: 0 })).toEqual({
        filterType: "criterion",
        type: "containsText",
        values: ["hello"],
      });
    });

    test("Criterion type depend on the values in the filtered ranges", async () => {
      const getAvailableCriterionTypes = async () => {
        return [...fixture.querySelectorAll<HTMLOptionElement>(".o-select-option")]
          .map((el) => el.dataset.id)
          .sort();
      };

      setGrid(model, { A2: "Hello", A3: "World" });
      await openFilterMenu();
      expect(".collapsor").toHaveText("Filter by criterion");
      await simulateClick(".o-filter-criterion-type");
      expect(await getAvailableCriterionTypes()).toEqual(
        ["none", ...filterTextCriterionOperators].sort()
      );
      await simulateClick(".o-filter-menu-confirm");

      setGrid(model, { A2: "1", A3: "2", A4: "string in the minority" });
      await openFilterMenu();
      await simulateClick(".o-filter-criterion-type");
      expect(await getAvailableCriterionTypes()).toEqual(
        ["none", ...filterNumberCriterionOperators].sort()
      );
      await simulateClick(".o-filter-menu-confirm");

      setFormat(model, "A1:A4", "m/d/yyyy");
      await openFilterMenu();
      await simulateClick(".o-filter-criterion-type");
      expect(await getAvailableCriterionTypes()).toEqual(
        ["none", ...filterDateCriterionOperators].sort()
      );
    });

    test("Only last edited filter type is kept", async () => {
      await openFilterMenu();

      // Edit criterion then the list of values
      await editSelectComponent(".o-filter-criterion-type", "isEmpty");
      await simulateClick(".o-filter-menu-value .o-checkbox");
      await simulateClick(".o-filter-menu-confirm");

      expect(model.getters.getFilterValue({ sheetId, col: 0, row: 0 })).toEqual({
        filterType: "values",
        hiddenValues: [""],
      });

      // Edit the list of values then the criterion
      await openFilterMenu();
      await simulateClick(".o-filter-menu-value .o-checkbox");
      await editSelectComponent(".o-filter-criterion-type", "isEmpty");
      await simulateClick(".o-filter-menu-confirm");

      expect(model.getters.getFilterValue({ sheetId, col: 0, row: 0 })).toEqual({
        filterType: "criterion",
        type: "isEmpty",
        values: [],
      });
    });
  });
});
