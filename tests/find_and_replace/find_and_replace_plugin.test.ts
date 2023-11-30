import { Model } from "../../src";
import { functionRegistry } from "../../src/functions";
import { toZone } from "../../src/helpers";
import { UID } from "../../src/types";
import { SearchOptions } from "../../src/types/find_and_replace";
import { DEFAULT_LOCALE } from "../../src/types/locale";
import {
  activateSheet,
  addRows,
  createFilter,
  createSheet,
  deleteFilter,
  deleteRows,
  hideRows,
  redo,
  setCellContent,
  setSelection,
  setViewportOffset,
  undo,
  unhideRows,
  updateFilter,
  updateLocale,
} from "../test_helpers/commands_helpers";
import {
  getActivePosition,
  getCell,
  getCellContent,
  getCellText,
} from "../test_helpers/getters_helpers";
import { toRangeData } from "../test_helpers/helpers";

let model: Model;

function getSearchOptions() {
  return model.getters.getSearchOptions();
}

function p(xc: string) {
  const z = toZone(xc);
  return { col: z.left, row: z.top };
}

function match(sheetId: UID, xc: string) {
  return { sheetId, ...p(xc) };
}

function getMatches(model: Model) {
  return model.getters.getSearchMatches();
}

function getMatchIndex(model: Model) {
  return model.getters.getCurrentSelectedMatchIndex();
}

function updateSearch(model: Model, toSearch: string, options: Partial<SearchOptions> = {}) {
  const searchOptions = { ...getSearchOptions(), ...options };
  return model.dispatch("UPDATE_SEARCH", { toSearch, searchOptions });
}

describe("basic search", () => {
  const sheetId1 = "s1";
  const sheetId2 = "s2";
  beforeEach(() => {
    model = new Model({ sheets: [{ id: sheetId1 }] });
  });

  test("simple search for search scope activeSheet", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "test");
    createSheet(model, { sheetId: "sh2", activate: true });
    setCellContent(model, "A1", "test");
    setCellContent(model, "A2", "test");
    updateSearch(model, "test", { searchScope: "activeSheet" });
    expect(getMatches(model)).toEqual([match("sh2", "A1"), match("sh2", "A2")]);
    expect(getMatchIndex(model)).toStrictEqual(0);
    activateSheet(model, sheetId1);
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A2")]);
    expect(getMatchIndex(model)).toStrictEqual(0);
  });

  test("simple search for search scope allSheet", () => {
    setCellContent(model, "A2", "test");
    createSheet(model, { sheetId: "sh2" });
    setCellContent(model, "A2", "test", "sh2");
    updateSearch(model, "test");
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toEqual([match(sheetId1, "A2"), match("sh2", "A2")]);
  });

  test("simple search for search scope specificRange", () => {
    setCellContent(model, "A1", "test");
    setCellContent(model, "A2", "test");
    updateSearch(model, "test", {
      searchScope: "specificRange",
      specificRange: toRangeData(sheetId1, "A1:B1"),
    });
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A1")]);
  });

  test("search with a regexp characters", () => {
    setCellContent(model, "A1", "hello (world).*");
    updateSearch(model, "hello (world).*");
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A1")]);
  });

  test("Update search automatically select the first match", () => {
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1")]);
    setCellContent(model, "A2", "1");
    updateSearch(model, "1");
    expect(model.getters.getSelectedZones()).toEqual([toZone("A2")]);
  });

  test("change the search for activeSheet searchScope", () => {
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "Hello1");
    setCellContent(model, "A3", "=111");
    updateSearch(model, "hello", { searchScope: "activeSheet" });
    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    expect(getMatchIndex(model)).toStrictEqual(1);
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A1"), match(sheetId1, "A2")]);
    updateSearch(model, "1", { searchScope: "activeSheet" });
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A2"), match(sheetId1, "A3")]);
  });

  test("change the search for allSheet searchScope", () => {
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "hello1");
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A1", "=111", sheetId2);

    updateSearch(model, "hello");
    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    expect(getMatchIndex(model)).toStrictEqual(1);
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A1"), match(sheetId1, "A2")]);
    updateSearch(model, "1");
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A2"), match(sheetId2, "A1")]);
  });

  test("change the search for specificRange searchScope", () => {
    setCellContent(model, "A1", "hello");
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A2", "=111", sheetId2);
    updateSearch(model, "hello", {
      searchScope: "specificRange",
      specificRange: toRangeData(sheetId2, "A1:A3"),
    });
    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    expect(getMatches(model)).toHaveLength(0);
    expect(model.getters.getActiveSheetId()).toBe(sheetId1);
    updateSearch(model, "1");
    expect(model.getters.getActiveSheetId()).toBe(sheetId2);
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match(sheetId2, "A2")]);
  });

  test("refresh search when cell is updated", async () => {
    setCellContent(model, "A1", "hello");
    updateSearch(model, "hello");
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A1")]);
    setCellContent(model, "B1", "hello");
    setCellContent(model, "B2", '="hello"');
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "B1"),
      match(sheetId1, "B2"),
    ]);
  });

  test("refresh search when cell is update with EVALUATE_CELLS", async () => {
    let value = "3";
    functionRegistry.add("GETVALUE", {
      description: "Get value",
      compute: () => value,
      args: [],
      returns: ["NUMBER"],
    });
    setCellContent(model, "A1", "hello");
    setCellContent(model, "B1", "=GETVALUE()");
    updateSearch(model, "hello");
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A1")]);
    value = "hello";
    model.dispatch("EVALUATE_CELLS", { sheetId: model.getters.getActiveSheetId() });
    expect(getCellContent(model, "B1")).toBe(value);
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A1"), match(sheetId1, "B1")]);
  });

  test("search on empty string does not match anything", () => {
    setCellContent(model, "A1", "hello");
    updateSearch(model, "");
    expect(model.getters.getSearchMatches()).toHaveLength(0);
  });

  test("search on empty string clears matches", () => {
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "hello");
    updateSearch(model, "hello");
    expect(model.getters.getSearchMatches()).toHaveLength(2);
    updateSearch(model, "");
    expect(model.getters.getSearchMatches()).toHaveLength(0);
  });

  test("Can clear the search completely", () => {
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "hello");
    updateSearch(model, "hello");
    expect(model.getters.getSearchMatches()).toHaveLength(2);
    model.dispatch("CLEAR_SEARCH");
    expect(model.getters.getSearchMatches()).toHaveLength(0);
  });

  test("search begins from current sheet with index starting at the first sheet in allSheets search scope", () => {
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "hello1");
    setCellContent(model, "A3", "1");
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A2", "=111", sheetId2);
    activateSheet(model, sheetId2);
    updateSearch(model, "1");
    expect(getActivePosition(model)).toBe("A2");
    expect(getMatchIndex(model)).toStrictEqual(2);
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
      match(sheetId2, "A2"),
    ]);
  });

  test("Changing sheet updated the activeSheet search", () => {
    setCellContent(model, "A3", "1");
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A2", "=111", sheetId2);
    updateSearch(model, "1", { searchScope: "activeSheet" });
    expect(getActivePosition(model)).toBe("A3");
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A3")]);
    activateSheet(model, "s2");
    expect(getActivePosition(model)).toBe("A2");
    expect(getMatches(model)).toStrictEqual([match(sheetId2, "A2")]);
  });

  test("Update search if column or row is added", () => {
    setCellContent(model, "A3", "1");
    setCellContent(model, "A4", "1");
    updateSearch(model, "1");
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A3"), match(sheetId1, "A4")]);
    addRows(model, "after", 1, 1);
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A4"), match(sheetId1, "A5")]);
  });

  test("Search is updated if column or row is removed", () => {
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "111");
    updateSearch(model, "1");
    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    expect(getMatchIndex(model)).toStrictEqual(1);
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A2"), match(sheetId1, "A3")]);
    deleteRows(model, [1]);
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match(sheetId1, "A2")]);
  });

  test("Update search upon undo/redo operations, which can update the cell", () => {
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "1");
    updateSearch(model, "1");
    expect(getMatches(model)).toHaveLength(2);
    expect(getMatchIndex(model)).toStrictEqual(0);
    deleteRows(model, [1]);
    expect(getMatches(model)).toHaveLength(1);
    expect(getMatchIndex(model)).toStrictEqual(0);
    undo(model);
    expect(getMatches(model)).toHaveLength(2);
    expect(getMatchIndex(model)).toStrictEqual(0);
    redo(model);
    expect(getMatches(model)).toHaveLength(1);
    expect(getMatchIndex(model)).toStrictEqual(0);
  });

  test("hidden cells should not be included in match", () => {
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "1");
    updateSearch(model, "1");
    expect(getMatches(model)).toHaveLength(2);
    expect(getMatchIndex(model)).toStrictEqual(0);
    hideRows(model, [1]);
    expect(getMatches(model)).toHaveLength(1);
    expect(getMatchIndex(model)).toStrictEqual(0);
    unhideRows(model, [1]);
    expect(getMatches(model)).toHaveLength(2);
    expect(getMatchIndex(model)).toStrictEqual(0);
  });

  test("Need to update search if updating or removing the filter", () => {
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "=111");
    createFilter(model, "A1:A6");
    updateSearch(model, "1");
    expect(getMatches(model)).toHaveLength(2);
    expect(getMatchIndex(model)).toStrictEqual(0);
    updateFilter(model, "A1", ["1"]);
    expect(getMatches(model)).toHaveLength(1);
    expect(getMatchIndex(model)).toStrictEqual(0);
    deleteFilter(model, "A1:A6");
    expect(getMatches(model)).toHaveLength(2);
    expect(getMatchIndex(model)).toStrictEqual(0);
  });

  test("Switching sheet properly recomputes search results and shows them in the viewport", () => {
    setCellContent(model, "A2", "Hello");
    setCellContent(model, "A3", "Hello");
    createSheet(model, { sheetId: "s2" });
    setCellContent(model, "Z100", "hello", "s2");
    updateSearch(model, "hello", { searchScope: "allSheets" });
    expect(model.getters.getActiveSheetMatchesCount()).toBe(2);
    expect(model.getters.getAllSheetMatchesCount()).toBe(3);
    expect(model.getters.getSpecificRangeMatchesCount()).toBe(0);
    expect(model.getters.getActiveMainViewport()).toMatchObject(toZone("A1:K44"));
    activateSheet(model, "s2");
    expect(model.getters.getActiveSheetMatchesCount()).toBe(1);
    expect(model.getters.getAllSheetMatchesCount()).toBe(3);
    expect(model.getters.getSpecificRangeMatchesCount()).toBe(0);
    expect(model.getters.getActiveMainViewport()).toMatchObject(toZone("Q58:Z100"));
  });
});

test("simple search with array formula", () => {
  model = new Model({ sheets: [{ id: "sh1" }] });
  setCellContent(model, "A1", "hell0");
  setCellContent(model, "A2", "hello");
  setCellContent(model, "A3", "=1");
  setCellContent(model, "B1", "=TRANSPOSE(A1:A3)");
  updateSearch(model, "hello");
  expect(getMatchIndex(model)).toStrictEqual(0);
  expect(getMatches(model)).toStrictEqual([match("sh1", "C1"), match("sh1", "A2")]);
});

test("replace don't replace value resulting from array formula", () => {
  model = new Model();
  setCellContent(model, "A1", "hell0");
  setCellContent(model, "A2", "hello");
  setCellContent(model, "A3", "=1");
  setCellContent(model, "B1", "=TRANSPOSE(A1:A3)");
  updateSearch(model, "hello");
  model.dispatch("REPLACE_ALL_SEARCH", { replaceWith: "kikou" });
  expect(getMatches(model)).toHaveLength(0);
  expect(getMatchIndex(model)).toStrictEqual(null);
  // Check that the original value has correctly been replaced
  expect(getCellContent(model, "A2")).toBe("kikou");
  // Check that the array formula has not been modified : If nothing has
  // been written in C1, B1 should still be an array formula (not errored)
  expect(getCellContent(model, "B1")).not.toBe("#ERROR");
  expect(getCell(model, "C1")?.content).toBe(undefined);
  // Check that the spread value has been updated according to the modified value of A2
  expect(getCellContent(model, "C1")).toBe("kikou");
});

test("Only change sheet on search related command", () => {
  model = new Model();
  setCellContent(model, "A1", "hello");
  updateSearch(model, "hello");
  createSheet(model, { sheetId: "sh2", activate: true });
  expect(getMatches(model)).toHaveLength(1);
  expect(getMatchIndex(model)).toStrictEqual(0);
  setCellContent(model, "A1", "test");
  expect(model.getters.getActiveSheetId()).toBe("sh2");
});

describe("next/previous cycle", () => {
  const sheetId1 = "s1";
  beforeEach(() => {
    model = new Model({ sheets: [{ id: sheetId1 }] });
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "1");
  });
  test("Next will select the next match", () => {
    updateSearch(model, "1");
    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);
  });
  test("Next than previous will cancel each other", () => {
    updateSearch(model, "1");
    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    model.dispatch("SELECT_SEARCH_PREVIOUS_MATCH");
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);
  });

  test("search will cycle with next", () => {
    updateSearch(model, "1");
    expect(getActivePosition(model)).toBe("A1");
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);
    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    expect(getActivePosition(model)).toBe("A2");
    expect(getMatchIndex(model)).toStrictEqual(1);
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    expect(getActivePosition(model)).toBe("A3");
    expect(getMatchIndex(model)).toStrictEqual(2);
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    expect(getActivePosition(model)).toBe("A1");
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    expect(getActivePosition(model)).toBe("A2");
    expect(getMatchIndex(model)).toStrictEqual(1);
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);
  });
  test("search will cycle with previous", () => {
    updateSearch(model, "1");
    expect(getActivePosition(model)).toBe("A1");
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    model.dispatch("SELECT_SEARCH_PREVIOUS_MATCH");
    expect(getActivePosition(model)).toBe("A3");
    expect(getMatchIndex(model)).toStrictEqual(2);
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    model.dispatch("SELECT_SEARCH_PREVIOUS_MATCH");
    expect(getActivePosition(model)).toBe("A2");
    expect(getMatchIndex(model)).toStrictEqual(1);
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    model.dispatch("SELECT_SEARCH_PREVIOUS_MATCH");
    expect(getActivePosition(model)).toBe("A1");
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    model.dispatch("SELECT_SEARCH_PREVIOUS_MATCH");
    expect(getActivePosition(model)).toBe("A3");
    expect(getMatchIndex(model)).toStrictEqual(2);
    expect(getMatches(model)).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);
  });
});

describe("next/previous with single match", () => {
  beforeEach(() => {
    model = new Model();
    setCellContent(model, "A1", "1");
    updateSearch(model, "1", { searchScope: "activeSheet" });
  });

  test.each(["SELECT_SEARCH_NEXT_MATCH", "SELECT_SEARCH_PREVIOUS_MATCH"] as const)(
    "%s after changing selection will re-select the match",
    (cmd) => {
      setSelection(model, ["B3"]);
      expect(model.getters.getSelectedZones()).toEqual([toZone("B3")]);
      model.dispatch(cmd);
      expect(model.getters.getSelectedZones()).toEqual([toZone("A1")]);
    }
  );

  test("UPDATE_SEARCH after changing selection will re-select the match", () => {
    setSelection(model, ["B3"]);
    expect(model.getters.getSelectedZones()).toEqual([toZone("B3")]);
    updateSearch(model, "1");
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1")]);
  });

  test.each(["SELECT_SEARCH_NEXT_MATCH", "SELECT_SEARCH_PREVIOUS_MATCH"] as const)(
    "%s after scrolling will re-scroll to the match",
    (cmd) => {
      const viewportAfterSearch = model.getters.getActiveMainViewport();
      setViewportOffset(model, 1000, 1000);
      expect(model.getters.getActiveMainViewport()).not.toMatchObject(viewportAfterSearch);
      model.dispatch(cmd);
      expect(model.getters.getActiveMainViewport()).toMatchObject(viewportAfterSearch);
    }
  );

  test("UPDATE_SEARCH after scrolling will re-scroll to the match", () => {
    const viewportAfterSearch = model.getters.getActiveMainViewport();
    setViewportOffset(model, 1000, 1000);
    expect(model.getters.getActiveMainViewport()).not.toMatchObject(viewportAfterSearch);
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions: getSearchOptions() });
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewportAfterSearch);
  });
});

describe("search options", () => {
  beforeEach(() => {
    model = new Model();
    setCellContent(model, "A1", "hello=sum");
    setCellContent(model, "A2", "Hello");
    setCellContent(model, "A3", "=SUM(1,3)");
    setCellContent(model, "A4", "hell");
    setCellContent(model, "A5", "Hell");
  });

  test("Can search matching case", () => {
    updateSearch(model, "Hell", { matchCase: true });
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match("Sheet1", "A2"), match("Sheet1", "A5")]);
  });

  test("Can search matching entire cell", () => {
    updateSearch(model, "Hell", { exactMatch: true });
    expect(getMatches(model)).toStrictEqual([match("Sheet1", "A4"), match("Sheet1", "A5")]);
  });

  test("Can search in formulas", () => {
    updateSearch(model, "Hell", { searchFormulas: true });
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([
      match("Sheet1", "A1"),
      match("Sheet1", "A2"),
      match("Sheet1", "A4"),
      match("Sheet1", "A5"),
    ]);
  });

  test("Can search in formulas(2)", () => {
    updateSearch(model, "4", { searchFormulas: false });
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match("Sheet1", "A3")]);
    updateSearch(model, "4", { searchFormulas: true });
    expect(getMatches(model)).toStrictEqual([]);
    expect(getMatchIndex(model)).toBe(null);
  });

  test("Combine matching case / matching entire cell / search in formulas", () => {
    updateSearch(model, "hell");
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([
      match("Sheet1", "A1"),
      match("Sheet1", "A2"),
      match("Sheet1", "A4"),
      match("Sheet1", "A5"),
    ]);
    //match case
    updateSearch(model, "hell", { matchCase: true });
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match("Sheet1", "A1"), match("Sheet1", "A4")]);

    //match case + exact match
    updateSearch(model, "hell", { matchCase: true, exactMatch: true });
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match("Sheet1", "A4")]);

    //change input and remove match case + exact match and add look in formula
    updateSearch(model, "hell", { matchCase: false, exactMatch: false, searchFormulas: true });
    model.dispatch("UPDATE_SEARCH", { toSearch: "SUM", searchOptions: getSearchOptions() });
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match("Sheet1", "A1"), match("Sheet1", "A3")]);

    //add match case
    updateSearch(model, "hell", { matchCase: true, searchFormulas: true });
    model.dispatch("UPDATE_SEARCH", { toSearch: "SUM", searchOptions: getSearchOptions() });
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getMatches(model)).toStrictEqual([match("Sheet1", "A3")]);
  });
});

describe("Replace", () => {
  test("Can replace a simple text value", () => {
    model = new Model();
    setCellContent(model, "A1", "hello");
    updateSearch(model, "hello");
    model.dispatch("REPLACE_SEARCH", { replaceWith: "kikou" });
    expect(getMatches(model)).toHaveLength(0);
    expect(getMatchIndex(model)).toStrictEqual(null);
    expect(getCellText(model, "A1")).toBe("kikou");
  });

  test("Can replace a value in a formula", () => {
    model = new Model();
    setCellContent(model, "A1", "=SUM(2,2)");
    updateSearch(model, "2", { searchFormulas: true, searchScope: "activeSheet" });
    model.dispatch("REPLACE_SEARCH", { replaceWith: "4" });
    expect(model.getters.getSearchMatches()).toHaveLength(0);
    expect(model.getters.getCurrentSelectedMatchIndex()).toStrictEqual(null);
    expect(getCellText(model, "A1")).toBe("=SUM(4,4)");
  });

  test("Replaced value is changed to canonical form in model", () => {
    model = new Model();
    setCellContent(model, "A1", "=SUM(2,2)");
    updateLocale(model, {
      ...DEFAULT_LOCALE,
      decimalSeparator: ",",
      formulaArgSeparator: ";",
      thousandsSeparator: " ",
    });
    updateSearch(model, "2", { searchFormulas: true, searchScope: "activeSheet" });
    model.dispatch("REPLACE_SEARCH", { replaceWith: "2,5" });
    expect(getMatches(model)).toHaveLength(1);
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getCell(model, "A1")?.content).toBe("=SUM(2.5,2.5)");
  });

  test("formulas wont be modified if not looking in formulas or not modifying formulas", () => {
    model = new Model();
    setCellContent(model, "A1", "=SUM(2,2)");
    updateSearch(model, "4");
    expect(getMatches(model)).toHaveLength(1);
    model.dispatch("REPLACE_SEARCH", { replaceWith: "2" });
    expect(getMatches(model)).toHaveLength(1);
    expect(getMatchIndex(model)).toStrictEqual(0);
    expect(getCellText(model, "A1")).toBe("=SUM(2,2)");
  });

  test("Replace all in activeSheet", () => {
    model = new Model();
    const sheetId2 = "test";
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A1", "hello", sheetId2);
    updateSearch(model, "hell", { searchScope: "activeSheet" });
    model.dispatch("REPLACE_ALL_SEARCH", { replaceWith: "kikou" });
    expect(getMatches(model)).toHaveLength(0);
    expect(getMatchIndex(model)).toStrictEqual(null);
    expect(getCellText(model, "A1")).toBe("kikouo");
    expect(getCellText(model, "A1", sheetId2)).toBe("hello");
  });

  test("Replace all in allSheet", () => {
    model = new Model();
    const sheetId2 = "test";
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A1", "hello", sheetId2);
    updateSearch(model, "hell", { searchScope: "allSheets" });
    model.dispatch("REPLACE_ALL_SEARCH", { replaceWith: "kikou" });
    expect(getMatches(model)).toHaveLength(0);
    expect(getMatchIndex(model)).toStrictEqual(null);
    expect(getCellText(model, "A1")).toBe("kikouo");
    expect(getCellText(model, "A1", sheetId2)).toBe("kikouo");
  });

  test("Replace all in specificRange", () => {
    const sheetId1 = "sh1";
    model = new Model({ sheets: [{ id: sheetId1 }] });
    const sheetId2 = "test";
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A1", "hello", sheetId2);
    setCellContent(model, "B1", "hello", sheetId2);
    updateSearch(model, "hell", {
      searchScope: "specificRange",
      specificRange: toRangeData(sheetId2, "A1:A3"),
    });
    updateSearch(model, "hell", { searchScope: "specificRange" });
    model.dispatch("REPLACE_ALL_SEARCH", { replaceWith: "kikou" });
    expect(getMatches(model)).toHaveLength(0);
    expect(getMatchIndex(model)).toStrictEqual(null);
    expect(getCellText(model, "A1", sheetId1)).toBe("hello");
    expect(getCellText(model, "A1", sheetId2)).toBe("kikouo");
    expect(getCellText(model, "B1", sheetId2)).toBe("hello");
  });

  test("replace all won't update the active cell", () => {
    updateSearch(model, "hell");
    expect(getActivePosition(model)).toBe("A1");
    model.dispatch("REPLACE_ALL_SEARCH", { replaceWith: "kikou" });
    expect(model.getters.getSearchMatches()).toHaveLength(0);
    expect(model.getters.getCurrentSelectedMatchIndex()).toStrictEqual(null);
    expect(getActivePosition(model)).toBe("A1");
  });
});

describe("number of match counts", () => {
  beforeEach(() => {
    const sheet1 = "s1";
    model = new Model({ sheets: [{ id: sheet1 }] });
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "=SUM(2,2)");
    setCellContent(model, "A3", "hell");
    const sheet2 = "s2";
    createSheet(model, { sheetId: sheet2 });
    setCellContent(model, "A1", "hello", sheet2);
    setCellContent(model, "A2", "=SUM(2,2)", sheet2);
  });

  test.each(["allSheets", "activeSheet"] as const)(
    "number of match counts return number of search in allSheet, currentSheet for %s search scope",
    (scope) => {
      updateSearch(model, "hell", { searchScope: scope });
      expect(model.getters.getActiveSheetMatchesCount()).toBe(2);
      expect(model.getters.getAllSheetMatchesCount()).toBe(3);
    }
  );

  test("number of match counts return number of search for specificScope search scope", () => {
    updateSearch(model, "hell", {
      searchScope: "specificRange",
      specificRange: toRangeData("s1", "A1:B2"),
    });
    expect(model.getters.getActiveSheetMatchesCount()).toBe(2);
    expect(model.getters.getAllSheetMatchesCount()).toBe(3);
    expect(model.getters.getSpecificRangeMatchesCount()).toBe(1);
  });
});
