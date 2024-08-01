import { escapeRegExp } from "../../helpers";
import { canonicalizeNumberContent } from "../../helpers/locale";
import type {
  CellPosition,
  Color,
  Command,
  GridRenderingContext,
  HeaderIndex,
  Position,
} from "../../types/index";
import { LAYERS } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

const BORDER_COLOR: Color = "#8B008B";
const BACKGROUND_COLOR: Color = "#8B008B33";

export interface SearchOptions {
  matchCase: boolean;
  exactMatch: boolean;
  searchFormulas: boolean;
}

enum Direction {
  previous = -1,
  current = 0,
  next = 1,
}

interface SearchMatch {
  selected: boolean;
  col: HeaderIndex;
  row: HeaderIndex;
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
  static getters = ["getSearchMatches", "getCurrentSelectedMatchIndex"] as const;
  private searchMatches: SearchMatch[] = [];
  private selectedMatchIndex: number | null = null;
  private currentSearchRegex: RegExp | null = null;
  private searchOptions: SearchOptions = {
    matchCase: false,
    exactMatch: false,
    searchFormulas: false,
  };
  private toSearch: string = "";
  private isSearchDirty = false;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  handle(cmd: Command) {
    switch (cmd.type) {
      case "UPDATE_SEARCH":
        this.updateSearch(cmd.toSearch, cmd.searchOptions);
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
        this.isSearchDirty = true;
        break;
      case "ACTIVATE_SHEET":
        this.refreshSearch();
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

  getSearchMatches(): SearchMatch[] {
    return this.searchMatches;
  }
  getCurrentSelectedMatchIndex(): number | null {
    return this.selectedMatchIndex;
  }
  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  /**
   * Will update the current searchOptions and accordingly update the regex.
   * It will then search for matches using the regex and store them.
   */
  private updateSearch(toSearch: string, searchOptions: SearchOptions) {
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
    const matches: SearchMatch[] = this.findMatches();
    this.searchMatches = matches;
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
  /**
   * Find matches using the current regex
   */
  private findMatches() {
    const sheetId = this.getters.getActiveSheetId();
    const cells = this.getters.getCells(sheetId);
    const matches: SearchMatch[] = [];
    if (this.toSearch && this.currentSearchRegex) {
      for (const cell of Object.values(cells)) {
        const { col, row } = this.getters.getCellPosition(cell.id);
        const cellPosition = { sheetId, col, row };
        const isColHidden = this.getters.isColHidden(sheetId, col);
        const isRowHidden = this.getters.isRowHidden(sheetId, row);
        if (isColHidden || isRowHidden) {
          continue;
        }
        if (this.currentSearchRegex.test(this.getSearchableString(cellPosition))) {
          const match: SearchMatch = { col, row, selected: false };
          matches.push(match);
        }
        for (const spreadPosition of this.getters.getSpreadPositionsOf(cellPosition)) {
          if (this.currentSearchRegex.test(this.getSearchableString(spreadPosition))) {
            const match: SearchMatch = {
              col: spreadPosition.col,
              row: spreadPosition.row,
              selected: false,
            };
            matches.push(match);
          }
        }
      }
    }
    return matches.sort(this.sortByRowThenColumn);
  }

  private sortByRowThenColumn(a: Position, b: Position) {
    if (a.row === b.row) {
      return a.col - b.col;
    }
    return a.row > b.row ? 1 : -1;
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
      nextIndex = 0;
    } else {
      nextIndex = this.selectedMatchIndex + indexChange;
    }
    //modulo of negative value to be able to cycle in both directions with previous and next
    nextIndex = ((nextIndex % matches.length) + matches.length) % matches.length;
    this.selectedMatchIndex = nextIndex;
    this.selection.selectCell(matches[nextIndex].col, matches[nextIndex].row);
    for (let index = 0; index < this.searchMatches.length; index++) {
      this.searchMatches[index].selected = index === this.selectedMatchIndex;
    }
  }

  private clearSearch() {
    this.toSearch = "";
    this.searchMatches = [];
    this.selectedMatchIndex = null;
    this.currentSearchRegex = null;
    this.searchOptions = {
      matchCase: false,
      exactMatch: false,
      searchFormulas: false,
    };
  }

  // ---------------------------------------------------------------------------
  // Replace
  // ---------------------------------------------------------------------------
  private replaceMatch(selectedMatch: SearchMatch, replaceWith: string) {
    if (!this.currentSearchRegex) {
      return;
    }

    const sheetId = this.getters.getActiveSheetId();
    const position = { sheetId, ...selectedMatch };

    const cell = this.getters.getCell(position);
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
    const toReplace: string | null = this.getSearchableString(position);
    const content = toReplace.replace(replaceRegex, replaceWith);
    const canonicalContent = canonicalizeNumberContent(content, this.getters.getLocale());
    this.dispatch("UPDATE_CELL", { ...position, content: canonicalContent });
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

    for (const match of this.searchMatches) {
      const merge = this.getters.getMerge({ sheetId, col: match.col, row: match.row });
      const left = merge ? merge.left : match.col;
      const right = merge ? merge.right : match.col;
      const top = merge ? merge.top : match.row;
      const bottom = merge ? merge.bottom : match.row;
      const { x, y, width, height } = this.getters.getVisibleRect({ top, left, right, bottom });
      if (width > 0 && height > 0) {
        ctx.fillStyle = BACKGROUND_COLOR;
        ctx.fillRect(x, y, width, height);
        if (match.selected) {
          ctx.strokeStyle = BORDER_COLOR;
          ctx.strokeRect(x, y, width, height);
        }
      }
    }
  }
}
