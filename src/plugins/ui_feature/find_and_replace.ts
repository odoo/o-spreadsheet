import { escapeRegExp } from "../../helpers";
import { canonicalizeNumberContent } from "../../helpers/locale";
import { isInside } from "../../helpers/zones";
import { SearchOptions, SearchOptionsInternal } from "../../types/find_and_replace";
import { CellPosition, Color, Command, GridRenderingContext, LAYERS } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

const BORDER_COLOR: Color = "#8B008B";
const BACKGROUND_COLOR: Color = "#8B008B33";

enum Direction {
  previous = -1,
  current = 0,
  next = 1,
}

/**
 * Find and Replace Plugin
 *
 * This plugin is used in combination with the find_and_replace sidePanel
 * It is used to 'highlight' cells that match an input string according to
 * the given searchOptions. The second part of this plugin makes it possible
 * (again with the find_and_replace sidePanel), to replace the values that match
 * the search with a new value.
 */

export class FindAndReplacePlugin extends UIPlugin {
  static layers = [LAYERS.Search];
  static getters = [
    "getSearchMatches",
    "getCurrentSelectedMatchIndex",
    "getSearchOptions",
    "getAllSheetMatchesCount",
    "getActiveSheetMatchesCount",
    "getSpecificRangeMatchesCount",
  ] as const;

  private allSheetsMatches: CellPosition[] = [];
  private activeSheetMatches: CellPosition[] = [];
  private specificRangeMatches: CellPosition[] = [];

  // fixme: why do we make selectedMatchIndex on top of a selected
  // property in the matches?
  private selectedMatchIndex: number | null = null;
  private currentSearchRegex: RegExp | null = null;
  private searchOptions: SearchOptionsInternal = {
    matchCase: false,
    exactMatch: false,
    searchFormulas: false,
    searchScope: "allSheets",
    specificRange: undefined,
  };
  private toSearch: string = "";
  private isSearchDirty = false;

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

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UPDATE_SEARCH":
        const rangeData = cmd.searchOptions.specificRange;
        const specificRange = rangeData && this.getters.getRangeFromRangeData(rangeData);
        this.updateSearch(cmd.toSearch, { ...cmd.searchOptions, specificRange });
        break;
      case "CLEAR_SEARCH":
        this.clearSearch();
        break;
      case "SELECT_SEARCH_PREVIOUS_MATCH":
        this.selectNextCell(Direction.previous);
        break;
      case "SELECT_SEARCH_NEXT_MATCH":
        this.selectNextCell(Direction.next);
        break;
      case "REPLACE_SEARCH":
        this.replace(cmd.replaceWith);
        break;
      case "REPLACE_ALL_SEARCH":
        this.replaceAll(cmd.replaceWith);
        break;
      case "UNDO":
      case "REDO":
      case "REMOVE_FILTER_TABLE":
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
      this.refreshSearch();
      this.isSearchDirty = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getSearchMatches(): CellPosition[] {
    return this.searchMatches;
  }

  getCurrentSelectedMatchIndex(): number | null {
    return this.selectedMatchIndex;
  }
  getSearchOptions(): SearchOptions {
    return { ...this.searchOptions, specificRange: this.searchOptions.specificRange?.rangeData };
  }

  getAllSheetMatchesCount(): number {
    return this.allSheetsMatches.length;
  }

  getActiveSheetMatchesCount(): number {
    return this.activeSheetMatches.length;
  }

  getSpecificRangeMatchesCount(): number {
    return this.specificRangeMatches.length;
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  /**
   * Will update the current searchOptions and accordingly update the regex.
   * It will then search for matches using the regex and store them.
   */
  private updateSearch(toSearch: string, searchOptions: SearchOptionsInternal) {
    this.searchOptions = searchOptions;
    if (toSearch !== this.toSearch) {
      this.selectedMatchIndex = null;
    }
    this.toSearch = toSearch;
    this.updateRegex();
    this.refreshSearch();
  }

  /**
   * refresh the matches according to the current search options
   */
  private refreshSearch() {
    this.selectedMatchIndex = null;
    this.findMatches();
    this.selectNextCell(Direction.current);
  }

  /**
   * Updates the regex based on the current searchOptions and
   * the value toSearch
   */
  private updateRegex() {
    let searchValue = escapeRegExp(this.toSearch);
    const flags = !this.searchOptions.matchCase ? "i" : "";
    if (this.searchOptions.exactMatch) {
      searchValue = `^${searchValue}$`;
    }
    this.currentSearchRegex = RegExp(searchValue, flags);
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
  private selectNextCell(indexChange: Direction) {
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
    if (this.getters.getActiveSheetId() !== selectedMatch.sheetId) {
      this.dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: this.getters.getActiveSheetId(),
        sheetIdTo: selectedMatch.sheetId,
      });
    }
    // we want grid selection to capture the selection stream
    this.selection.getBackToDefault();
    this.selection.selectCell(selectedMatch.col, selectedMatch.row);
  }

  private clearSearch() {
    this.toSearch = "";
    this.selectedMatchIndex = null;
    this.currentSearchRegex = null;
    this.allSheetsMatches = [];
    this.activeSheetMatches = [];
    this.specificRangeMatches = [];
    this.searchOptions = {
      matchCase: false,
      exactMatch: false,
      searchFormulas: false,
      searchScope: "allSheets",
      specificRange: undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Replace
  // ---------------------------------------------------------------------------
  private replaceMatch(selectedMatch: CellPosition, replaceWith: string) {
    if (!this.currentSearchRegex) {
      return;
    }

    const cell = this.getters.getCell(selectedMatch);
    if (!cell?.content) {
      return;
    }

    if (cell?.isFormula && !this.searchOptions.searchFormulas) {
      return;
    }
    const replaceRegex = new RegExp(
      this.currentSearchRegex.source,
      this.currentSearchRegex.flags + "g"
    );
    const toReplace: string | null = this.getSearchableString(selectedMatch);
    const content = toReplace.replace(replaceRegex, replaceWith);
    const canonicalContent = canonicalizeNumberContent(content, this.getters.getLocale());
    this.dispatch("UPDATE_CELL", { ...selectedMatch, content: canonicalContent });
  }

  /**
   * Replace the value of the currently selected match
   */
  private replace(replaceWith: string) {
    if (this.selectedMatchIndex === null) {
      return;
    }

    const selectedMatch = this.searchMatches[this.selectedMatchIndex];

    this.replaceMatch(selectedMatch, replaceWith);
    this.selectNextCell(Direction.next);
  }
  /**
   * Apply the replace function to all the matches one time.
   */
  private replaceAll(replaceWith: string) {
    const matchCount = this.searchMatches.length;
    for (let i = 0; i < matchCount; i++) {
      this.replaceMatch(this.searchMatches[i], replaceWith);
    }
  }

  private getSearchableString(position: CellPosition): string {
    return this.getters.getCellText(position, this.searchOptions.searchFormulas);
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    const { ctx } = renderingContext;
    const sheetId = this.getters.getActiveSheetId();

    for (const [index, match] of this.searchMatches.entries()) {
      if (match.sheetId !== sheetId) {
        continue; // Skip drawing matches from other sheets
      }

      const merge = this.getters.getMerge({ sheetId, col: match.col, row: match.row });
      const left = merge ? merge.left : match.col;
      const right = merge ? merge.right : match.col;
      const top = merge ? merge.top : match.row;
      const bottom = merge ? merge.bottom : match.row;
      const { x, y, width, height } = this.getters.getVisibleRect({ top, left, right, bottom });
      if (width > 0 && height > 0) {
        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(x, y, width, height);
        if (index === this.selectedMatchIndex) {
          ctx.strokeStyle = BORDER_COLOR;
          ctx.strokeRect(x, y, width, height);
        }
      }
    }

    if (this.searchOptions.searchScope === "specificRange") {
      const range = this.searchOptions.specificRange;
      if (!range || range.sheetId !== sheetId) {
        return;
      }
      const { x, y, width, height } = this.getters.getVisibleRect(range.zone);
      ctx.strokeStyle = BORDER_COLOR;
      ctx.strokeRect(x, y, width, height);
    }
  }
}
