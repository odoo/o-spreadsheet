import { Model } from "../../src";
import { functionRegistry } from "../../src/functions";
import { toZone } from "../../src/helpers";
import { SearchOptions } from "../../src/plugins/ui_feature/find_and_replace";
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

let model: Model;
let searchOptions: SearchOptions;

describe("basic search", () => {
  beforeEach(() => {
    model = new Model();
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "hello1");
    setCellContent(model, "A3", "=1");
    setCellContent(model, "A4", "111");
    setCellContent(model, "A5", "1");
    setCellContent(model, "A6", "2");
    searchOptions = {
      matchCase: false,
      exactMatch: false,
      searchFormulas: false,
    };
  });
  test("simple search", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    const matches = model.getters.getSearchMatches();
    const matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 1, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 2, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 3, selected: false });
    expect(matches[3]).toStrictEqual({ col: 0, row: 4, selected: false });
  });

  test("search with a regexp characters", () => {
    setCellContent(model, "A1", "hello (world).*");
    model.dispatch("UPDATE_SEARCH", { toSearch: "(world", searchOptions });
    const matches = model.getters.getSearchMatches();
    expect(matches).toStrictEqual([{ col: 0, row: 0, selected: true }]);
  });

  test("Update search automatically select the first match", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "2", searchOptions });
    expect(model.getters.getSelection().zones).toEqual([toZone("A6")]);
  });

  test("change the search", async () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "hello", searchOptions });
    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(2);
    expect(matchIndex).toStrictEqual(1);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: false });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: true });

    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 1, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 2, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 3, selected: false });
    expect(matches[3]).toStrictEqual({ col: 0, row: 4, selected: false });
  });

  test("refresh search when cell is updated", async () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "hello", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(2);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: false });
    setCellContent(model, "B1", "hello");
    setCellContent(model, "B2", '="hello"');
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: true });
    expect(matches[1]).toStrictEqual({ col: 1, row: 0, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 1, selected: false });
    expect(matches[3]).toStrictEqual({ col: 1, row: 1, selected: false });
  });

  test("refresh search when cell is update with EVALUATE_CELLS", async () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "hello", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(2);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: false });
    let value = "3";
    functionRegistry.add("GETVALUE", {
      description: "Get value",
      compute: () => value,
      args: [],
      returns: ["NUMBER"],
    });
    setCellContent(model, "B1", "=GETVALUE()");
    value = '="hello"';
    model.dispatch("EVALUATE_CELLS", { sheetId: model.getters.getActiveSheetId() });
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(getCellContent(model, "B1")).toBe('="hello"');
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: true });
    expect(matches[1]).toStrictEqual({ col: 1, row: 0, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 1, selected: false });
  });

  test("search on empty string does not match anything", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "", searchOptions });
    expect(model.getters.getSearchMatches()).toHaveLength(0);
  });

  test("search on empty string clears matches", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    expect(model.getters.getSearchMatches()).toHaveLength(4);
    model.dispatch("UPDATE_SEARCH", { toSearch: "", searchOptions });
    expect(model.getters.getSearchMatches()).toHaveLength(0);
  });

  test.skip("Will search a modified cell", () => {
    // not implemented
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 1, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 2, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 3, selected: false });
    expect(matches[3]).toStrictEqual({ col: 0, row: 4, selected: false });
    setCellContent(model, "B1", "=1");
    setCellContent(model, "B2", "=11");
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(6);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 1, row: 0, selected: false });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: true });
    expect(matches[2]).toStrictEqual({ col: 1, row: 1, selected: false });
    expect(matches[3]).toStrictEqual({ col: 0, row: 2, selected: false });
    expect(matches[4]).toStrictEqual({ col: 0, row: 3, selected: false });
    expect(matches[5]).toStrictEqual({ col: 0, row: 4, selected: false });
  });

  test("new search when changing sheet", () => {
    const sheet1 = model.getters.getActiveSheetId();
    const sheet2 = "42";
    createSheet(model, { activate: true, sheetId: sheet2 });
    setCellContent(model, "B1", "hello");
    setCellContent(model, "B2", "Hello");
    setCellContent(model, "B3", "hello1");
    activateSheet(model, sheet1);
    model.dispatch("UPDATE_SEARCH", { toSearch: "hello", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(2);
    expect(matchIndex).toStrictEqual(0);
    activateSheet(model, sheet2);
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(0);
    activateSheet(model, sheet1);
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(2);
    expect(matchIndex).toStrictEqual(0);
  });

  test("hidden cells should not be included in match", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
    hideRows(model, [1]);
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(0);
  });

  test("Need to update search if column or row is removed", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 1, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 2, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 3, selected: false });
    expect(matches[3]).toStrictEqual({ col: 0, row: 4, selected: false });
    deleteRows(model, [1]);
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 1, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 2, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 3, selected: false });
  });

  test("Need to update search if doing undo redo operation which can update the cell", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
    deleteRows(model, [1]);
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(0);
    undo(model);
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
    redo(model);
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(0);
  });

  test("Need to update search when column or row is hiding and unhiding", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
    hideRows(model, [1]);
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(0);
    unhideRows(model, [1]);
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
  });

  test("Need to update search if updating or removing the filter", () => {
    createFilter(model, "A1:A6");
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
    updateFilter(model, "A1", ["1"]);
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(2);
    expect(matchIndex).toStrictEqual(0);
    deleteFilter(model, "A1:A6");
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
  });

  test("Need to maintain search if column or row is added", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 1, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 2, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 3, selected: false });
    expect(matches[3]).toStrictEqual({ col: 0, row: 4, selected: false });
    addRows(model, "after", 1, 1);
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 1, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 3, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 4, selected: false });
    expect(matches[3]).toStrictEqual({ col: 0, row: 5, selected: false });
  });
});

test("simple search with array formula", () => {
  model = new Model();
  setCellContent(model, "A1", "hell0");
  setCellContent(model, "A2", "hello");
  setCellContent(model, "A3", "=1");
  setCellContent(model, "B1", "=TRANSPOSE(A1:A3)");
  searchOptions = {
    matchCase: false,
    exactMatch: false,
    searchFormulas: false,
  };
  model.dispatch("UPDATE_SEARCH", { toSearch: "hello", searchOptions });
  const matches = model.getters.getSearchMatches();
  const matchIndex = model.getters.getCurrentSelectedMatchIndex();
  expect(matches).toHaveLength(2);
  expect(matchIndex).toStrictEqual(0);
  expect(matches[0]).toStrictEqual({ col: 2, row: 0, selected: true });
  expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: false });
});

describe("next/previous cycle", () => {
  beforeEach(() => {
    model = new Model({ sheets: [{ id: "s1" }] });
    setCellContent(model, "A1", "1");
    setCellContent(model, "A2", "1");
    setCellContent(model, "A3", "1");
  });
  test("Next will select the next match", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    const matches = model.getters.getSearchMatches();
    const matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(1);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: false });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: true });
    expect(matches[2]).toStrictEqual({ col: 0, row: 2, selected: false });
  });
  test("Next than previous will cancel each other", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    model.dispatch("SELECT_SEARCH_PREVIOUS_MATCH");
    const matches = model.getters.getSearchMatches();
    const matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 2, selected: false });
  });

  test("search will cycle with next", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(getActivePosition(model)).toBe("A1");
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 2, selected: false });

    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(getActivePosition(model)).toBe("A2");
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(1);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: false });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: true });
    expect(matches[2]).toStrictEqual({ col: 0, row: 2, selected: false });

    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(getActivePosition(model)).toBe("A3");
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(2);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: false });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 2, selected: true });

    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(getActivePosition(model)).toBe("A1");
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 2, selected: false });

    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(getActivePosition(model)).toBe("A2");
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(1);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: false });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: true });
    expect(matches[2]).toStrictEqual({ col: 0, row: 2, selected: false });
  });
  test("search will cycle with previous", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(getActivePosition(model)).toBe("A1");
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 2, selected: false });

    model.dispatch("SELECT_SEARCH_PREVIOUS_MATCH");
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(getActivePosition(model)).toBe("A3");
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(2);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: false });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 2, selected: true });

    model.dispatch("SELECT_SEARCH_PREVIOUS_MATCH");
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(getActivePosition(model)).toBe("A2");
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(1);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: false });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: true });
    expect(matches[2]).toStrictEqual({ col: 0, row: 2, selected: false });

    model.dispatch("SELECT_SEARCH_PREVIOUS_MATCH");
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(getActivePosition(model)).toBe("A1");
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 2, selected: false });

    model.dispatch("SELECT_SEARCH_PREVIOUS_MATCH");
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(getActivePosition(model)).toBe("A3");
    expect(matches).toHaveLength(3);
    expect(matchIndex).toStrictEqual(2);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: false });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 2, selected: true });
  });
});

describe("next/previous with single match", () => {
  beforeEach(() => {
    model = new Model();
    setCellContent(model, "A1", "1");
    searchOptions = {
      matchCase: false,
      exactMatch: false,
      searchFormulas: false,
    };
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    model.dispatch("SELECT_SEARCH_NEXT_MATCH");
  });

  test.each(["SELECT_SEARCH_NEXT_MATCH", "SELECT_SEARCH_PREVIOUS_MATCH"] as const)(
    "%s after changing selection will re-select the match",
    (cmd) => {
      setSelection(model, ["B3"]);
      expect(model.getters.getSelection().zones).toEqual([toZone("B3")]);
      model.dispatch(cmd);
      expect(model.getters.getSelection().zones).toEqual([toZone("A1")]);
    }
  );

  test("UPDATE_SEARCH after changing selection will re-select the match", () => {
    setSelection(model, ["B3"]);
    expect(model.getters.getSelection().zones).toEqual([toZone("B3")]);
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
    expect(model.getters.getSelection().zones).toEqual([toZone("A1")]);
  });

  test.each(["SELECT_SEARCH_NEXT_MATCH", "SELECT_SEARCH_PREVIOUS_MATCH"] as const)(
    "%s after scrolling will re-scroll to the match",
    (cmd) => {
      const viewportAfterSearch = model.getters.getActiveMainViewport();
      setViewportOffset(model, 1000, 1000);
      expect(model.getters.getActiveMainViewport()).not.toMatchObject(viewportAfterSearch);
      model.dispatch("SELECT_SEARCH_NEXT_MATCH");
      expect(model.getters.getActiveMainViewport()).toMatchObject(viewportAfterSearch);
    }
  );

  test("UPDATE_SEARCH after scrolling will re-scroll to the match", () => {
    const viewportAfterSearch = model.getters.getActiveMainViewport();
    setViewportOffset(model, 1000, 1000);
    expect(model.getters.getActiveMainViewport()).not.toMatchObject(viewportAfterSearch);
    model.dispatch("UPDATE_SEARCH", { toSearch: "1", searchOptions });
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
    searchOptions = {
      matchCase: false,
      exactMatch: false,
      searchFormulas: false,
    };
  });

  test("Can search matching case", () => {
    searchOptions.matchCase = true;
    model.dispatch("UPDATE_SEARCH", { toSearch: "Hell", searchOptions });
    const matches = model.getters.getSearchMatches();
    const matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(2);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 1, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 4, selected: false });
  });

  test("Can search matching entire cell", () => {
    searchOptions.exactMatch = true;
    model.dispatch("UPDATE_SEARCH", { toSearch: "hell", searchOptions });
    const matches = model.getters.getSearchMatches();
    const matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(2);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 3, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 4, selected: false });
  });

  test("Can search in formulas", () => {
    searchOptions.searchFormulas = true;
    model.dispatch("UPDATE_SEARCH", { toSearch: "sum", searchOptions });
    const matches = model.getters.getSearchMatches();
    const matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(2);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 2, selected: false });
  });

  test("Can search in formulas(2)", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "4", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(1);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 2, selected: true });
    searchOptions.searchFormulas = true;
    model.dispatch("UPDATE_SEARCH", { toSearch: "4", searchOptions });
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(0);
    expect(matchIndex).toBe(null);
  });

  test("Combine matching case / matching entire cell / search in formulas", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "hell", searchOptions });
    let matches = model.getters.getSearchMatches();
    let matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(4);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 1, selected: false });
    expect(matches[2]).toStrictEqual({ col: 0, row: 3, selected: false });
    expect(matches[3]).toStrictEqual({ col: 0, row: 4, selected: false });

    //match case
    searchOptions.matchCase = true;
    model.dispatch("UPDATE_SEARCH", { toSearch: "hell", searchOptions });
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(2);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 3, selected: false });

    //match case + exact match
    searchOptions.matchCase = true;
    searchOptions.exactMatch = true;
    model.dispatch("UPDATE_SEARCH", { toSearch: "hell", searchOptions });
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(1);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 3, selected: true });

    //change input and remove match case + exact match and add look in formula
    searchOptions.searchFormulas = true;
    searchOptions.matchCase = false;
    searchOptions.exactMatch = false;
    model.dispatch("UPDATE_SEARCH", { toSearch: "SUM", searchOptions });
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(2);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 0, selected: true });
    expect(matches[1]).toStrictEqual({ col: 0, row: 2, selected: false });

    //add match case
    searchOptions.matchCase = true;
    model.dispatch("UPDATE_SEARCH", { toSearch: "SUM", searchOptions });
    matches = model.getters.getSearchMatches();
    matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(1);
    expect(matchIndex).toStrictEqual(0);
    expect(matches[0]).toStrictEqual({ col: 0, row: 2, selected: true });
  });
});
describe("replace", () => {
  beforeEach(() => {
    model = new Model();
    setCellContent(model, "A1", "hello");
    setCellContent(model, "A2", "=SUM(2,2)");
    setCellContent(model, "A3", "hell");
    setCellContent(model, "A4", "hell");
    searchOptions = {
      matchCase: false,
      exactMatch: false,
      searchFormulas: false,
    };
  });

  test("Can replace a simple text value", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "hello", searchOptions });
    model.dispatch("REPLACE_SEARCH", { replaceWith: "kikou" });
    const matches = model.getters.getSearchMatches();
    const matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(0);
    expect(matchIndex).toStrictEqual(null);
    expect(getCellContent(model, "A1")).toBe("kikou");
  });

  test("Can replace a value in a formula", () => {
    searchOptions.searchFormulas = true;
    model.dispatch("UPDATE_SEARCH", { toSearch: "2", searchOptions });
    model.dispatch("REPLACE_SEARCH", { replaceWith: "4" });
    const matches = model.getters.getSearchMatches();
    const matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(0);
    expect(matchIndex).toStrictEqual(null);
    expect(getCellText(model, "A2")).toBe("=SUM(4,4)");
  });

  test("Replaced value is changed to canonical form in model", () => {
    searchOptions.searchFormulas = true;
    updateLocale(model, {
      ...DEFAULT_LOCALE,
      decimalSeparator: ",",
      formulaArgSeparator: ";",
      thousandsSeparator: " ",
    });
    model.dispatch("UPDATE_SEARCH", { toSearch: "2", searchOptions });
    model.dispatch("REPLACE_SEARCH", { replaceWith: "4,5" });
    const matches = model.getters.getSearchMatches();
    const matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(0);
    expect(matchIndex).toStrictEqual(null);
    expect(getCell(model, "A2")?.content).toBe("=SUM(4.5,4.5)");
  });

  test("formulas wont be modified if not looking in formulas or not modifying formulas", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "4", searchOptions });
    model.dispatch("REPLACE_SEARCH", { replaceWith: "2" });
    const matches = model.getters.getSearchMatches();
    const matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(1);
    expect(matchIndex).toStrictEqual(0);
    expect(getCellText(model, "A2")).toBe("=SUM(2,2)");
  });

  test("can replace all", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "hell", searchOptions });
    model.dispatch("REPLACE_ALL_SEARCH", { replaceWith: "kikou" });
    const matches = model.getters.getSearchMatches();
    const matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(0);
    expect(matchIndex).toStrictEqual(null);
    expect(getCellContent(model, "A1")).toBe("kikouo");
    expect(getCellText(model, "A2")).toBe("=SUM(2,2)");
    expect(getCellContent(model, "A3")).toBe("kikou");
    expect(getCellContent(model, "A4")).toBe("kikou");
  });

  test("replace all won't update the active cell", () => {
    model.dispatch("UPDATE_SEARCH", { toSearch: "hell", searchOptions });
    expect(getActivePosition(model)).toBe("A1");
    model.dispatch("REPLACE_ALL_SEARCH", { replaceWith: "kikou" });
    const matches = model.getters.getSearchMatches();
    const matchIndex = model.getters.getCurrentSelectedMatchIndex();
    expect(matches).toHaveLength(0);
    expect(matchIndex).toStrictEqual(null);
    expect(getActivePosition(model)).toBe("A1");
  });
});

test("replace don't replace value resulting from array formula", () => {
  model = new Model();
  setCellContent(model, "A1", "hell0");
  setCellContent(model, "A2", "hello");
  setCellContent(model, "A3", "=1");
  setCellContent(model, "B1", "=TRANSPOSE(A1:A3)");
  searchOptions = {
    matchCase: false,
    exactMatch: false,
    searchFormulas: false,
  };
  model.dispatch("UPDATE_SEARCH", { toSearch: "hello", searchOptions });
  model.dispatch("REPLACE_ALL_SEARCH", { replaceWith: "kikou" });
  const matches = model.getters.getSearchMatches();
  const matchIndex = model.getters.getCurrentSelectedMatchIndex();
  expect(matches).toHaveLength(0);
  expect(matchIndex).toStrictEqual(null);
  // Check that the original value has correctly been replaced
  expect(getCellContent(model, "A2")).toBe("kikou");
  // Check that the array formula has not been modified : If nothing has
  // been written in C1, B1 should still be an array formula (not errored)
  expect(getCellContent(model, "B1")).not.toBe("#ERROR");
  expect(getCell(model, "C1")?.content).toBe(undefined);
  // Check that the spread value has been updated according to the modified value of A2
  expect(getCellContent(model, "C1")).toBe("kikou");
});
