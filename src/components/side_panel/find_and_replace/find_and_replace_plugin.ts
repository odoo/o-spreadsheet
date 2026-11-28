import { getSearchRegex } from "../../../helpers/misc";
import { isInside, positionToZone } from "../../../helpers/zones";
import { HighlightPlugin, HighlightProvider } from "../../../owl_plugins/highlight_plugin";
import { Command } from "../../../types/commands";
import { CellPosition, Color, Highlight, UID } from "../../../types/misc";

import { computed, onWillDestroy, signal, usePlugin } from "@odoo/owl";
import { canonicalizeNumberContent } from "../../../helpers/locale";
import { NotificationPlugin } from "../../../owl_plugins/notification_owl_plugin";
import { OwlPluginWithModel } from "../../../owl_plugins/owl_plugin_with_model";
import { ViewportsPlugin } from "../../../owl_plugins/viewports_owl_plugin";
import { _t } from "../../../translation";
import { SearchOptions } from "../../../types/find_and_replace";

const FIND_AND_REPLACE_HIGHLIGHT_COLOR: Color = "#8B008B";

enum Direction {
  previous = -1,
  current = 0,
  next = 1,
}

interface RefreshSearchOptions {
  jumpToMatchSheet?: boolean;
  updateSelection?: boolean;
}

export class FindAndReplacePlugin extends OwlPluginWithModel implements HighlightProvider {
  private allSheetsMatches = signal<CellPosition[]>([]);
  private selectedMatchPosition = signal<CellPosition | null>(null);
  hiddenSheetsWithMatches = signal<UID[]>([]);
  private currentSearchRegex: RegExp | null = null;
  private irreplaceableMatchCount: number = 0;

  private isSearchDirty = false;
  private shouldFinalizeUpdateSelection = false;

  private notificationPlugin = usePlugin(NotificationPlugin);
  private highlightPlugin = usePlugin(HighlightPlugin);
  private viewPlugin = usePlugin(ViewportsPlugin);

  // fixme: why do we make selectedMatchIndex on top of a selected
  // property in the matches?
  selectedMatchIndex = signal<number | null>(null);
  toSearch = signal<string>("");
  toReplace = signal<string>("");
  searchOptions = signal.Object<SearchOptions>({
    matchCase: false,
    exactMatch: false,
    searchFormulas: false,
    includeHidden: false,
    searchScope: "activeSheet",
    specificRange: undefined,
  });

  setup() {
    super.setup();
    const initialShowFormulaState = this.model().getters.shouldShowFormulas();
    this.searchOptions().searchFormulas = initialShowFormulaState;

    this.highlightPlugin.register(this);
    onWillDestroy(() => {
      this.model().dispatch("SET_FORMULA_VISIBILITY", { show: initialShowFormulaState });
      this.highlightPlugin.unRegister(this);
    });
  }

  searchMatches = computed(() => {
    switch (this.searchOptions().searchScope) {
      case "allSheets":
        return this.allSheetsMatches();
      case "activeSheet":
        return this.activeSheetMatches();
      case "specificRange":
        return this.specificRangeMatches();
    }
  });

  allSheetsHiddenMatches = computed(() =>
    this.allSheetsMatches().filter((match) => {
      return this.isMatchHidden(match);
    })
  );

  activeSheetMatches = computed(() => {
    return this.allSheetsMatches().filter(
      (match) => match.sheetId === this.model().getters.getActiveSheetId()
    );
  });

  activeSheetHiddenMatches = computed(() => {
    return this.allSheetsHiddenMatches().filter(
      (match) => match.sheetId === this.model().getters.getActiveSheetId()
    );
  });

  specificRangeMatches = computed(() => {
    const specificRange = this.searchOptions().specificRange;
    if (specificRange) {
      const { sheetId, zone } = specificRange;
      return this.allSheetsMatches().filter(
        (match) => match.sheetId === sheetId && isInside(match.col, match.row, zone)
      );
    } else {
      return [];
    }
  });

  specificRangeHiddenMatches = computed(() =>
    this.specificRangeMatches().filter((match) => {
      return this.isMatchHidden(match);
    })
  );

  updateSearchContent(toSearch: string) {
    this._updateSearch(toSearch, this.searchOptions());
  }

  updateReplaceContent(toReplace: string) {
    this.toReplace.set(toReplace);
  }

  updateSearchOptions(searchOptions: Partial<SearchOptions>) {
    this._updateSearch(this.toSearch(), { ...this.searchOptions(), ...searchOptions });
  }

  searchFormulas(showFormula: boolean) {
    this.model().dispatch("SET_FORMULA_VISIBILITY", { show: showFormula });
    this.updateSearchOptions({ searchFormulas: showFormula });
  }

  selectPreviousMatch() {
    this.selectNextCell(Direction.previous, {
      jumpToMatchSheet: true,
      updateSelection: true,
    });
  }

  selectNextMatch() {
    this.selectNextCell(Direction.next, { jumpToMatchSheet: true, updateSelection: true });
  }

  handle(cmd: Command) {
    const searchOptions = this.searchOptions();
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
        this.isSearchDirty = true;
        break;
      case "ACTIVATE_SHEET":
        this.isSearchDirty = true;
        this.shouldFinalizeUpdateSelection = true;
        if (searchOptions.specificRange) {
          searchOptions.specificRange = {
            ...searchOptions.specificRange,
            sheetId: this.model().getters.getActiveSheetId(),
          };
        }
        break;
      case "DELETE_SHEET":
        if (
          searchOptions.searchScope === "specificRange" &&
          searchOptions.specificRange?.sheetId === cmd.sheetId
        ) {
          this.searchOptions.set({ ...searchOptions, specificRange: undefined });
        }
        this.isSearchDirty = true;
        break;
      case "REPLACE_SEARCH":
        for (const match of cmd.matches) {
          this.replaceMatch(match, cmd.searchString, cmd.replaceWith, cmd.searchOptions);
        }

        if (this.irreplaceableMatchCount > 0) {
          this.showReplaceWarningMessage(cmd.matches.length, this.irreplaceableMatchCount);
        }

        this.irreplaceableMatchCount = 0;
        break;
    }
  }

  finalize() {
    if (this.isSearchDirty) {
      this.refreshSearch({
        jumpToMatchSheet: false,
        updateSelection: this.shouldFinalizeUpdateSelection,
      });
      this.shouldFinalizeUpdateSelection = false;
      this.isSearchDirty = false;
    }
  }

  get matchesCount() {
    return {
      allSheets: {
        total: this.allSheetsMatches().length,
        hidden: this.allSheetsHiddenMatches().length,
      },
      activeSheet: {
        total: this.activeSheetMatches().length,
        hidden: this.activeSheetHiddenMatches().length,
      },
      specificRange: {
        total: this.specificRangeMatches().length,
        hidden: this.specificRangeHiddenMatches().length,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  /**
   * Will update the current searchOptions and accordingly update the regex.
   * It will then search for matches using the regex and store them.
   */
  private _updateSearch(toSearch: string, searchOptions: SearchOptions) {
    this.searchOptions.set(searchOptions);
    if (toSearch !== this.toSearch()) {
      this.selectedMatchIndex.set(null);
      this.selectedMatchPosition.set(null);
    }
    this.toSearch.set(toSearch);
    this.currentSearchRegex = getSearchRegex(this.toSearch(), this.searchOptions());
    this.refreshSearch({ jumpToMatchSheet: true, updateSelection: true });
  }

  /**
   * refresh the matches according to the current search options
   */
  private refreshSearch(options: RefreshSearchOptions) {
    this.findMatches();
    const selectedMatchPosition = this.selectedMatchPosition();
    if (selectedMatchPosition) {
      if (selectedMatchPosition.sheetId !== this.model().getters.getActiveSheetId()) {
        this.selectedMatchIndex.set(null);
        this.selectedMatchPosition.set(null);
      } else {
        const index = this.searchMatches().findIndex(
          (match) =>
            match.sheetId === selectedMatchPosition?.sheetId &&
            match.col === selectedMatchPosition?.col &&
            match.row === selectedMatchPosition?.row
        );
        if (index !== -1) {
          this.selectedMatchIndex.set(index);
        }
      }
    }
    this.selectNextCell(Direction.current, options);
  }

  private getSheetsInSearchOrder() {
    switch (this.searchOptions().searchScope) {
      case "allSheets":
        const sheetIds = this.model().getters.getSheetIds();
        const activeSheetIndex = sheetIds.findIndex(
          (id) => id === this.model().getters.getActiveSheetId()
        );
        return [
          sheetIds[activeSheetIndex],
          ...sheetIds.slice(activeSheetIndex + 1),
          ...sheetIds.slice(0, activeSheetIndex),
        ];
      case "activeSheet":
        return [this.model().getters.getActiveSheetId()];
      case "specificRange":
        const specificRange = this.searchOptions().specificRange;
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
    const sheetIdsWithHiddenMatches: UID[] = [];
    if (this.toSearch()) {
      for (const sheetId of this.model().getters.getVisibleSheetIds()) {
        matches.push(...this.findMatchesInSheet(sheetId));
      }
      if (this.searchOptions().includeHidden) {
        for (const sheetId of this.model().getters.getInvisibleSheetIds()) {
          const hiddenMatches = this.findMatchesInSheet(sheetId);
          matches.push(...hiddenMatches);
          if (hiddenMatches.length) {
            sheetIdsWithHiddenMatches.push(sheetId);
          }
        }
      }
    }
    this.allSheetsMatches.set(matches);
    this.hiddenSheetsWithMatches.set(sheetIdsWithHiddenMatches);
  }

  private isMatchHidden(position: CellPosition): boolean {
    const { sheetId, col, row } = position;
    const isSheetHidden = !this.model().getters.isSheetVisible(sheetId);
    const isColHidden = this.model().getters.isColHidden(sheetId, col);
    const isRowHidden = this.model().getters.isRowHidden(sheetId, row);
    return isSheetHidden || isColHidden || isRowHidden;
  }

  private findMatchesInSheet(sheetId: string) {
    const matches: CellPosition[] = [];
    const { left, right, top, bottom } = this.model().getters.getSheetZone(sheetId);
    const isSheetVisible = this.model().getters.isSheetVisible(sheetId);
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        const isColHidden = this.model().getters.isColHidden(sheetId, col);
        const isRowHidden = this.model().getters.isRowHidden(sheetId, row);
        if (
          !this.searchOptions().includeHidden &&
          (!isSheetVisible || isColHidden || isRowHidden)
        ) {
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
  private selectNextCell(indexChange: Direction, options: RefreshSearchOptions) {
    const matches = this.searchMatches();
    if (!matches.length) {
      this.selectedMatchIndex.set(null);
      this.selectedMatchPosition.set(null);
      return;
    }
    let nextIndex: number;
    const selectedMatchIndex = this.selectedMatchIndex();
    if (selectedMatchIndex === null) {
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
      nextIndex = selectedMatchIndex + indexChange;
    }
    // loop index value inside the array (index -1 => last index)
    nextIndex = (nextIndex + matches.length) % matches.length;
    this.selectedMatchIndex.set(nextIndex);
    this.selectedMatchPosition.set(matches[nextIndex]);
    const selectedMatch = matches[nextIndex];

    // Switch to the sheet where the match is located
    if (
      options.jumpToMatchSheet &&
      this.model().getters.getActiveSheetId() !== selectedMatch.sheetId
    ) {
      this.model().dispatch("ACTIVATE_SHEET", {
        sheetIdFrom: this.model().getters.getActiveSheetId(),
        sheetIdTo: selectedMatch.sheetId,
      });
      // We do not want to reset the selection at finalize in this case
      this.isSearchDirty = false;
    }
    // we want grid selection to capture the selection stream
    this.model().selection.getBackToDefault();
    if (options.updateSelection) {
      this.model().selection.selectCell(selectedMatch.col, selectedMatch.row, {
        allowsHiddenSelection: true,
      });
    }
  }

  /**
   * Replace the value of the currently selected match
   */
  replace() {
    const selectedMatchIndex = this.selectedMatchIndex();
    if (selectedMatchIndex === null) {
      return;
    }
    this.shouldFinalizeUpdateSelection = true;
    this.model().dispatch("REPLACE_SEARCH", {
      searchString: this.toSearch(),
      replaceWith: this.toReplace(),
      matches: [this.searchMatches()[selectedMatchIndex]],
      searchOptions: this.searchOptions(),
    });
  }
  /**
   * Apply the replace function to all the matches one time.
   */
  replaceAll() {
    this.model().dispatch("REPLACE_SEARCH", {
      searchString: this.toSearch(),
      replaceWith: this.toReplace(),
      matches: this.searchMatches(),
      searchOptions: this.searchOptions(),
    });
  }

  /**
   * Show a warning message based on the number of matches replaced and irreplaceable.
   */
  private showReplaceWarningMessage(totalMatches: number, irreplaceableMatches: number): void {
    const replaceableMatches = totalMatches - irreplaceableMatches;

    if (replaceableMatches === 0) {
      this.notificationPlugin.notifyUser({
        type: "warning",
        sticky: false,
        text: _t(
          "Match(es) cannot be replaced as they are part of a formula or inside a locked sheet"
        ),
      });
    } else {
      this.notificationPlugin.notifyUser({
        type: "warning",
        sticky: false,
        text: _t(
          "%(replaceable_count)s match(es) replaced. %(irreplaceable_count)s match(es) cannot be replaced as they are part of a formula or inside a locked sheet",
          {
            replaceable_count: replaceableMatches,
            irreplaceable_count: irreplaceableMatches,
          }
        ),
      });
    }
  }

  private replaceMatch(
    selectedMatch: CellPosition,
    searchString: string,
    replaceWith: string,
    searchOptions: SearchOptions
  ) {
    if (this.model().getters.isSheetLocked(selectedMatch.sheetId)) {
      this.irreplaceableMatchCount++;
      return;
    }
    const cell = this.model().getters.getCell(selectedMatch);
    if (!cell?.isFormula && !cell?.content) {
      return;
    }

    if (cell?.isFormula && !searchOptions.searchFormulas) {
      this.irreplaceableMatchCount++;
      return;
    }

    const searchRegex = getSearchRegex(searchString, searchOptions);
    const replaceRegex = new RegExp(searchRegex.source, searchRegex.flags + "g");
    const toReplace: string | null = this.model().getters.getCellText(selectedMatch, {
      showFormula: searchOptions.searchFormulas,
    });
    const content = toReplace.replace(replaceRegex, replaceWith);
    const canonicalContent = canonicalizeNumberContent(content, this.model().getters.getLocale());
    this.model().dispatch("UPDATE_CELL", { ...selectedMatch, content: canonicalContent });
  }

  private getSearchableString(position: CellPosition): string {
    return this.model().getters.getCellText(position, {
      showFormula: this.searchOptions().searchFormulas,
    });
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  get highlights(): Highlight[] {
    const highlights: Highlight[] = [];
    const sheetId = this.model().getters.getActiveSheetId();

    for (const [index, match] of this.searchMatches().entries()) {
      if (match.sheetId !== sheetId) {
        continue; // Skip drawing matches from other sheets
      }

      const zone = positionToZone(match);
      const zoneWithMerge = this.model().getters.expandZone(sheetId, zone);

      const { width, height } = this.viewPlugin.viewports().getVisibleRect(sheetId, zoneWithMerge);
      if (width > 0 && height > 0) {
        highlights.push({
          range: this.model().getters.getRangeFromZone(sheetId, zoneWithMerge),
          color: FIND_AND_REPLACE_HIGHLIGHT_COLOR,
          noBorder: index !== this.selectedMatchIndex(),
          thinLine: true,
          fillAlpha: 0.2,
        });
      }
    }

    if (this.searchOptions().searchScope === "specificRange") {
      const range = this.searchOptions().specificRange;
      if (range && range.sheetId === sheetId) {
        highlights.push({
          range,
          color: FIND_AND_REPLACE_HIGHLIGHT_COLOR,
          noFill: true,
          thinLine: true,
        });
      }
    }

    return highlights;
  }
}
