import { escapeRegExp } from "../../helpers";
import { Cell, Command, GridRenderingContext, LAYERS, UID } from "../../types/index";
import { UIPlugin } from "../ui_plugin";

const BORDER_COLOR: string = "#8B008B";
const BACKGROUND_COLOR: string = "#8B008B33";

export interface SearchOptions {
  matchCase: boolean;
  exactMatch: boolean;
  searchFormulas: boolean;
}

export interface ReplaceOptions {
  modifyFormulas: boolean;
}

export enum Direction {
  previous = -1,
  current = 0,
  next = 1,
}

interface SearchMatch {
  selected: boolean;
  col: number;
  row: number;
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
  static getters = ["getSearchMatches", "getCurrentSelectedMatchIndex"];
  private searchMatches: SearchMatch[] = [];
  private selectedMatchIndex: number | null = null;
  private currentSearchRegex: RegExp | null = null;
  private searchOptions: SearchOptions = {
    matchCase: false,
    exactMatch: false,
    searchFormulas: false,
  };
  private replaceOptions: ReplaceOptions = {
    modifyFormulas: false,
  };
  private toSearch: string = "";

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
        this.replace(cmd.replaceWith, cmd.replaceOptions);
        break;
      case "REPLACE_ALL_SEARCH":
        this.replaceAll(cmd.replaceWith, cmd.replaceOptions);
        break;
      case "UNDO":
      case "REDO":
      case "REMOVE_COLUMNS_ROWS":
      case "ADD_COLUMNS_ROWS":
        this.clearSearch();
        break;
      case "ACTIVATE_SHEET":
      case "REFRESH_SEARCH":
        this.refreshSearch();
        break;
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
    const activeSheetId = this.getters.getActiveSheetId();
    const cells = this.getters.getCells(activeSheetId);
    const matches: SearchMatch[] = [];

    if (this.toSearch) {
      for (const cell of Object.values(cells)) {
        if (
          cell &&
          this.currentSearchRegex &&
          this.currentSearchRegex.test(
            this.searchOptions.searchFormulas ? cell.content : String(cell.evaluated.value)
          )
        ) {
          const position = this.getters.getCellPosition(cell.id);
          const match: SearchMatch = { col: position.col, row: position.row, selected: false };
          matches.push(match);
        }
      }
    }
    return matches.sort(this.sortByRowThenColumn);
  }

  private sortByRowThenColumn(a, b) {
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
    if (this.selectedMatchIndex === null || this.selectedMatchIndex !== nextIndex) {
      this.selectedMatchIndex = nextIndex;
      this.dispatch("SELECT_CELL", { col: matches[nextIndex].col, row: matches[nextIndex].row });
    }
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
    this.replaceOptions = {
      modifyFormulas: false,
    };
  }

  // ---------------------------------------------------------------------------
  // Replace
  // ---------------------------------------------------------------------------
  /**
   * Replace the value of the currently selected match if the replaceOptions
   * allow it
   */
  private replace(replaceWith: string, replaceOptions: ReplaceOptions) {
    this.replaceOptions = replaceOptions;
    if (this.selectedMatchIndex === null || !this.currentSearchRegex) {
      return;
    }
    const matches = this.searchMatches;
    const selectedMatch = matches[this.selectedMatchIndex];
    const sheetId = this.getters.getActiveSheetId();
    const cellToReplace = this.getters.getCell(sheetId, selectedMatch.col, selectedMatch.row);
    const toReplace: string | null = this.toReplace(cellToReplace, sheetId);
    if (!cellToReplace || !toReplace) {
      this.selectNextCell(Direction.next);
    } else {
      const replaceRegex = new RegExp(
        this.currentSearchRegex.source,
        this.currentSearchRegex.flags + "g"
      );
      const newContent = toReplace.toString().replace(replaceRegex, replaceWith);
      this.dispatch("UPDATE_CELL", {
        sheetId: this.getters.getActiveSheetId(),
        col: selectedMatch.col,
        row: selectedMatch.row,
        content: newContent,
      });
      this.searchMatches.splice(this.selectedMatchIndex, 1);
      this.selectNextCell(Direction.current);
    }
  }
  /**
   * Apply the replace function to all the matches one time.
   */
  private replaceAll(replaceWith: string, replaceOptions: ReplaceOptions) {
    const matchCount = this.searchMatches.length;
    for (let i = 0; i < matchCount; i++) {
      this.replace(replaceWith, replaceOptions);
    }
  }

  /**
   * Determines if the content, the value or nothing should be replaced,
   * based on the search and replace options
   */
  private toReplace(cell: Cell | undefined, sheetId: UID): string | null {
    if (cell) {
      if (this.searchOptions.searchFormulas && cell.isFormula()) {
        return cell.content;
      } else if (this.replaceOptions.modifyFormulas || !cell.isFormula()) {
        return (cell.evaluated.value as any).toString();
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    const { ctx, viewport } = renderingContext;
    const sheetId = this.getters.getActiveSheetId();
    for (const match of this.searchMatches) {
      const merge = this.getters.getMerge(sheetId, match.col, match.row);
      const left = merge ? merge.left : match.col;
      const right = merge ? merge.right : match.col;
      const top = merge ? merge.top : match.row;
      const bottom = merge ? merge.bottom : match.row;
      const [x, y, width, height] = this.getters.getRect({ top, left, right, bottom }, viewport);
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
