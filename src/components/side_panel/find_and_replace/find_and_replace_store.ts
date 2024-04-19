import { debounce, getSearchRegex, isInside, positionToZone } from "../../../helpers";
import { HighlightProvider, HighlightStore } from "../../../stores/highlight_store";
import { CellPosition, Color, Command, Highlight } from "../../../types";

import { Get } from "../../../store_engine";
import { SpreadsheetStore } from "../../../stores";
import { SearchOptions } from "../../../types/find_and_replace";

const FIND_AND_REPLACE_HIGHLIGHT_COLOR: Color = "#8B008B";

enum Direction {
  previous = -1,
  current = 0,
  next = 1,
}

export class FindAndReplaceStore extends SpreadsheetStore implements HighlightProvider {
  mutators = [
    "updateSearchOptions",
    "updateSearchContent",
    "searchFormulas",
    "selectPreviousMatch",
    "selectNextMatch",
    "replace",
  ] as const;
  private allSheetsMatches: CellPosition[] = [];
  private activeSheetMatches: CellPosition[] = [];
  private specificRangeMatches: CellPosition[] = [];

  private currentSearchRegex: RegExp | null = null;
  private isSearchDirty = false;
  private initialShowFormulaState: boolean;

  // fixme: why do we make selectedMatchIndex on top of a selected
  // property in the matches?
  selectedMatchIndex: number | null = null;
  toSearch: string = "";
  toReplace: string = "";
  searchOptions: SearchOptions = {
    matchCase: false,
    exactMatch: false,
    searchFormulas: false,
    searchScope: "allSheets",
    specificRange: undefined,
  };

  updateSearchContent = debounce(this._updateSearchContent.bind(this), 200);
  constructor(get: Get) {
    super(get);
    this.initialShowFormulaState = this.model.getters.shouldShowFormulas();
    this.searchOptions.searchFormulas = this.initialShowFormulaState;

    const highlightStore = get(HighlightStore);
    highlightStore.register(this);
    this.onDispose(() => {
      this.model.dispatch("SET_FORMULA_VISIBILITY", { show: this.initialShowFormulaState });
      this.updateSearchContent.stopDebounce();
      highlightStore.unRegister(this);
    });
  }

  get searchMatches(): CellPosition[] {
    switch (this.searchOptions.searchScope) {
      case "allSheets":
        return this.allSheetsMatches;
      case "activeSheet":
        return this.activeSheetMatches;
      case "specificRange":
        return this.specificRangeMatches;
    }
  }

  private _updateSearchContent(toSearch: string) {
    this._updateSearch(toSearch, this.searchOptions);
  }

  updateSearchOptions(searchOptions: Partial<SearchOptions>) {
    this._updateSearch(this.toSearch, { ...this.searchOptions, ...searchOptions });
  }

  searchFormulas(showFormula: boolean) {
    this.model.dispatch("SET_FORMULA_VISIBILITY", { show: showFormula });
    this.updateSearchOptions({ searchFormulas: showFormula });
  }

  selectPreviousMatch() {
    this.selectNextCell(Direction.previous);
  }

  selectNextMatch() {
    this.selectNextCell(Direction.next);
  }

  get pendingSearch() {
    return this.updateSearchContent.isDebouncePending();
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "SET_FORMULA_VISIBILITY":
        this.updateSearchOptions({ searchFormulas: cmd.show });
        break;
      case "UNDO":
      case "REDO":
      case "REMOVE_TABLE":
      case "UPDATE_FILTER":
      case "REMOVE_COLUMNS_ROWS":
      case "HIDE_COLUMNS_ROWS":
      case "UNHIDE_COLUMNS_ROWS":
      case "ADD_COLUMNS_ROWS":
      case "EVALUATE_CELLS":
      case "UPDATE_CELL":
      case "ACTIVATE_SHEET":
        this.isSearchDirty = true;
        break;
    }
  }

  finalize() {
    if (this.isSearchDirty) {
      this.refreshSearch(false);
      this.isSearchDirty = false;
    }
  }

  get allSheetMatchesCount(): number {
    return this.allSheetsMatches.length;
  }

  get activeSheetMatchesCount(): number {
    return this.activeSheetMatches.length;
  }

  get specificRangeMatchesCount(): number {
    return this.specificRangeMatches.length;
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  /**
   * Will update the current searchOptions and accordingly update the regex.
   * It will then search for matches using the regex and store them.
   */
  private _updateSearch(toSearch: string, searchOptions: SearchOptions) {
    this.searchOptions = searchOptions;
    if (toSearch !== this.toSearch) {
      this.selectedMatchIndex = null;
    }
    this.toSearch = toSearch;
    this.currentSearchRegex = getSearchRegex(this.toSearch, this.searchOptions);
    this.refreshSearch();
  }

  /**
   * refresh the matches according to the current search options
   */
  private refreshSearch(jumpToMatchSheet = true) {
    this.selectedMatchIndex = null;
    this.findMatches();
    this.selectNextCell(Direction.current, jumpToMatchSheet);
  }

  private getSheetsInSearchOrder() {
    switch (this.searchOptions.searchScope) {
      case "allSheets":
        const sheetIds = this.getters.getSheetIds();
        const activeSheetIndex = sheetIds.findIndex((id) => id === this.getters.getActiveSheetId());
        return [
          sheetIds[activeSheetIndex],
          ...sheetIds.slice(activeSheetIndex + 1),
          ...sheetIds.slice(0, activeSheetIndex),
        ];
        break;
      case "activeSheet":
        return [this.getters.getActiveSheetId()];
      case "specificRange":
        const specificRange = this.searchOptions.specificRange;
        if (!specificRange) {
          return [];
        }
        return specificRange ? [specificRange.sheetId] : [];
    }
  }

  /**
   * Find matches using the current regex
   */
  private findMatches() {
    const matches: CellPosition[] = [];
    if (this.toSearch) {
      for (const sheetId of this.getters.getSheetIds()) {
        matches.push(...this.findMatchesInSheet(sheetId));
      }
    }

    // set results
    this.allSheetsMatches = matches;
    this.activeSheetMatches = matches.filter(
      (match) => match.sheetId === this.getters.getActiveSheetId()
    );
    if (this.searchOptions.specificRange) {
      const { sheetId, zone } = this.searchOptions.specificRange;
      this.specificRangeMatches = matches.filter(
        (match) => match.sheetId === sheetId && isInside(match.col, match.row, zone)
      );
    } else {
      this.specificRangeMatches = [];
    }
  }

  private findMatchesInSheet(sheetId: string) {
    const matches: CellPosition[] = [];

    const { left, right, top, bottom } = this.getters.getSheetZone(sheetId);

    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        const isColHidden = this.getters.isColHidden(sheetId, col);
        const isRowHidden = this.getters.isRowHidden(sheetId, row);
        if (isColHidden || isRowHidden) {
          continue;
        }
        const cellPosition: CellPosition = { sheetId, col, row };
        if (this.currentSearchRegex?.test(this.getSearchableString(cellPosition))) {
          const match: CellPosition = { sheetId, col, row };
          matches.push(match);
        }
      }
    }
    return matches;
  }

  /**
   * Changes the selected search cell. Given a direction it will
   * Change the selection to the previous, current or nextCell,
   * if it exists otherwise it will set the selectedMatchIndex to null.
   * It will also reset the index to 0 if the search has changed.
   * It is also used to keep coherence between the selected searchMatch
   * and selectedMatchIndex.
   */
  private selectNextCell(indexChange: Direction, jumpToMatchSheet = true) {
    const matches = this.searchMatches;
    if (!matches.length) {
      this.selectedMatchIndex = null;
      return;
    }
    let nextIndex: number;
    if (this.selectedMatchIndex === null) {
      let nextMatchIndex = -1;
      // if search is not available in current sheet will select in next sheet
      for (const sheetId of this.getSheetsInSearchOrder()) {
        nextMatchIndex = matches.findIndex((match) => match.sheetId === sheetId);
        if (nextMatchIndex !== -1) {
          break;
        }
      }
      nextIndex = nextMatchIndex;
    } else {
      nextIndex = this.selectedMatchIndex + indexChange;
    }
    // loop index value inside the array (index -1 => last index)
    nextIndex = (nextIndex + matches.length) % matches.length;
    this.selectedMatchIndex = nextIndex;
    const selectedMatch = matches[nextIndex];

    // Switch to the sheet where the match is located
    if (jumpToMatchSheet && this.getters.getActiveSheetId() !== selectedMatch.sheetId) {
      this.model.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: this.getters.getActiveSheetId(),
        sheetIdTo: selectedMatch.sheetId,
      });
      // We do not want to reset the selection at finalize in this case
      this.isSearchDirty = false;
    }
    // we want grid selection to capture the selection stream
    this.model.selection.getBackToDefault();
    this.model.selection.selectCell(selectedMatch.col, selectedMatch.row);
  }

  /**
   * Replace the value of the currently selected match
   */
  replace() {
    if (this.selectedMatchIndex === null) {
      return;
    }

    this.model.dispatch("REPLACE_SEARCH", {
      searchString: this.toSearch,
      replaceWith: this.toReplace,
      matches: [this.searchMatches[this.selectedMatchIndex]],
      searchOptions: this.searchOptions,
    });
    this.selectNextCell(Direction.next);
  }
  /**
   * Apply the replace function to all the matches one time.
   */
  replaceAll() {
    this.model.dispatch("REPLACE_SEARCH", {
      searchString: this.toSearch,
      replaceWith: this.toReplace,
      matches: this.searchMatches,
      searchOptions: this.searchOptions,
    });
  }

  private getSearchableString(position: CellPosition): string {
    return this.getters.getCellText(position, this.searchOptions.searchFormulas);
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  get highlights(): Highlight[] {
    const highlights: Highlight[] = [];
    const sheetId = this.getters.getActiveSheetId();

    for (const [index, match] of this.searchMatches.entries()) {
      if (match.sheetId !== sheetId) {
        continue; // Skip drawing matches from other sheets
      }

      const zone = positionToZone(match);
      const zoneWithMerge = this.getters.expandZone(sheetId, zone);

      const { width, height } = this.getters.getVisibleRect(zoneWithMerge);
      if (width > 0 && height > 0) {
        highlights.push({
          sheetId,
          zone: zoneWithMerge,
          color: FIND_AND_REPLACE_HIGHLIGHT_COLOR,
          noBorder: index !== this.selectedMatchIndex,
          thinLine: true,
          fillAlpha: 0.2,
        });
      }
    }

    if (this.searchOptions.searchScope === "specificRange") {
      const range = this.searchOptions.specificRange;
      if (range && range.sheetId === sheetId) {
        highlights.push({
          sheetId,
          zone: range.zone,
          color: FIND_AND_REPLACE_HIGHLIGHT_COLOR,
          noFill: true,
          thinLine: true,
        });
      }
    }

    return highlights;
  }
}
