import { Model } from "../../src";
import { FindAndReplaceStore } from "../../src/components/side_panel/find_and_replace/find_and_replace_store";
import { functionRegistry } from "../../src/functions";
import { toZone } from "../../src/helpers";
import { DependencyContainer } from "../../src/store_engine";
import { NotificationStore } from "../../src/stores/notification_store";
import { UID } from "../../src/types";
import { SearchOptions } from "../../src/types/find_and_replace";
import { DEFAULT_LOCALE } from "../../src/types/locale";
import {
  activateSheet,
  addRows,
  createSheet,
  createTable,
  deleteRows,
  deleteTable,
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
  getCellError,
  getCellText,
} from "../test_helpers/getters_helpers";
import { makeStore } from "../test_helpers/stores";

let model: Model;
let store: FindAndReplaceStore;
let container: DependencyContainer;

function p(xc: string) {
  const z = toZone(xc);
  return { col: z.left, row: z.top };
}

function match(sheetId: UID, xc: string) {
  return { sheetId, ...p(xc) };
}

function updateSearch(model: Model, toSearch: string, options: Partial<SearchOptions> = {}) {
  const searchOptions = { ...store.searchOptions, ...options };
  store.updateSearchContent(toSearch);
  store.updateSearchOptions(searchOptions);
}

function replaceSearch(replaceWith: string) {
  store.toReplace = replaceWith;
  store.replace();
}

function replaceAll(replaceWith: string) {
  store.toReplace = replaceWith;
  store.replaceAll();
}

let sheetId1: string;
const sheetId2 = "s2";
beforeEach(() => {
  ({ store, model, container } = makeStore(FindAndReplaceStore));
  sheetId1 = model.getters.getActiveSheetId();
});

describe("basic search", () => {
  test("simple search for search scope activeSheet", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "test");
    createSheet(model, { sheetId: "sh2", activate: true });
    setCellContent(model, "A1", "test");
    setCellContent(model, "A2", "test");
    updateSearch(model, "test", { searchScope: "activeSheet" });
    expect(store.searchMatches).toEqual([match("sh2", "A1"), match("sh2", "A2")]);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    activateSheet(model, sheetId1);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A2")]);
    expect(store.selectedMatchIndex).toStrictEqual(0);
  });

  test("default search scope is set to activeSheet", () => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "test");
    createSheet(model, { sheetId: "sh2", activate: true });
    setCellContent(model, "A1", "test");
    setCellContent(model, "A2", "test");
    updateSearch(model, "test");
    expect(store.searchMatches).toEqual([match("sh2", "A1"), match("sh2", "A2")]);
    expect(store.selectedMatchIndex).toStrictEqual(0);
  });

  test("simple search for search scope allSheet", () => {
    setCellContent(model, "A2", "test");
    createSheet(model, { sheetId: "sh2" });
    setCellContent(model, "A2", "test", "sh2");
    updateSearch(model, "test", { searchScope: "allSheets" });
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toEqual([match(sheetId1, "A2"), match("sh2", "A2")]);
  });

  test("simple search for search scope specificRange", () => {
    setCellContent(model, "A1", "test");
    setCellContent(model, "A2", "test");
    updateSearch(model, "test", {
      searchScope: "specificRange",
      specificRange: model.getters.getRangeFromSheetXC(sheetId1, "A1:B1"),
    });
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A1")]);
  });

  test("search with a regexp characters", () => {
    setCellContent(model, "A1", "hello (world).*");
    updateSearch(model, "hello (world).*");
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A1")]);
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
    store.selectNextMatch();
    expect(store.selectedMatchIndex).toStrictEqual(1);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A1"), match(sheetId1, "A2")]);
    updateSearch(model, "1", { searchScope: "activeSheet" });
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A2"), match(sheetId1, "A3")]);
  });

  test("change the search for allSheet searchScope", () => {
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "hello1");
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A1", "=111", sheetId2);

    updateSearch(model, "hello", { searchScope: "allSheets" });
    store.selectNextMatch();
    expect(store.selectedMatchIndex).toStrictEqual(1);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A1"), match(sheetId1, "A2")]);
    updateSearch(model, "1");
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A2"), match(sheetId2, "A1")]);
  });

  test("change the search for specificRange searchScope", () => {
    setCellContent(model, "A1", "hello");
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A2", "=111", sheetId2);
    updateSearch(model, "hello", {
      searchScope: "specificRange",
      specificRange: model.getters.getRangeFromSheetXC(sheetId2, "A1:A3"),
    });
    store.selectNextMatch();
    expect(store.searchMatches).toHaveLength(0);
    expect(model.getters.getActiveSheetId()).toBe(sheetId1);
    updateSearch(model, "1");
    expect(model.getters.getActiveSheetId()).toBe(sheetId2);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId2, "A2")]);
  });

  test("refresh search when cell is updated", async () => {
    setCellContent(model, "A1", "hello");
    updateSearch(model, "hello");
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A1")]);
    setCellContent(model, "B1", "hello");
    setCellContent(model, "B2", '="hello"');
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([
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
    });
    setCellContent(model, "A1", "hello");
    setCellContent(model, "B1", "=GETVALUE()");
    updateSearch(model, "hello");
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A1")]);
    value = "hello";
    model.dispatch("EVALUATE_CELLS", { sheetId: model.getters.getActiveSheetId() });
    expect(getCellContent(model, "B1")).toBe(value);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A1"), match(sheetId1, "B1")]);
  });

  test("search on empty string does not match anything", () => {
    setCellContent(model, "A1", "hello");
    updateSearch(model, "");
    expect(store.searchMatches).toHaveLength(0);
  });

  test("search on empty string clears matches", () => {
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "hello");
    updateSearch(model, "hello");
    expect(store.searchMatches).toHaveLength(2);
    updateSearch(model, "");
    expect(store.searchMatches).toHaveLength(0);
  });

  test("search begins from current sheet with index starting at the first sheet in allSheets search scope", () => {
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "hello1");
    setCellContent(model, "A3", "1");
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A2", "=111", sheetId2);
    activateSheet(model, sheetId2);
    updateSearch(model, "1", { searchScope: "allSheets" });
    expect(getActivePosition(model)).toBe("A2");
    expect(store.selectedMatchIndex).toStrictEqual(2);
    expect(store.searchMatches).toStrictEqual([
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
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A3")]);
    activateSheet(model, "s2");
    expect(getActivePosition(model)).toBe("A2");
    expect(store.searchMatches).toStrictEqual([match(sheetId2, "A2")]);
  });

  test("Update search if column or row is added", () => {
    setCellContent(model, "A3", "1");
    setCellContent(model, "A4", "1");
    updateSearch(model, "1");
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A3"), match(sheetId1, "A4")]);
    addRows(model, "after", 1, 1);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A4"), match(sheetId1, "A5")]);
  });

  test("Search is updated if column or row is removed", () => {
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "111");
    updateSearch(model, "1");
    store.selectNextMatch();
    expect(store.selectedMatchIndex).toStrictEqual(1);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A2"), match(sheetId1, "A3")]);
    deleteRows(model, [1]);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A2")]);
  });

  test("Update search upon undo/redo operations, which can update the cell", () => {
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "1");
    updateSearch(model, "1");
    expect(store.searchMatches).toHaveLength(2);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    deleteRows(model, [1]);
    expect(store.searchMatches).toHaveLength(1);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    undo(model);
    expect(store.searchMatches).toHaveLength(2);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    redo(model);
    expect(store.searchMatches).toHaveLength(1);
    expect(store.selectedMatchIndex).toStrictEqual(0);
  });

  test("hidden cells should not be included in match", () => {
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "1");
    updateSearch(model, "1");
    expect(store.searchMatches).toHaveLength(2);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    hideRows(model, [1]);
    expect(store.searchMatches).toHaveLength(1);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    unhideRows(model, [1]);
    expect(store.searchMatches).toHaveLength(2);
    expect(store.selectedMatchIndex).toStrictEqual(0);
  });

  test("Need to update search if updating or removing the filter", () => {
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "=111");
    createTable(model, "A1:A6");
    updateSearch(model, "1");
    expect(store.searchMatches).toHaveLength(2);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    updateFilter(model, "A1", ["1"]);
    expect(store.searchMatches).toHaveLength(1);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    deleteTable(model, "A1:A6");
    expect(store.searchMatches).toHaveLength(2);
    expect(store.selectedMatchIndex).toStrictEqual(0);
  });

  test("Switching sheet properly recomputes search results and shows them in the viewport", () => {
    setCellContent(model, "A2", "Hello");
    setCellContent(model, "A3", "Hello");
    createSheet(model, { sheetId: "s2" });
    setCellContent(model, "Z100", "hello", "s2");
    updateSearch(model, "hello", { searchScope: "allSheets" });
    expect(store.activeSheetMatchesCount).toBe(2);
    expect(store.allSheetMatchesCount).toBe(3);
    expect(store.specificRangeMatchesCount).toBe(0);
    expect(model.getters.getActiveMainViewport()).toMatchObject(toZone("A1:K44"));
    activateSheet(model, "s2");
    expect(store.activeSheetMatchesCount).toBe(1);
    expect(store.allSheetMatchesCount).toBe(3);
    expect(store.specificRangeMatchesCount).toBe(0);
    expect(model.getters.getActiveMainViewport()).toMatchObject(toZone("Q58:Z100"));
  });

  test("Search results and range are highlighted", () => {
    setCellContent(model, "A2", "Hello");
    setCellContent(model, "A3", "Hello");
    updateSearch(model, "hello", {
      searchScope: "specificRange",
      specificRange: model.getters.getRangeFromSheetXC(sheetId1, "A1:A3"),
    });

    expect(store.highlights).toMatchObject([
      { zone: toZone("A2") },
      { zone: toZone("A3"), noBorder: true }, // Not selected, we don't show a border
      { zone: toZone("A1:A3"), noFill: true }, // Searched range
    ]);
  });
});

test("simple search with array formula", () => {
  setCellContent(model, "A1", "hell0");
  setCellContent(model, "A2", "hello");
  setCellContent(model, "A3", "=1");
  setCellContent(model, "B1", "=TRANSPOSE(A1:A3)");
  updateSearch(model, "hello");
  expect(store.selectedMatchIndex).toStrictEqual(0);
  expect(store.searchMatches).toStrictEqual([match(sheetId1, "C1"), match(sheetId1, "A2")]);
});

test("replace don't replace value resulting from array formula", () => {
  setCellContent(model, "A1", "hell0");
  setCellContent(model, "A2", "hello");
  setCellContent(model, "A3", "=1");
  setCellContent(model, "B1", "=TRANSPOSE(A1:A3)");
  updateSearch(model, "hello");
  replaceAll("kikou");
  expect(store.searchMatches).toHaveLength(0);
  expect(store.selectedMatchIndex).toStrictEqual(null);
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
  setCellContent(model, "A1", "hello");
  updateSearch(model, "hello", { searchScope: "allSheets" });
  createSheet(model, { sheetId: "sh2", activate: true });
  expect(store.searchMatches).toHaveLength(1);
  expect(store.selectedMatchIndex).toStrictEqual(0);
  setCellContent(model, "A1", "test");
  expect(model.getters.getActiveSheetId()).toBe("sh2");
});

describe("next/previous cycle", () => {
  beforeEach(() => {
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "1");
  });
  test("Next will select the next match", () => {
    updateSearch(model, "1");
    store.selectNextMatch();
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);
  });
  test("Next than previous will cancel each other", () => {
    updateSearch(model, "1");
    store.selectNextMatch();
    store.selectPreviousMatch();
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);
  });

  test("search will cycle with next", () => {
    updateSearch(model, "1");
    expect(getActivePosition(model)).toBe("A1");
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);
    store.selectNextMatch();
    expect(getActivePosition(model)).toBe("A2");
    expect(store.selectedMatchIndex).toStrictEqual(1);
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    store.selectNextMatch();
    expect(getActivePosition(model)).toBe("A3");
    expect(store.selectedMatchIndex).toStrictEqual(2);
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    store.selectNextMatch();
    expect(getActivePosition(model)).toBe("A1");
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    store.selectNextMatch();
    expect(getActivePosition(model)).toBe("A2");
    expect(store.selectedMatchIndex).toStrictEqual(1);
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);
  });
  test("search will cycle with previous", () => {
    updateSearch(model, "1");
    expect(getActivePosition(model)).toBe("A1");
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    store.selectPreviousMatch();
    expect(getActivePosition(model)).toBe("A3");
    expect(store.selectedMatchIndex).toStrictEqual(2);
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    store.selectPreviousMatch();
    expect(getActivePosition(model)).toBe("A2");
    expect(store.selectedMatchIndex).toStrictEqual(1);
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    store.selectPreviousMatch();
    expect(getActivePosition(model)).toBe("A1");
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);

    store.selectPreviousMatch();
    expect(getActivePosition(model)).toBe("A3");
    expect(store.selectedMatchIndex).toStrictEqual(2);
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A3"),
    ]);
  });

  test("Selecting previous match will select the last match of the previous sheet", () => {
    createSheet(model, { sheetId: "s2" });
    setCellContent(model, "A1", "1", "s2");
    setCellContent(model, "Z26", "1", "s2");
    updateSearch(model, "1", { searchScope: "allSheets" });
    expect(model.getters.getActiveSheetId()).toBe(sheetId1);
    expect(getActivePosition(model)).toBe("A1");
    store.selectPreviousMatch();
    expect(model.getters.getActiveSheetId()).toBe("s2");
    expect(getActivePosition(model)).toBe("Z26");
  });
});

describe("next/previous with single match", () => {
  beforeEach(() => {
    setCellContent(model, "A1", "1");
    updateSearch(model, "1", { searchScope: "activeSheet" });
  });

  test.each(["selectNext", "selectPrevious"] as const)(
    "%s after changing selection will re-select the match",
    (cmd) => {
      setSelection(model, ["B3"]);
      expect(model.getters.getSelectedZones()).toEqual([toZone("B3")]);
      cmd === "selectNext" ? store.selectNextMatch() : store.selectPreviousMatch();
      expect(model.getters.getSelectedZones()).toEqual([toZone("A1")]);
    }
  );

  test("Updating search after changing selection will re-select the match", () => {
    setSelection(model, ["B3"]);
    expect(model.getters.getSelectedZones()).toEqual([toZone("B3")]);
    updateSearch(model, "1");
    expect(model.getters.getSelectedZones()).toEqual([toZone("A1")]);
  });

  test.each(["selectNext", "selectPrevious"] as const)(
    "%s after scrolling will re-scroll to the match",
    (cmd) => {
      const viewportAfterSearch = model.getters.getActiveMainViewport();
      setViewportOffset(model, 1000, 1000);
      expect(model.getters.getActiveMainViewport()).not.toMatchObject(viewportAfterSearch);
      cmd === "selectNext" ? store.selectNextMatch() : store.selectPreviousMatch();
      expect(model.getters.getActiveMainViewport()).toMatchObject(viewportAfterSearch);
    }
  );

  test("Updating search after scrolling will re-scroll to the match", () => {
    const viewportAfterSearch = model.getters.getActiveMainViewport();
    setViewportOffset(model, 1000, 1000);
    expect(model.getters.getActiveMainViewport()).not.toMatchObject(viewportAfterSearch);
    updateSearch(model, "1");
    expect(model.getters.getActiveMainViewport()).toMatchObject(viewportAfterSearch);
  });
});

describe("search options", () => {
  beforeEach(() => {
    setCellContent(model, "A1", "hello=sum");
    setCellContent(model, "A2", "Hello");
    setCellContent(model, "A3", "=SUM(1,3)");
    setCellContent(model, "A4", "hell");
    setCellContent(model, "A5", "Hell");
  });

  test("Can search matching case", () => {
    updateSearch(model, "Hell", { matchCase: true });
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A2"), match(sheetId1, "A5")]);
  });

  test("Can search matching entire cell", () => {
    updateSearch(model, "Hell", { exactMatch: true });
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A4"), match(sheetId1, "A5")]);
  });

  test("Can search in formulas", () => {
    updateSearch(model, "Hell", { searchFormulas: true });
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A4"),
      match(sheetId1, "A5"),
    ]);
  });

  test("Can search in formulas(2)", () => {
    updateSearch(model, "4", { searchFormulas: false });
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A3")]);
    updateSearch(model, "4", { searchFormulas: true });
    expect(store.searchMatches).toStrictEqual([]);
    expect(store.selectedMatchIndex).toBe(null);
  });

  test("Search in formula searches cell content of a cell in error", () => {
    setCellContent(model, "A6", "=notASumifFunction(2)");
    setCellContent(model, "A7", '=SUMIF("a")');
    expect(getCellError(model, "A6")).toBeDefined();
    expect(getCellError(model, "A7")).toBeDefined();
    updateSearch(model, "sumif", { searchScope: "activeSheet", searchFormulas: true });
    const matches = store.searchMatches;
    expect(matches).toHaveLength(2);
    expect(matches[0]).toStrictEqual({ sheetId: sheetId1, col: 0, row: 5 });
    expect(matches[1]).toStrictEqual({ sheetId: sheetId1, col: 0, row: 6 });
  });

  test("Combine matching case / matching entire cell / search in formulas", () => {
    updateSearch(model, "hell");
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([
      match(sheetId1, "A1"),
      match(sheetId1, "A2"),
      match(sheetId1, "A4"),
      match(sheetId1, "A5"),
    ]);
    //match case
    updateSearch(model, "hell", { matchCase: true });
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A1"), match(sheetId1, "A4")]);

    //match case + exact match
    updateSearch(model, "hell", { matchCase: true, exactMatch: true });
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A4")]);

    //change input and remove match case + exact match and add look in formula
    updateSearch(model, "SUM", { matchCase: false, exactMatch: false, searchFormulas: true });
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A1"), match(sheetId1, "A3")]);

    //add match case
    updateSearch(model, "SUM", { matchCase: true, searchFormulas: true });
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(store.searchMatches).toStrictEqual([match(sheetId1, "A3")]);
  });
});

describe("Replace", () => {
  test("Can replace a simple text value", () => {
    setCellContent(model, "A1", "hello");
    updateSearch(model, "hello");
    replaceSearch("kikou");
    expect(store.searchMatches).toHaveLength(0);
    expect(store.selectedMatchIndex).toStrictEqual(null);
    expect(getCellText(model, "A1")).toBe("kikou");
  });

  test("Can replace a value in a formula", () => {
    setCellContent(model, "A1", "=SUM(2,2)");
    updateSearch(model, "2", { searchFormulas: true, searchScope: "activeSheet" });
    replaceSearch("4");
    expect(store.searchMatches).toHaveLength(0);
    expect(store.selectedMatchIndex).toStrictEqual(null);
    expect(getCellText(model, "A1")).toBe("=SUM(4,4)");
  });

  test("Replaced value is changed to canonical form in model", () => {
    setCellContent(model, "A1", "=SUM(2,2)");
    updateLocale(model, {
      ...DEFAULT_LOCALE,
      decimalSeparator: ",",
      formulaArgSeparator: ";",
      thousandsSeparator: " ",
    });
    updateSearch(model, "2", { searchFormulas: true, searchScope: "activeSheet" });
    replaceSearch("2,5");
    expect(store.searchMatches).toHaveLength(1);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(getCell(model, "A1")?.content).toBe("=SUM(2.5,2.5)");
  });

  test("formulas wont be modified if not looking in formulas or not modifying formulas", () => {
    setCellContent(model, "A1", "=SUM(2,2)");
    updateSearch(model, "4");
    expect(store.searchMatches).toHaveLength(1);
    replaceSearch("2");
    expect(store.searchMatches).toHaveLength(1);
    expect(store.selectedMatchIndex).toStrictEqual(0);
    expect(getCellText(model, "A1")).toBe("=SUM(2,2)");
  });

  test("Replace all in activeSheet", () => {
    const sheetId2 = "test";
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A1", "hello", sheetId2);
    updateSearch(model, "hell", { searchScope: "activeSheet" });
    replaceAll("kikou");
    expect(store.searchMatches).toHaveLength(0);
    expect(store.selectedMatchIndex).toStrictEqual(null);
    expect(getCellText(model, "A1")).toBe("kikouo");
    expect(getCellText(model, "A1", sheetId2)).toBe("hello");
  });

  test("Replace all in allSheet", () => {
    const sheetId2 = "test";
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A1", "hello", sheetId2);
    updateSearch(model, "hell", { searchScope: "allSheets" });
    replaceAll("kikou");
    expect(store.searchMatches).toHaveLength(0);
    expect(store.selectedMatchIndex).toStrictEqual(null);
    expect(getCellText(model, "A1")).toBe("kikouo");
    expect(getCellText(model, "A1", sheetId2)).toBe("kikouo");
  });

  test("Replace all in specificRange", () => {
    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A1", "hello", sheetId2);
    setCellContent(model, "B1", "hello", sheetId2);
    updateSearch(model, "hell", {
      searchScope: "specificRange",
      specificRange: model.getters.getRangeFromSheetXC(sheetId2, "A1:A3"),
    });
    updateSearch(model, "hell", { searchScope: "specificRange" });
    replaceAll("kikou");
    expect(store.searchMatches).toHaveLength(0);
    expect(store.selectedMatchIndex).toStrictEqual(null);
    expect(getCellText(model, "A1", sheetId1)).toBe("hello");
    expect(getCellText(model, "A1", sheetId2)).toBe("kikouo");
    expect(getCellText(model, "B1", sheetId2)).toBe("hello");
  });

  test("replace all won't update the active cell", () => {
    updateSearch(model, "hell");
    expect(getActivePosition(model)).toBe("A1");
    replaceAll("kikou");
    expect(store.searchMatches).toHaveLength(0);
    expect(store.selectedMatchIndex).toStrictEqual(null);
    expect(getActivePosition(model)).toBe("A1");
  });
});

describe("number of match counts", () => {
  beforeEach(() => {
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "=SUM(2,2)");
    setCellContent(model, "A3", "hell");

    createSheet(model, { sheetId: sheetId2 });
    setCellContent(model, "A1", "hello", sheetId2);
    setCellContent(model, "A2", "=SUM(2,2)", sheetId2);
  });

  test.each(["allSheets", "activeSheet"] as const)(
    "number of match counts return number of search in allSheet, currentSheet for %s search scope",
    (scope) => {
      updateSearch(model, "hell", { searchScope: scope });
      expect(store.activeSheetMatchesCount).toBe(2);
      expect(store.allSheetMatchesCount).toBe(3);
    }
  );

  test("number of match counts return number of search for specificScope search scope", () => {
    updateSearch(model, "hell", {
      searchScope: "specificRange",
      specificRange: model.getters.getRangeFromSheetXC(sheetId1, "A1:B2"),
    });
    expect(store.activeSheetMatchesCount).toBe(2);
    expect(store.allSheetMatchesCount).toBe(3);
    expect(store.specificRangeMatchesCount).toBe(1);
  });
});

test("Selecting a previous match located in a previous sheet will select the last occurrence of the previous sheet and go backward in order", () => {
  setCellContent(model, "A1", "9", sheetId1);
  setCellContent(model, "B2", "9", sheetId1);
  setCellContent(model, "P14", "9", sheetId1);
  createSheet(model, { sheetId: "sh2" });
  setCellContent(model, "H34", "9", "sh2");

  updateSearch(model, "9", { searchScope: "allSheets" });
  expect(store.activeSheetMatchesCount).toStrictEqual(3);

  store.selectNextMatch();
  store.selectNextMatch();
  store.selectNextMatch();

  expect(store.activeSheetMatchesCount).toStrictEqual(1);

  expect(store.selectedMatchIndex).toStrictEqual(3);
  expect(getActivePosition(model)).toBe("H34");
  store.selectPreviousMatch();
  expect(getActivePosition(model)).toBe("P14");
  expect(store.selectedMatchIndex).toStrictEqual(2);
  store.selectPreviousMatch();
  expect(getActivePosition(model)).toBe("B2");
  expect(store.selectedMatchIndex).toStrictEqual(1);
  store.selectPreviousMatch();
  expect(getActivePosition(model)).toBe("A1");
  expect(store.selectedMatchIndex).toStrictEqual(0);
});

describe("replace warnings", () => {
  test("no warning when replacing a match successfully", () => {
    setCellContent(model, "A1", "2024");

    const notificationStore = container.get(NotificationStore);
    const spyNotify = jest.spyOn(notificationStore, "notifyUser");

    updateSearch(model, "2024");
    replaceSearch("2025");

    expect(spyNotify).not.toHaveBeenCalled();
  });

  test("warns when trying to replace a match in a formula", () => {
    setCellContent(model, "A2", "=DATE(2024, 1, 1)");

    const notificationStore = container.get(NotificationStore);
    const spyNotify = jest.spyOn(notificationStore, "notifyUser");

    updateSearch(model, "2024");
    replaceSearch("2025");

    expect(spyNotify).toHaveBeenCalledWith({
      type: "warning",
      sticky: false,
      text: "Match(es) cannot be replaced as they are part of a formula.",
    });
  });

  test("warns correctly when replacing all matches across all sheets including formulas", () => {
    setCellContent(model, "A1", "2024");
    setCellContent(model, "A2", "=DATE(2024, 1, 1)");
    createSheet(model, { sheetId: "sh2", activate: true });
    setCellContent(model, "A1", "2024");
    setCellContent(model, "A2", "=DATE(2024, 1, 1)");

    const notificationStore = container.get(NotificationStore);
    const spyNotify = jest.spyOn(notificationStore, "notifyUser");

    updateSearch(model, "2024", { searchScope: "allSheets" });
    replaceAll("2025");

    expect(spyNotify).toHaveBeenCalledWith({
      type: "warning",
      sticky: false,
      text: "2 match(es) replaced. 2 match(es) cannot be replaced as they are part of a formula.",
    });
  });

  test("warns with correct counts when replacing all matches in active sheet", () => {
    setCellContent(model, "A1", "2024");
    setCellContent(model, "A2", "=DATE(2024, 1, 1)");

    const notificationStore = container.get(NotificationStore);
    const spyNotify = jest.spyOn(notificationStore, "notifyUser");

    updateSearch(model, "2024", { searchScope: "activeSheet" });
    replaceAll("2025");

    expect(spyNotify).toHaveBeenCalledWith({
      type: "warning",
      sticky: false,
      text: "1 match(es) replaced. 1 match(es) cannot be replaced as they are part of a formula.",
    });
  });

  test("warns correctly when replacing all matches and attempting to replace again", () => {
    setCellContent(model, "A1", "2024");
    createSheet(model, { sheetId: "sh2", activate: true });
    setCellContent(model, "A2", "=DATE(2024, 1, 1)");

    const notificationStore = container.get(NotificationStore);
    const spyNotify = jest.spyOn(notificationStore, "notifyUser");

    updateSearch(model, "2024", { searchScope: "allSheets" });
    replaceAll("2025");

    expect(spyNotify).toHaveBeenCalledWith({
      type: "warning",
      sticky: false,
      text: "1 match(es) replaced. 1 match(es) cannot be replaced as they are part of a formula.",
    });

    replaceAll("2025");

    expect(spyNotify).toHaveBeenCalledWith({
      type: "warning",
      sticky: false,
      text: "Match(es) cannot be replaced as they are part of a formula.",
    });
  });
});
